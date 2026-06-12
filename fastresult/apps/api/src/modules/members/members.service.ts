import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthenticatedUser) {
    const where =
      actor.role === "SUPER_ADMIN"
        ? {}
        : actor.role === "GYM_OWNER"
        ? { user: { clubId: actor.clubId ?? undefined } }
        : actor.role === "TRAINER"
        ? { trainer: { userId: actor.userId } }
        : { userId: actor.userId };

    return this.prisma.memberProfile.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, clubId: true } }
      },
      orderBy: { user: { fullName: "asc" } }
    });
  }

  async get(id: string, actor: AuthenticatedUser) {
    const member = await this.prisma.memberProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, clubId: true } },
        trainer: { select: { userId: true } }
      }
    });

    if (!member) throw new NotFoundException("Member not found");

    if (actor.role === "MEMBER" && member.userId !== actor.userId) {
      throw new ForbiddenException("Access denied");
    }
    if (actor.role === "TRAINER" && member.trainer?.userId !== actor.userId) {
      throw new ForbiddenException("Access denied");
    }
    if (actor.role === "GYM_OWNER" && member.user.clubId !== actor.clubId) {
      throw new ForbiddenException("Access denied");
    }

    return member;
  }
}
