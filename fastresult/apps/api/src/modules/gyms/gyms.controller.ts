import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { SearchGymsQueryDto } from "./gym.dto";
import { GymsService } from "./gyms.service";

@ApiTags("gyms")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("gyms")
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get("search")
  @ApiOperation({ summary: "Search real gyms from OpenStreetMap (Overpass API)" })
  @ApiQuery({ name: "city", required: false, example: "Urgench" })
  @ApiQuery({ name: "q", required: false, description: "Text filter (name / address)" })
  search(@Query() dto: SearchGymsQueryDto) {
    return this.gymsService.search(dto.city, dto.q);
  }
}
