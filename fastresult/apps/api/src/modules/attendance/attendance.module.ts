import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { EventsModule } from "../events/events.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
