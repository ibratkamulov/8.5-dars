import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { CreateNutritionDto, NutritionService } from "./nutrition.service";

@ApiTags("nutrition")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("nutrition")
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  list(@Query("memberId") memberId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.nutritionService.list(memberId, user);
  }

  @Post()
  @Roles("SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER")
  create(@Body() dto: CreateNutritionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.nutritionService.create(dto, user);
  }
}
