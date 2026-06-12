import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  search(@Query("q") q: string, @CurrentUser() user: AuthenticatedUser) {
    return this.searchService.search(q ?? "", user);
  }
}
