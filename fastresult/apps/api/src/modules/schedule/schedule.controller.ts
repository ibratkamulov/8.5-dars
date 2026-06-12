import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser, AuthenticatedUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { DeleteShiftDto, ScheduleService, UpsertShiftDto } from "./schedule.service";

@Controller("schedule")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ScheduleController {
  constructor(private readonly svc: ScheduleService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  listAll(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.listAll(user);
  }

  @Get(":trainerId")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  listForTrainer(@Param("trainerId") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.listForTrainer(id, user);
  }

  @Post()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  upsert(@Body() dto: UpsertShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.upsert(dto, user);
  }

  @Delete()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  remove(@Body() dto: DeleteShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.remove(dto, user);
  }
}
