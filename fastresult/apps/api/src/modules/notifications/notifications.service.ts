import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

const EXPIRY_THRESHOLDS = [1, 3, 7];

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    // Run immediately on startup, then every 6 hours
    this.runExpiryCheck();
    this.schedulerTimer = setInterval(() => this.runExpiryCheck(), 6 * 60 * 60 * 1000);
  }

  private async runExpiryCheck() {
    try {
      await this.sendExpiryReminders();
    } catch {
      // silent fail — don't crash the app on scheduler errors
    }
  }

  async list(actor: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async unreadCount(actor: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: { userId: actor.userId, readAt: null },
    });
    return { count };
  }

  async markAllRead(actor: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { userId: actor.userId, readAt: null },
      data: { readAt: new Date(), status: "READ" },
    });
    return { ok: true };
  }

  async markRead(id: string, actor: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { id, userId: actor.userId },
      data: { readAt: new Date(), status: "READ" },
    });
    return { ok: true };
  }

  async create(userId: string, title: string, body: string) {
    return this.prisma.notification.create({
      data: { userId, title, body, channel: "EMAIL", status: "PENDING" },
    });
  }

  async sendExpiryReminders() {
    const maxDays = Math.max(...EXPIRY_THRESHOLDS);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + maxDays);

    const expiring = await this.prisma.membership.findMany({
      where: { expiresAt: { lte: cutoff, gte: new Date() } },
      include: {
        member: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    let sent = 0;
    for (const m of expiring) {
      const daysLeft = Math.ceil((new Date(m.expiresAt).getTime() - Date.now()) / 86_400_000);
      if (!EXPIRY_THRESHOLDS.includes(daysLeft)) continue;

      // De-dup: one notification per membership per threshold per day
      const dedupeKey = `${m.id}-${daysLeft}`;
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: m.member.user.id,
          body: { contains: dedupeKey },
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
      });
      if (existing) continue;

      const urgency = daysLeft === 1 ? "⚠️ URGENT" : daysLeft <= 3 ? "⚠️" : "ℹ️";
      await this.create(
        m.member.user.id,
        `${urgency} Membership Expiring in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}`,
        `Your membership "${m.planName}" expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Please renew to continue access. [ref:${dedupeKey}]`,
      );
      sent++;
    }

    // Also notify for memberships expiring today (daysLeft === 0)
    const expired = await this.prisma.membership.findMany({
      where: {
        expiresAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) },
      },
      include: {
        member: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    for (const m of expired) {
      const dedupeKey = `${m.id}-expired`;
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: m.member.user.id,
          body: { contains: dedupeKey },
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
      });
      if (existing) continue;

      await this.create(
        m.member.user.id,
        "🚫 Membership Expired",
        `Your membership "${m.planName}" has expired today. Contact the gym to renew. [ref:${dedupeKey}]`,
      );
      sent++;
    }

    return { sent };
  }
}
