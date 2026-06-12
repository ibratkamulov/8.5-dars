import { ForbiddenException, Injectable } from "@nestjs/common";
import { IsDecimal, IsIn, IsOptional, IsString } from "class-validator";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

export class CreatePaymentDto {
  @IsString() membershipId!: string;
  @IsDecimal() amount!: string;
  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() provider?: string;
  @IsIn(["PAID", "PENDING", "FAILED"]) status!: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthenticatedUser) {
    const clubFilter =
      actor.role === "GYM_OWNER" && actor.clubId ? { clubId: actor.clubId } : {};

    const payments = await this.prisma.payment.findMany({
      where: clubFilter,
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
      take: 200,
    });

    return payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      provider: p.provider,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      membership: p.membership
        ? {
            id: p.membership.id,
            planName: p.membership.planName,
            period: p.membership.period,
            memberName: p.membership.member.user.fullName,
            memberEmail: p.membership.member.user.email,
          }
        : null,
    }));
  }

  async summary(actor: AuthenticatedUser) {
    if (actor.role === "GYM_OWNER" && !actor.clubId) throw new ForbiddenException();

    const clubFilter =
      actor.role === "GYM_OWNER" ? { clubId: actor.clubId! } : {};

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalPaid, totalPending, todayRev, monthRev, yearRev, monthly] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...clubFilter, status: "PAID" },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...clubFilter, status: "PENDING" },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...clubFilter, status: "PAID", paidAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...clubFilter, status: "PAID", paidAt: { gte: monthStart } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...clubFilter, status: "PAID", paidAt: { gte: yearStart } },
      }),
      this.getMonthlyRevenue(actor.role === "GYM_OWNER" ? actor.clubId : null),
    ]);

    return {
      totalPaid: Number(totalPaid._sum.amount ?? 0),
      totalPending: Number(totalPending._sum.amount ?? 0),
      revenueToday: Number(todayRev._sum.amount ?? 0),
      revenueMonth: Number(monthRev._sum.amount ?? 0),
      revenueYear: Number(yearRev._sum.amount ?? 0),
      monthly,
    };
  }

  private async getMonthlyRevenue(clubId: string | null | undefined) {
    const months: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const from = new Date();
      from.setMonth(from.getMonth() - i, 1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setMonth(to.getMonth() + 1);

      const agg = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "PAID",
          paidAt: { gte: from, lt: to },
          ...(clubId ? { clubId } : {}),
        },
      });

      months.push({
        month: from.toLocaleDateString("en", { month: "short", year: "2-digit" }),
        revenue: Number(agg._sum.amount ?? 0),
      });
    }
    return months;
  }

  async create(dto: CreatePaymentDto, actor: AuthenticatedUser) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: dto.membershipId },
      include: { member: { include: { user: { select: { clubId: true } } } } },
    });
    if (!membership) throw new Error("Membership not found");
    if (actor.role === "GYM_OWNER" && membership.member.user.clubId !== actor.clubId) {
      throw new ForbiddenException();
    }

    return this.prisma.payment.create({
      data: {
        clubId: membership.member.user.clubId ?? actor.clubId ?? "",
        membershipId: dto.membershipId,
        amount: dto.amount,
        currency: dto.currency ?? "USD",
        provider: dto.provider ?? "CASH",
        status: dto.status,
        paidAt: dto.status === "PAID" ? new Date() : null,
      },
    });
  }
}
