import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { CreateGoalDto, GoalsService, UpdateGoalDto } from "./goals.service";

@ApiTags("goals")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("goals")
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  list(@Query("memberId") memberId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.goalsService.list(memberId, user);
  }

  @Post()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  create(@Body() dto: CreateGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.goalsService.create(dto, user);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  update(@Param("id") id: string, @Body() dto: UpdateGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.goalsService.update(id, dto, user);
  }
}
