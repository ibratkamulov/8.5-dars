import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser, AuthenticatedUser } from "../../common/current-user.decorator";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { CreatePaymentDto, PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("SUPER_ADMIN", "GYM_OWNER")
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(user);
  }

  @Get("summary")
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.summary(user);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.create(dto, user);
  }
}
