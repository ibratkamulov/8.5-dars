import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { TrainersService } from "./trainers.service";

@ApiTags("trainers")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("trainers")
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.trainersService.list(user);
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER")
  get(@Param("id") id: string) {
    return this.trainersService.get(id);
  }
}
