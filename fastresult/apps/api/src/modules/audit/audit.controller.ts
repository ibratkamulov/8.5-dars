import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  list(
    @Query("page") page: string,
    @Query("limit") limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditService.list(
      user,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }
}
