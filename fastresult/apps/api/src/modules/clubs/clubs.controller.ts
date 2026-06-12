import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { ClubsService } from "./clubs.service";

@ApiTags("clubs")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("clubs")
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "MEMBER")
  findNearby(@Query("q") query?: string) {
    return this.clubsService.findNearby(query);
  }
}
