import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IsArray, IsDateString, IsEnum, IsString } from "class-validator";
import type { MembershipPeriod } from "@prisma/client";

export class BulkAssignDto {
  @IsArray()
  memberIds!: string[];

  @IsString()
  planName!: string;

  @IsEnum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"])
  period!: MembershipPeriod;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  expiresAt!: string;
}
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(memberId: string, actor: AuthenticatedUser) {
    const member = await this.prisma.memberProfile.findFirst({
      where: { OR: [{ id: memberId }, { userId: memberId }] },
      include: { user: { select: { id: true, clubId: true } } }
    });
    if (!member) throw new NotFoundException("Member not found");

    if (actor.role === "MEMBER" && member.user.id !== actor.userId) throw new ForbiddenException();
    if (actor.role === "GYM_OWNER" && member.user.clubId !== actor.clubId) throw new ForbiddenException();

    return member;
  }

  async list(memberId: string, actor: AuthenticatedUser) {
    const member = await this.assertAccess(memberId, actor);
    return this.prisma.membership.findMany({
      where: { memberId: member.id },
      orderBy: { expiresAt: "desc" }
    });
  }

  async bulkAssign(dto: BulkAssignDto, actor: AuthenticatedUser) {
    if (!["SUPER_ADMIN", "GYM_OWNER"].includes(actor.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const startsAt = new Date(dto.startsAt);
    const expiresAt = new Date(dto.expiresAt);
    const remainingDays = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000));
    let created = 0;

    for (const memberId of dto.memberIds) {
      const member = await this.prisma.memberProfile.findFirst({
        where: { OR: [{ id: memberId }, { userId: memberId }] },
        include: { user: { select: { clubId: true } } },
      });
      if (!member) continue;
      if (actor.role === "GYM_OWNER" && member.user.clubId !== actor.clubId) continue;

      await this.prisma.membership.create({
        data: { memberId: member.id, planName: dto.planName, period: dto.period, startsAt, expiresAt, remainingDays },
      });
      created++;
    }

    return { created, total: dto.memberIds.length };
  }
}
