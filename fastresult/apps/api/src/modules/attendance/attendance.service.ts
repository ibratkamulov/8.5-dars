import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuthenticatedUser } from "../../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { EventsGateway } from "../events/events.gateway";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly events?: EventsGateway,
  ) {}

  // ─── QR Scan (check-in / check-out) ────────────────────────────────────────

  async scan(token: string, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { qrToken: token },
      include: {
        memberProfile: {
          include: {
            memberships: {
              where: {
                expiresAt: { gte: new Date() },
              },
              take: 1,
            },
          },
        },
        club: { select: { id: true } },
      },
    });

    if (!user) throw new NotFoundException("QR token not found");

    // Duplicate scan protection — 10 second window
    const now = new Date();
    if (user.lastScanAt && now.getTime() - user.lastScanAt.getTime() < 10_000) {
      throw new ConflictException("Duplicate scan — please wait a few seconds");
    }

    if (!user.memberProfile) {
      throw new ForbiddenException("This QR code does not belong to a gym member");
    }

    // Membership check — deny entry if no active membership
    const activeMembership = user.memberProfile.memberships[0];
    if (!activeMembership) {
      throw new ForbiddenException("No active membership found. Access denied.");
    }

    // Enforce club scoping for GYM_OWNER and TRAINER
    if (actor.role === "GYM_OWNER" && actor.clubId && user.clubId !== actor.clubId) {
      throw new ForbiddenException("Member does not belong to your club");
    }
    if (actor.role === "TRAINER") {
      const trainer = await this.prisma.trainerProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!trainer || user.memberProfile.trainerId !== trainer.id) {
        throw new ForbiddenException("Member is not assigned to you");
      }
    }

    // clubId: prefer actor's club, then member's own club
    const clubId = actor.clubId ?? user.clubId ?? user.club?.id;
    if (!clubId) throw new ForbiddenException("Cannot determine club for this scan");

    const result = await this.prisma.$transaction(async (tx) => {
      if (!user.insideGym) {
        // CHECK_IN
        const record = await tx.attendanceRecord.create({
          data: {
            clubId,
            memberId: user.memberProfile!.id,
            entryAt: now,
            source: "QR",
            status: "ACTIVE",
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { insideGym: true, lastScanAt: now },
        });

        await tx.auditLog.create({
          data: {
            userId: actor.userId,
            action: "ATTENDANCE_CHECK_IN",
            entity: "AttendanceRecord",
            entityId: record.id,
            metadata: { clubId, memberId: user.memberProfile!.id, memberName: user.fullName },
          },
        });

        return {
          event: "CHECK_IN" as const,
          member: { name: user.fullName, email: user.email },
          time: now.toISOString(),
          durationSeconds: null,
          recordId: record.id,
        };
      } else {
        // CHECK_OUT — find the active (open) record
        const activeRecord = await tx.attendanceRecord.findFirst({
          where: {
            memberId: user.memberProfile!.id,
            exitAt: null,
            status: "ACTIVE",
          },
          orderBy: { entryAt: "desc" },
        });

        const durationSeconds = activeRecord
          ? Math.floor((now.getTime() - activeRecord.entryAt.getTime()) / 1000)
          : null;

        if (activeRecord) {
          await tx.attendanceRecord.update({
            where: { id: activeRecord.id },
            data: {
              exitAt: now,
              durationSeconds,
              status: "COMPLETED",
            },
          });
        }

        await tx.user.update({
          where: { id: user.id },
          data: { insideGym: false, lastScanAt: now },
        });

        await tx.auditLog.create({
          data: {
            userId: actor.userId,
            action: "ATTENDANCE_CHECK_OUT",
            entity: "AttendanceRecord",
            entityId: activeRecord?.id,
            metadata: { clubId, memberId: user.memberProfile!.id, durationSeconds },
          },
        });

        return {
          event: "CHECK_OUT" as const,
          member: { name: user.fullName, email: user.email },
          time: now.toISOString(),
          durationSeconds,
          recordId: activeRecord?.id ?? null,
        };
      }
    });

    // Broadcast live count update via WebSocket
    if (this.events) {
      const insideCount = await this.prisma.user.count({
        where: { insideGym: true, ...(clubId ? { clubId } : {}) },
      });
      this.events.emitAttendanceUpdate(clubId ?? null, {
        event: result.event,
        insideCount,
        member: result.member,
        time: result.time,
      });
    }

    return result;
  }

  // ─── Live presence ──────────────────────────────────────────────────────────

  async live(actor: AuthenticatedUser) {
    const clubWhere = actor.role === "SUPER_ADMIN" ? {} : { clubId: actor.clubId ?? undefined };

    const insideUsers = await this.prisma.user.findMany({
      where: { insideGym: true, ...clubWhere },
      select: {
        id: true,
        fullName: true,
        email: true,
        lastScanAt: true,
        memberProfile: {
          select: {
            id: true,
            memberships: {
              where: {
                expiresAt: { gte: new Date() },
              },
              select: { planName: true, expiresAt: true },
              take: 1,
            },
          },
        },
      },
    });

    // For each inside user find their latest active attendance record to get entryAt
    const memberProfileIds = insideUsers
      .map((u) => u.memberProfile?.id)
      .filter((id): id is string => Boolean(id));

    const activeRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        memberId: { in: memberProfileIds },
        exitAt: null,
        status: "ACTIVE",
      },
      select: { memberId: true, entryAt: true, id: true },
      orderBy: { entryAt: "desc" },
    });

    const recordMap = new Map<string, { entryAt: Date; id: string }>();
    for (const r of activeRecords) {
      if (!recordMap.has(r.memberId)) {
        recordMap.set(r.memberId, { entryAt: r.entryAt, id: r.id });
      }
    }

    const insideNow = insideUsers.map((u) => {
      const profileId = u.memberProfile?.id ?? "";
      const record = recordMap.get(profileId);
      return {
        userId: u.id,
        name: u.fullName,
        email: u.email,
        checkInAt: record?.entryAt?.toISOString() ?? u.lastScanAt?.toISOString() ?? null,
        plan: u.memberProfile?.memberships[0]?.planName ?? null,
      };
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const recordWhere = actor.role === "SUPER_ADMIN" ? {} : { clubId: actor.clubId ?? undefined };

    const [todayCount, weekCount, monthCount, avgResult] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: { ...recordWhere, entryAt: { gte: todayStart } },
      }),
      this.prisma.attendanceRecord.count({
        where: { ...recordWhere, entryAt: { gte: weekStart } },
      }),
      this.prisma.attendanceRecord.count({
        where: { ...recordWhere, entryAt: { gte: monthStart } },
      }),
      this.prisma.attendanceRecord.aggregate({
        where: { ...recordWhere, durationSeconds: { not: null }, entryAt: { gte: monthStart } },
        _avg: { durationSeconds: true },
      }),
    ]);

    return {
      insideNow,
      todayCount,
      weekCount,
      monthCount,
      avgDurationSeconds: Math.round(avgResult._avg.durationSeconds ?? 0),
    };
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async stats(actor: AuthenticatedUser) {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "GYM_OWNER") {
      throw new ForbiddenException("Insufficient permissions");
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const where = actor.role === "SUPER_ADMIN" ? {} : { clubId: actor.clubId ?? undefined };

    const [todayCount, weekCount, monthCount, prevMonthCount, totalCount, completedCount, avgDur] =
      await Promise.all([
        this.prisma.attendanceRecord.count({ where: { ...where, entryAt: { gte: todayStart } } }),
        this.prisma.attendanceRecord.count({ where: { ...where, entryAt: { gte: weekStart } } }),
        this.prisma.attendanceRecord.count({ where: { ...where, entryAt: { gte: monthStart } } }),
        this.prisma.attendanceRecord.count({
          where: { ...where, entryAt: { gte: prevMonthStart, lt: monthStart } },
        }),
        this.prisma.attendanceRecord.count({ where }),
        this.prisma.attendanceRecord.count({ where: { ...where, status: "COMPLETED" } }),
        this.prisma.attendanceRecord.aggregate({
          where: { ...where, durationSeconds: { not: null } },
          _avg: { durationSeconds: true },
        }),
      ]);

    const currentlyInside = await this.prisma.user.count({
      where: { insideGym: true, ...(actor.role === "GYM_OWNER" ? { clubId: actor.clubId ?? undefined } : {}) },
    });

    const monthGrowth =
      prevMonthCount > 0
        ? Math.round(((monthCount - prevMonthCount) / prevMonthCount) * 100)
        : monthCount > 0
        ? 100
        : 0;

    return {
      todayCount,
      weekCount,
      monthCount,
      prevMonthCount,
      monthGrowth,
      totalCount,
      completedCount,
      currentlyInside,
      avgDurationSeconds: Math.round(avgDur._avg.durationSeconds ?? 0),
    };
  }

  // ─── History for a user ─────────────────────────────────────────────────────

  async history(userId: string, actor: AuthenticatedUser) {
    // Find the member profile for this user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: { select: { id: true, trainerId: true } },
        club: { select: { id: true } },
      },
    });

    if (!targetUser || !targetUser.memberProfile) {
      throw new NotFoundException("Member not found");
    }

    // Access control
    if (actor.role === "MEMBER" && actor.userId !== userId) {
      throw new ForbiddenException("You can only view your own history");
    }
    if (actor.role === "TRAINER") {
      const trainer = await this.prisma.trainerProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!trainer || targetUser.memberProfile.trainerId !== trainer.id) {
        throw new ForbiddenException("Member is not assigned to you");
      }
    }
    if (
      actor.role === "GYM_OWNER" &&
      actor.clubId &&
      targetUser.club?.id !== actor.clubId
    ) {
      throw new ForbiddenException("Member does not belong to your club");
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { memberId: targetUser.memberProfile.id },
      orderBy: { entryAt: "desc" },
      take: 100,
    });

    return records.map((r) => ({
      id: r.id,
      entryAt: r.entryAt.toISOString(),
      exitAt: r.exitAt?.toISOString() ?? null,
      durationSeconds: r.durationSeconds,
      status: r.status,
      source: r.source,
    }));
  }

  // ─── Today summary ──────────────────────────────────────────────────────────

  async today(actor: AuthenticatedUser) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const where = actor.role === "SUPER_ADMIN" ? {} : { clubId: actor.clubId ?? undefined };

    const records = await this.prisma.attendanceRecord.findMany({
      where: { ...where, entryAt: { gte: todayStart } },
      include: {
        member: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { entryAt: "desc" },
      take: 100,
    });

    return records.map((r) => ({
      id: r.id,
      memberName: r.member.user.fullName,
      memberEmail: r.member.user.email,
      userId: r.member.user.id,
      entryAt: r.entryAt.toISOString(),
      exitAt: r.exitAt?.toISOString() ?? null,
      durationSeconds: r.durationSeconds,
      status: r.status,
    }));
  }

  // ─── Member attendance detail ───────────────────────────────────────────────

  async memberDetail(userId: string, actor: AuthenticatedUser) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: {
          include: {
            memberships: {
              where: {
                expiresAt: { gte: new Date() },
              },
              take: 1,
            },
          },
        },
        club: { select: { id: true } },
      },
    });

    if (!targetUser || !targetUser.memberProfile) {
      throw new NotFoundException("Member not found");
    }

    if (actor.role === "MEMBER" && actor.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }
    if (
      actor.role === "GYM_OWNER" &&
      actor.clubId &&
      targetUser.club?.id !== actor.clubId
    ) {
      throw new ForbiddenException("Member does not belong to your club");
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const memberId = targetUser.memberProfile.id;

    const [totalVisits, weeklyVisits, monthlyVisits, avgDur] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { memberId } }),
      this.prisma.attendanceRecord.count({ where: { memberId, entryAt: { gte: weekStart } } }),
      this.prisma.attendanceRecord.count({ where: { memberId, entryAt: { gte: monthStart } } }),
      this.prisma.attendanceRecord.aggregate({
        where: { memberId, durationSeconds: { not: null } },
        _avg: { durationSeconds: true },
      }),
    ]);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    return {
      userId: targetUser.id,
      memberName: targetUser.fullName,
      email: targetUser.email,
      insideGym: targetUser.insideGym,
      totalVisits,
      weeklyVisits,
      monthlyVisits,
      attendancePercentage: Math.round((monthlyVisits / daysInMonth) * 100),
      streak: Math.min(weeklyVisits, 7),
      missedDays: Math.max(now.getDate() - monthlyVisits, 0),
      avgDurationSeconds: Math.round(avgDur._avg.durationSeconds ?? 0),
      activeMembership: targetUser.memberProfile.memberships[0] ?? null,
    };
  }

  // ─── My QR ──────────────────────────────────────────────────────────────────

  async myQr(actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: {
        memberProfile: {
          include: {
            memberships: {
              where: {
                expiresAt: { gte: new Date() },
              },
              orderBy: { expiresAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    const activeMembership = user.memberProfile?.memberships[0] ?? null;

    return {
      qrToken: user.qrToken,
      memberName: user.fullName,
      expiresAt: activeMembership?.expiresAt?.toISOString() ?? null,
    };
  }

  // ─── Get QR for a specific user (admin/owner) ───────────────────────────────

  async getQrForUser(userId: string, actor: AuthenticatedUser) {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "GYM_OWNER" && actor.role !== "TRAINER") {
      throw new ForbiddenException("Insufficient permissions");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: {
          include: {
            memberships: {
              where: {
                expiresAt: { gte: new Date() },
              },
              orderBy: { expiresAt: "desc" },
              take: 1,
            },
          },
        },
        club: { select: { id: true } },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    if (
      actor.role === "GYM_OWNER" &&
      actor.clubId &&
      user.club?.id !== actor.clubId
    ) {
      throw new ForbiddenException("Member does not belong to your club");
    }

    const activeMembership = user.memberProfile?.memberships[0] ?? null;

    return {
      qrToken: user.qrToken,
      memberName: user.fullName,
      expiresAt: activeMembership?.expiresAt?.toISOString() ?? null,
    };
  }

  // ─── Manual check-in / check-out (admin / owner) ───────────────────────────

  async manualToggle(userId: string, direction: "IN" | "OUT", actor: AuthenticatedUser) {
    if (!["SUPER_ADMIN", "GYM_OWNER", "TRAINER"].includes(actor.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: {
          include: {
            memberships: { where: { expiresAt: { gte: new Date() } }, take: 1 },
          },
        },
        club: { select: { id: true } },
      },
    });

    if (!user || !user.memberProfile) throw new NotFoundException("Member not found");
    if (!user.memberProfile.memberships[0]) throw new BadRequestException("No active membership");

    const clubId = actor.clubId ?? user.clubId ?? user.club?.id;
    if (!clubId) throw new BadRequestException("Cannot determine club");

    const now = new Date();
    const memberId = user.memberProfile.id;

    if (direction === "IN") {
      if (user.insideGym) throw new ConflictException("Member is already inside");

      const record = await this.prisma.$transaction(async (tx) => {
        const r = await tx.attendanceRecord.create({
          data: { clubId, memberId, entryAt: now, source: "MANUAL", status: "ACTIVE" },
        });
        await tx.user.update({ where: { id: userId }, data: { insideGym: true, lastScanAt: now } });
        await tx.auditLog.create({
          data: {
            userId: actor.userId,
            action: "MANUAL_CHECK_IN",
            entity: "AttendanceRecord",
            entityId: r.id,
            metadata: { clubId, memberId, memberName: user.fullName },
          },
        });
        return r;
      });

      if (this.events) {
        const insideCount = await this.prisma.user.count({ where: { insideGym: true, clubId } });
        this.events.emitAttendanceUpdate(clubId, {
          event: "CHECK_IN", insideCount,
          member: { name: user.fullName, email: user.email },
          time: now.toISOString(),
        });
      }

      return {
        event: "CHECK_IN" as const,
        member: { name: user.fullName, email: user.email },
        time: now.toISOString(),
        recordId: record.id,
      };
    } else {
      const activeRecord = await this.prisma.attendanceRecord.findFirst({
        where: { memberId, exitAt: null, status: "ACTIVE" },
        orderBy: { entryAt: "desc" },
      });

      const durationSeconds = activeRecord
        ? Math.floor((now.getTime() - activeRecord.entryAt.getTime()) / 1000)
        : null;

      await this.prisma.$transaction(async (tx) => {
        if (activeRecord) {
          await tx.attendanceRecord.update({
            where: { id: activeRecord.id },
            data: { exitAt: now, durationSeconds, status: "COMPLETED" },
          });
        }
        await tx.user.update({ where: { id: userId }, data: { insideGym: false, lastScanAt: now } });
        await tx.auditLog.create({
          data: {
            userId: actor.userId,
            action: "MANUAL_CHECK_OUT",
            entity: "AttendanceRecord",
            entityId: activeRecord?.id,
            metadata: { memberId, memberName: user.fullName, durationSeconds },
          },
        });
      });

      if (this.events) {
        const insideCount = await this.prisma.user.count({ where: { insideGym: true, clubId } });
        this.events.emitAttendanceUpdate(clubId, {
          event: "CHECK_OUT", insideCount,
          member: { name: user.fullName, email: user.email },
          time: now.toISOString(),
        });
      }

      return {
        event: "CHECK_OUT" as const,
        member: { name: user.fullName, email: user.email },
        time: now.toISOString(),
        durationSeconds,
        recordId: activeRecord?.id ?? null,
      };
    }
  }

  // ─── Legacy check-in (kept for backwards compat) ───────────────────────────

  async checkIn(clubId: string, memberId: string, actor: AuthenticatedUser) {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: { user: { select: { clubId: true } } },
    });

    if (!member) throw new NotFoundException("Member not found");

    if (actor.role === "GYM_OWNER") {
      if (!actor.clubId || actor.clubId !== clubId || actor.clubId !== member.user.clubId) {
        throw new ForbiddenException("You can only check in members of your own club");
      }
    }

    if (actor.role === "TRAINER") {
      const trainerProfile = await this.prisma.trainerProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!trainerProfile || member.trainerId !== trainerProfile.id) {
        throw new ForbiddenException("You can only check in your assigned members");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.attendanceRecord.create({
        data: { clubId, memberId, entryAt: new Date(), source: "QR" },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "ATTENDANCE_CHECK_IN",
          entity: "AttendanceRecord",
          entityId: record.id,
          metadata: { clubId, memberId },
        },
      });
      return record;
    });
  }

  // ─── Legacy summary (kept for backwards compat) ────────────────────────────

  async summary(memberId: string, actor: AuthenticatedUser) {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, clubId: true } },
        trainer: { select: { userId: true } },
      },
    });

    if (!member) throw new NotFoundException("Member not found");

    if (actor.role === "MEMBER" && member.user.id !== actor.userId) {
      throw new ForbiddenException("You can only view your own attendance summary");
    }

    if (actor.role === "TRAINER" && member.trainer?.userId !== actor.userId) {
      throw new ForbiddenException("You can only view summaries of your assigned members");
    }

    if (actor.role === "GYM_OWNER" && member.user.clubId !== actor.clubId) {
      throw new ForbiddenException("You can only view summaries of your club's members");
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalVisits, weeklyVisits, monthlyVisits] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { memberId } }),
      this.prisma.attendanceRecord.count({ where: { memberId, entryAt: { gte: weekStart } } }),
      this.prisma.attendanceRecord.count({ where: { memberId, entryAt: { gte: monthStart } } }),
    ]);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
      totalVisits,
      weeklyVisits,
      monthlyVisits,
      attendancePercentage: Math.round((monthlyVisits / daysInMonth) * 100),
      streak: Math.min(weeklyVisits, 7),
      missedDays: Math.max(now.getDate() - monthlyVisits, 0),
    };
  }
}
