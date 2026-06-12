import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AdminCreateUserDto, LoginDto, RefreshDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, 12)
      }
    });

    await this.prisma.auditLog.create({
      data: { userId: user.id, action: "AUTH_REGISTER", entity: "User", entityId: user.id, ipAddress }
    });

    return this.issueTokens(user.id, user.role, user.clubId, ipAddress, userAgent);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.auditLog.create({
      data: { userId: user.id, action: "AUTH_LOGIN", entity: "User", entityId: user.id, ipAddress }
    });

    return this.issueTokens(user.id, user.role, user.clubId, ipAddress, userAgent);
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string; role: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET") ?? "development-refresh-secret"
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    // Verify the session exists and is not revoked
    const session = await this.prisma.session.findFirst({
      where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } }
    });
    if (!session) {
      throw new UnauthorizedException("Session expired or revoked");
    }

    // Verify the refresh token hash matches
    const valid = await bcrypt.compare(dto.refreshToken, session.refreshTokenHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });

    // Rotate: revoke old session, issue new tokens
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

    return this.issueTokens(user.id, user.role, user.clubId);
  }

  async logout(userId: string) {
    // Revoke all active sessions for this user
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await this.prisma.auditLog.create({
      data: { userId, action: "AUTH_LOGOUT", entity: "User", entityId: userId }
    });
  }

  async adminCreateUser(dto: AdminCreateUserDto, actorRole: string, actorClubId: string | null) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");

    // GYM_OWNER faqat o'z klubiga qo'sha oladi
    if (actorRole === "GYM_OWNER" && dto.role === "GYM_OWNER") {
      throw new ConflictException("GYM_OWNER boshqa GYM_OWNER yarata olmaydi");
    }

    const clubId = actorRole === "SUPER_ADMIN" ? null : actorClubId;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          fullName: dto.fullName,
          phone: dto.phone,
          role: dto.role,
          clubId,
          passwordHash: await bcrypt.hash(dto.password, 12),
        },
      });

      if (dto.role === "MEMBER") {
        await tx.memberProfile.create({ data: { userId: created.id } });
      } else if (dto.role === "TRAINER") {
        await tx.trainerProfile.create({ data: { userId: created.id } });
      }

      return created;
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      clubId: user.clubId,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, clubId: true, locale: true, createdAt: true }
    });
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) throw new BadRequestException("Password must be at least 8 characters");
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Current password is incorrect");
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    await this.prisma.auditLog.create({
      data: { userId, action: "PASSWORD_CHANGED", entity: "User", entityId: userId },
    });
    return { ok: true };
  }

  private async issueTokens(userId: string, role: string, clubId: string | null, ipAddress?: string, userAgent?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role, clubId },
      { secret: this.config.get<string>("JWT_ACCESS_SECRET") ?? "development-access-secret", expiresIn: "15m" }
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, role, type: "refresh" },
      { secret: this.config.get<string>("JWT_REFRESH_SECRET") ?? "development-refresh-secret", expiresIn: "30d" }
    );

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: await bcrypt.hash(refreshToken, 12),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return { accessToken, refreshToken };
  }
}
