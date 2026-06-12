import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthenticatedUser, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where =
      actor.role === "SUPER_ADMIN"
        ? {}
        : actor.role === "GYM_OWNER"
        ? { user: { clubId: actor.clubId ?? undefined } }
        : { userId: actor.userId };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
}
