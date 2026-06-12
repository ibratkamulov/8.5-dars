import { Body, Controller, Get, Post, Req, UseGuards, HttpCode } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { AuthService } from "./auth.service";
import { AdminCreateUserDto, LoginDto, RefreshDto } from "./dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request.ip, request.headers["user-agent"]);
  }

  @Post("create-user")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  createUser(@Body() dto: AdminCreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.authService.adminCreateUser(dto, actor.role, actor.clubId ?? null);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post("logout")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.userId);
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }

  @Post("change-password")
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  changePassword(
    @Body() dto: { currentPassword: string; newPassword: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

}
