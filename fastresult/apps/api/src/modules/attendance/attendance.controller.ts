import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, IsUUID, MinLength } from "class-validator";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { AttendanceService } from "./attendance.service";

class CheckInDto {
  @IsUUID()
  clubId!: string;

  @IsUUID()
  memberId!: string;
}

class ManualToggleDto {
  @IsUUID()
  userId!: string;

  @IsString()
  direction!: "IN" | "OUT";
}

class ScanDto {
  @IsString()
  @MinLength(1)
  token!: string;
}

@ApiTags("attendance")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ─── QR scan ────────────────────────────────────────────────────────────────

  @Post("scan")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  scan(@Body() dto: ScanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.scan(dto.token, user);
  }

  // ─── Live presence ───────────────────────────────────────────────────────────

  @Get("live")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  live(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.live(user);
  }

  // ─── Today's records ─────────────────────────────────────────────────────────

  @Get("today")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.today(user);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  @Get("stats")
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.stats(user);
  }

  // ─── My QR ───────────────────────────────────────────────────────────────────

  @Get("my-qr")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  myQr(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.myQr(user);
  }

  // ─── History for a user ───────────────────────────────────────────────────────

  @Get("history/:userId")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  history(@Param("userId") userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.history(userId, user);
  }

  // ─── Member detail / attendance summary ──────────────────────────────────────

  @Get("member/:userId")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  memberDetail(@Param("userId") userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.memberDetail(userId, user);
  }

  // ─── Get QR for a specific user ──────────────────────────────────────────────

  @Get("qr/:userId")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  getQrForUser(@Param("userId") userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getQrForUser(userId, user);
  }

  // ─── Legacy endpoints (backwards compat) ─────────────────────────────────────

  @Post("check-in")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.checkIn(dto.clubId, dto.memberId, user);
  }

  @Get("summary")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  summary(@Query("memberId") memberId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.summary(memberId, user);
  }

  @Post("manual")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  manualToggle(@Body() dto: ManualToggleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.manualToggle(dto.userId, dto.direction, user);
  }
}
