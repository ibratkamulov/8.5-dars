import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { BulkAssignDto, MembershipsService } from "./memberships.service";

@ApiTags("memberships")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("memberships")
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  list(@Query("memberId") memberId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.list(memberId, user);
  }

  @Post("bulk-assign")
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  bulkAssign(@Body() dto: BulkAssignDto, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.bulkAssign(dto, user);
  }
}
