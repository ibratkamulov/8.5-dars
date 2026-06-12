import { Module } from "@nestjs/common";
import { WorkoutController } from "./workout.controller";
import { WorkoutService } from "./workout.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [WorkoutController],
  providers: [WorkoutService],
})
export class WorkoutModule {}
