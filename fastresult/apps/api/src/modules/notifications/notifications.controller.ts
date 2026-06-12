import { Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser, AuthenticatedUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(user);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.unreadCount(user);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.markAllRead(user);
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.markRead(id, user);
  }

  @Post("send-expiry-reminders")
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  sendExpiryReminders() {
    return this.svc.sendExpiryReminders();
  }
}
