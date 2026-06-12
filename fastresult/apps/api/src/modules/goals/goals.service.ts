import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IsIn, IsNumber, IsString } from "class-validator";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

const goalTypes = [
  "WEIGHT_LOSS", "WEIGHT_GAIN", "MUSCLE_BUILDING", "HEIGHT_GROWTH",
  "FAT_REDUCTION", "FITNESS_IMPROVEMENT", "ENDURANCE_INCREASE", "STRENGTH_DEVELOPMENT"
] as const;

export class CreateGoalDto {
  @IsString()
  memberId!: string;

  @IsIn(goalTypes)
  type!: string;

  @IsNumber()
  targetValue!: number;
}

export class UpdateGoalDto {
  @IsNumber()
  currentValue?: number;

  @IsString()
  status?: string;
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(memberId: string, actor: AuthenticatedUser) {
    // Accept either MemberProfile.id or User.id
    const member = await this.prisma.memberProfile.findFirst({
      where: { OR: [{ id: memberId }, { userId: memberId }] },
      include: { user: { select: { id: true, clubId: true } }, trainer: { select: { userId: true } } }
    });
    if (!member) throw new NotFoundException("Member not found");

    if (actor.role === "MEMBER" && member.user.id !== actor.userId) throw new ForbiddenException();
    if (actor.role === "TRAINER" && member.trainer?.userId !== actor.userId) throw new ForbiddenException();
    if (actor.role === "GYM_OWNER" && member.user.clubId !== actor.clubId) throw new ForbiddenException();

    return member;
  }

  async list(memberId: string, actor: AuthenticatedUser) {
    const member = await this.assertAccess(memberId, actor);
    return this.prisma.goal.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(dto: CreateGoalDto, actor: AuthenticatedUser) {
    const member = await this.assertAccess(dto.memberId, actor);
    const goal = await this.prisma.goal.create({
      data: { memberId: member.id, type: dto.type as never, targetValue: dto.targetValue }
    });
    await this.prisma.auditLog.create({
      data: { userId: actor.userId, action: "GOAL_CREATED", entity: "Goal", entityId: goal.id }
    });
    return goal;
  }

  async update(id: string, dto: UpdateGoalDto, actor: AuthenticatedUser) {
    const goal = await this.prisma.goal.findUniqueOrThrow({ where: { id } });
    await this.assertAccess(goal.memberId, actor);

    const updated = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.currentValue !== undefined && { currentValue: dto.currentValue }),
        ...(dto.status !== undefined && { status: dto.status }),
        progressPercentage:
          dto.currentValue !== undefined && goal.targetValue
            ? Math.min((dto.currentValue / Number(goal.targetValue)) * 100, 100)
            : undefined
      }
    });
    return updated;
  }
}
