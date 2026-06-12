import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("generate")
  @Roles("SUPER_ADMIN", "GYM_OWNER")
  async generate(
    @Query("type") type: "pdf" | "excel",
    @Query("scope") scope: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } = await this.reportsService.generateBuffer(
      type ?? "pdf",
      scope ?? "revenue",
      actor.clubId,
    );
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }
}
