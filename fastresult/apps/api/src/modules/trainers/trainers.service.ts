import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: AuthenticatedUser) {
    const where =
      actor.role === "SUPER_ADMIN"
        ? {}
        : actor.role === "GYM_OWNER"
        ? { user: { clubId: actor.clubId ?? undefined } }
        : {};

    return this.prisma.trainerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        _count: { select: { members: true } }
      },
      orderBy: { rating: "desc" }
    });
  }

  get(id: string) {
    return this.prisma.trainerProfile.findUniqueOrThrow({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        members: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
          take: 20
        }
      }
    });
  }
}
