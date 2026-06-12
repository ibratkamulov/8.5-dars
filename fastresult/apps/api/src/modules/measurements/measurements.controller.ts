import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { CreateMeasurementDto, MeasurementsService } from "./measurements.service";

@ApiTags("measurements")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("measurements")
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  list(@Query("memberId") memberId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.measurementsService.list(memberId, user);
  }

  @Post()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  create(@Body() dto: CreateMeasurementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.measurementsService.create(dto, user);
  }
}
