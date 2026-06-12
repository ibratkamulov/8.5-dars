import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, actor: AuthenticatedUser) {
    const query = (q ?? "").trim();
    if (query.length < 2) return { members: [], trainers: [], payments: [], memberships: [] };

    const clubFilter =
      actor.role === "GYM_OWNER" ? { clubId: actor.clubId ?? undefined } : {};

    const memberWhere =
      actor.role === "TRAINER"
        ? {
            trainer: { userId: actor.userId },
            user: { fullName: { contains: query, mode: "insensitive" as const } },
          }
        : actor.role === "MEMBER"
        ? { userId: actor.userId }
        : {
            user: {
              fullName: { contains: query, mode: "insensitive" as const },
              ...clubFilter,
            },
          };

    const canSearchPayments = ["SUPER_ADMIN", "GYM_OWNER"].includes(actor.role);

    const [members, trainers, payments, memberships] = await Promise.all([
      actor.role === "MEMBER"
        ? Promise.resolve([])
        : this.prisma.memberProfile.findMany({
            where: memberWhere,
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
            take: 6,
          }),
      canSearchPayments
        ? this.prisma.trainerProfile.findMany({
            where: {
              user: {
                fullName: { contains: query, mode: "insensitive" },
                ...clubFilter,
              },
            },
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
            take: 4,
          })
        : Promise.resolve([]),
      canSearchPayments
        ? this.prisma.payment.findMany({
            where: {
              ...clubFilter,
              membership: {
                member: {
                  user: { fullName: { contains: query, mode: "insensitive" } },
                },
              },
            },
            include: {
              membership: {
                include: {
                  member: {
                    include: { user: { select: { fullName: true, email: true } } },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      canSearchPayments
        ? this.prisma.membership.findMany({
            where: {
              OR: [
                { member: { user: { fullName: { contains: query, mode: "insensitive" } } } },
                { planName: { contains: query, mode: "insensitive" } },
              ],
              ...(actor.role === "GYM_OWNER" && actor.clubId
                ? { member: { user: { clubId: actor.clubId } } }
                : {}),
            },
            include: {
              member: {
                include: { user: { select: { id: true, fullName: true, email: true } } },
              },
            },
            orderBy: { expiresAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    return {
      members,
      trainers,
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt,
        memberName: p.membership?.member.user.fullName ?? "—",
        memberEmail: p.membership?.member.user.email ?? "—",
        planName: p.membership?.planName ?? "—",
      })),
      memberships: memberships.map((m) => ({
        id: m.id,
        planName: m.planName,
        period: m.period,
        expiresAt: m.expiresAt,
        memberName: m.member.user.fullName,
        memberEmail: m.member.user.email,
      })),
    };
  }
}
