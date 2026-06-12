import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { MembersService } from "./members.service";

@ApiTags("members")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.list(user);
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membersService.get(id, user);
  }
}
