import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { AiService } from "./ai.service";

@ApiTags("ai")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("recommendations")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  recommendations(@Query("memberId") memberId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.recommendations(memberId, user);
  }
}
