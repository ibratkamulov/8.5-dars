import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../../common/roles.guard";
import { CurrentUser, AuthenticatedUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { CreateWorkoutDto, WorkoutService } from "./workout.service";

@Controller("workout")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class WorkoutController {
  constructor(private readonly svc: WorkoutService) {}

  @Get(":memberId")
  list(@Param("memberId") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(id, user);
  }

  @Post()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  create(@Body() dto: CreateWorkoutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.create(dto, user);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.remove(id, user);
  }
}
