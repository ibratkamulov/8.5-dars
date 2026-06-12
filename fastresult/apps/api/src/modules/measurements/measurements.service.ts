import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

export class CreateMeasurementDto {
  @IsString()
  memberId!: string;

  @IsOptional() @IsNumber()
  heightCm?: number;

  @IsOptional() @IsNumber()
  weightKg?: number;

  @IsOptional() @IsNumber()
  bodyFatPct?: number;

  @IsOptional() @IsNumber()
  muscleMass?: number;

  @IsOptional() @IsNumber()
  chestCm?: number;

  @IsOptional() @IsNumber()
  waistCm?: number;
}

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(memberId: string, actor: AuthenticatedUser) {
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
    return this.prisma.bodyMeasurement.findMany({
      where: { memberId: member.id },
      orderBy: { measuredAt: "desc" },
      take: 30
    });
  }

  async create(dto: CreateMeasurementDto, actor: AuthenticatedUser) {
    const member = await this.assertAccess(dto.memberId, actor);

    const bmi =
      dto.heightCm && dto.weightKg
        ? dto.weightKg / Math.pow(dto.heightCm / 100, 2)
        : undefined;

    return this.prisma.bodyMeasurement.create({
      data: {
        memberId: member.id,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        bodyFatPct: dto.bodyFatPct,
        muscleMass: dto.muscleMass,
        chestCm: dto.chestCm,
        waistCm: dto.waistCm,
        bmi
      }
    });
  }
}
