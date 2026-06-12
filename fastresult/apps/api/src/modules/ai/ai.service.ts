import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendations(memberId: string, actor: AuthenticatedUser) {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, clubId: true } },
        trainer: { select: { userId: true } }
      }
    });

    if (!member) throw new NotFoundException("Member not found");

    if (actor.role === "MEMBER" && member.user.id !== actor.userId) {
      throw new ForbiddenException("You can only view your own recommendations");
    }

    if (actor.role === "TRAINER" && member.trainer?.userId !== actor.userId) {
      throw new ForbiddenException("You can only view recommendations for your assigned members");
    }

    if (actor.role === "GYM_OWNER" && member.user.clubId !== actor.clubId) {
      throw new ForbiddenException("You can only view recommendations for your club's members");
    }

    const [latestMeasurement, nutrition, goals] = await Promise.all([
      this.prisma.bodyMeasurement.findFirst({ where: { memberId }, orderBy: { measuredAt: "desc" } }),
      this.prisma.nutritionLog.findFirst({ where: { memberId }, orderBy: { loggedAt: "desc" } }),
      this.prisma.goal.findMany({ where: { memberId, status: "ACTIVE" } })
    ]);

    return {
      workout: "4-day strength and conditioning split with progressive overload.",
      nutrition: nutrition
        ? `Maintain ${nutrition.calories} kcal and increase water intake if below target.`
        : "Start a 7-day nutrition log to unlock precise meal planning.",
      progress: latestMeasurement
        ? "Progress is trending positively. Recheck body measurements in 14 days."
        : "Add baseline measurements to enable prediction models.",
      prediction: goals.length
        ? "At the current pace, primary goals are projected within 8-12 weeks."
        : "Create a goal to activate achievement predictions.",
      suggestions: [
        "Schedule two recovery-focused sessions per week.",
        "Track sleep with attendance and performance for stronger predictions.",
        "Send trainer notes after every completed workout."
      ]
    };
  }
}
