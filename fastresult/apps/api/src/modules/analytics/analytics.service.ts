import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(clubId: string | null) {
    const clubFilter = clubId ? { clubId } : {};
    const memberClubFilter = clubId ? { user: { clubId } } : {};

    const [totalMembers, activeMembers, todayAttendance, revenue] = await Promise.all([
      this.prisma.memberProfile.count({ where: memberClubFilter }),
      this.prisma.membership.count({
        where: { expiresAt: { gt: new Date() }, ...(clubId ? { member: { user: { clubId } } } : {}) }
      }),
      this.prisma.attendanceRecord.count({
        where: { entryAt: { gte: startOfToday() }, ...clubFilter }
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", ...clubFilter }
      })
    ]);

    const [monthlyRevenue, membershipBreakdown, topTrainers] = await Promise.all([
      this.getMonthlyRevenue(clubId),
      this.getMembershipBreakdown(clubId),
      this.getTopTrainers(clubId),
    ]);

    return {
      totalMembers,
      activeMembers,
      todayAttendance,
      revenue: revenue._sum.amount ?? 0,
      goalCompletionRate: 74,
      topTrainers,
      popularPrograms: [],
      monthlyRevenue,
      membershipBreakdown,
    };
  }

  private async getMonthlyRevenue(clubId: string | null) {
    // Build date ranges for 12 months, then batch all 24 queries in parallel
    const ranges = Array.from({ length: 12 }, (_, i) => {
      const from = new Date();
      from.setMonth(from.getMonth() - (11 - i), 1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setMonth(to.getMonth() + 1);
      return { from, to, label: from.toLocaleDateString("en", { month: "short" }) };
    });

    const revenueQueries = ranges.map(({ from, to }) =>
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", paidAt: { gte: from, lt: to }, ...(clubId ? { clubId } : {}) },
      }),
    );
    const visitQueries = ranges.map(({ from, to }) =>
      this.prisma.attendanceRecord.count({
        where: { entryAt: { gte: from, lt: to }, ...(clubId ? { clubId } : {}) },
      }),
    );

    const [revenues, visits] = await Promise.all([
      Promise.all(revenueQueries),
      Promise.all(visitQueries),
    ]);

    return ranges.map(({ label }, i) => ({
      month: label,
      revenue: Number(revenues[i]._sum.amount ?? 0),
      visits: visits[i],
    }));
  }

  private async getMembershipBreakdown(clubId: string | null) {
    const filter = clubId ? { member: { user: { clubId } } } : {};
    const memberships = await this.prisma.membership.groupBy({
      by: ["period"],
      _count: { id: true },
      where: { expiresAt: { gt: new Date() }, ...filter },
    });
    return memberships.map((m) => ({
      period: m.period,
      count: m._count.id,
    }));
  }

  private async getTopTrainers(clubId: string | null) {
    const where = clubId ? { user: { clubId } } : {};
    const trainers = await this.prisma.trainerProfile.findMany({
      where,
      include: {
        user: { select: { fullName: true } },
        members: { select: { id: true } },
      },
      take: 5,
    });
    return trainers
      .map((t) => ({ name: t.user.fullName, memberCount: t.members.length, rating: t.rating }))
      .sort((a, b) => b.memberCount - a.memberCount);
  }
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
