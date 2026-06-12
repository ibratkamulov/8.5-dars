import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  findNearby(query?: string) {
    return this.prisma.fitnessClub.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
      include: { packages: true },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      take: 25
    });
  }
}
