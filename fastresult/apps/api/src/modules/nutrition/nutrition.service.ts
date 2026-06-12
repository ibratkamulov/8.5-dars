import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IsNumber, IsString } from "class-validator";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

export class CreateNutritionDto {
  @IsString()
  memberId!: string;

  @IsNumber()
  calories!: number;

  @IsNumber()
  proteinG!: number;

  @IsNumber()
  carbsG!: number;

  @IsNumber()
  fatsG!: number;

  @IsNumber()
  waterMl!: number;
}

@Injectable()
export class NutritionService {
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
    return this.prisma.nutritionLog.findMany({
      where: { memberId: member.id },
      orderBy: { loggedAt: "desc" },
      take: 50
    });
  }

  async create(dto: CreateNutritionDto, actor: AuthenticatedUser) {
    const member = await this.assertAccess(dto.memberId, actor);
    return this.prisma.nutritionLog.create({
      data: {
        memberId: member.id,
        calories: dto.calories,
        proteinG: dto.proteinG,
        carbsG: dto.carbsG,
        fatsG: dto.fatsG,
        waterMl: dto.waterMl
      }
    });
  }
}
