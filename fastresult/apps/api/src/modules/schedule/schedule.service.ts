import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

export class UpsertShiftDto {
  @IsString() trainerId!: string;
  @IsInt() @Min(1) @Max(7) dayOfWeek!: number;
  @IsString() startTime!: string;
  @IsString() endTime!: string;
  @IsOptional() @IsString() note?: string;
}

export class DeleteShiftDto {
  @IsString() trainerId!: string;
  @IsInt() @Min(1) @Max(7) dayOfWeek!: number;
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async listForTrainer(trainerId: string, actor: AuthenticatedUser) {
    const tp = await this.prisma.trainerProfile.findFirst({
      where: { OR: [{ id: trainerId }, { userId: trainerId }] },
      include: { user: { select: { clubId: true } } },
    });
    if (!tp) throw new NotFoundException("Trainer not found");

    if (actor.role === "GYM_OWNER" && tp.user.clubId !== actor.clubId) {
      throw new ForbiddenException();
    }
    if (actor.role === "TRAINER" && tp.userId !== actor.userId) {
      throw new ForbiddenException();
    }

    return this.prisma.trainerShift.findMany({
      where: { trainerId: tp.id },
      orderBy: { dayOfWeek: "asc" },
    });
  }

  async listAll(actor: AuthenticatedUser) {
    const where =
      actor.role === "GYM_OWNER"
        ? { trainer: { user: { clubId: actor.clubId ?? undefined } } }
        : {};

    return this.prisma.trainerShift.findMany({
      where,
      include: {
        trainer: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  async upsert(dto: UpsertShiftDto, actor: AuthenticatedUser) {
    const tp = await this.prisma.trainerProfile.findFirst({
      where: { OR: [{ id: dto.trainerId }, { userId: dto.trainerId }] },
      include: { user: { select: { clubId: true } } },
    });
    if (!tp) throw new NotFoundException("Trainer not found");

    if (actor.role === "GYM_OWNER" && tp.user.clubId !== actor.clubId) {
      throw new ForbiddenException();
    }
    if (actor.role === "TRAINER" && tp.userId !== actor.userId) {
      throw new ForbiddenException();
    }

    return this.prisma.trainerShift.upsert({
      where: { trainerId_dayOfWeek: { trainerId: tp.id, dayOfWeek: dto.dayOfWeek } },
      update: { startTime: dto.startTime, endTime: dto.endTime, note: dto.note },
      create: {
        trainerId: tp.id,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        note: dto.note,
        clubId: tp.user.clubId,
      },
    });
  }

  async remove(dto: DeleteShiftDto, actor: AuthenticatedUser) {
    const tp = await this.prisma.trainerProfile.findFirst({
      where: { OR: [{ id: dto.trainerId }, { userId: dto.trainerId }] },
      include: { user: { select: { clubId: true } } },
    });
    if (!tp) throw new NotFoundException("Trainer not found");

    if (actor.role === "GYM_OWNER" && tp.user.clubId !== actor.clubId) {
      throw new ForbiddenException();
    }
    if (actor.role === "TRAINER" && tp.userId !== actor.userId) {
      throw new ForbiddenException();
    }

    await this.prisma.trainerShift.deleteMany({
      where: { trainerId: tp.id, dayOfWeek: dto.dayOfWeek },
    });
    return { deleted: true };
  }
}
