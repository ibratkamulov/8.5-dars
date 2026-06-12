import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

export class CreateWorkoutDto {
  @IsString() memberId!: string;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsIn(["BEGINNER", "INTERMEDIATE", "ADVANCED"]) difficulty!: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  days?: unknown;
}

@Injectable()
export class WorkoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveMember(memberId: string) {
    const member = await this.prisma.memberProfile.findFirst({
      where: { OR: [{ id: memberId }, { userId: memberId }] },
      include: { user: { select: { id: true, clubId: true } } },
    });
    if (!member) throw new NotFoundException("Member not found");
    return member;
  }

  private async assertWriteAccess(member: Awaited<ReturnType<WorkoutService["resolveMember"]>>, actor: AuthenticatedUser) {
    if (actor.role === "TRAINER") {
      const tp = await this.prisma.trainerProfile.findUnique({ where: { userId: actor.userId } });
      if (!tp || member.trainerId !== tp.id) throw new ForbiddenException("Not your member");
    } else if (actor.role === "GYM_OWNER") {
      if (member.user.clubId !== actor.clubId) throw new ForbiddenException();
    } else if (actor.role !== "SUPER_ADMIN") {
      throw new ForbiddenException();
    }
  }

  async list(memberId: string, actor: AuthenticatedUser) {
    const member = await this.resolveMember(memberId);

    if (actor.role === "MEMBER" && member.userId !== actor.userId) throw new ForbiddenException();
    if (actor.role === "GYM_OWNER" && member.user.clubId !== actor.clubId) throw new ForbiddenException();
    if (actor.role === "TRAINER") {
      const tp = await this.prisma.trainerProfile.findUnique({ where: { userId: actor.userId } });
      if (!tp || member.trainerId !== tp.id) throw new ForbiddenException();
    }

    return this.prisma.workoutProgram.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateWorkoutDto, actor: AuthenticatedUser) {
    const member = await this.resolveMember(dto.memberId);
    await this.assertWriteAccess(member, actor);

    return this.prisma.workoutProgram.create({
      data: {
        memberId: member.id,
        title: dto.title,
        description: dto.description,
        difficulty: dto.difficulty,
        days: (dto.days ?? []) as object,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const prog = await this.prisma.workoutProgram.findUnique({
      where: { id },
      include: { member: { include: { user: { select: { id: true, clubId: true } } } } },
    });
    if (!prog) throw new NotFoundException();

    await this.assertWriteAccess(prog.member, actor);
    await this.prisma.workoutProgram.delete({ where: { id } });
    return { deleted: true };
  }
}
