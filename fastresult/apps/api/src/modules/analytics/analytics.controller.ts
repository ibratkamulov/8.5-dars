import { Controller, ForbiddenException, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === "GYM_OWNER" && !user.clubId) {
      throw new ForbiddenException("Your account is not associated with a club");
    }
    // SUPER_ADMIN sees global data (clubId = null); GYM_OWNER sees only their club
    const clubId = user.role === "SUPER_ADMIN" ? null : user.clubId;
    return this.analyticsService.dashboard(clubId);
  }
}
