import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AiModule } from "./modules/ai/ai.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ClubsModule } from "./modules/clubs/clubs.module";
import { GymsModule } from "./modules/gyms/gyms.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { MeasurementsModule } from "./modules/measurements/measurements.module";
import { MembersModule } from "./modules/members/members.module";
import { MembershipsModule } from "./modules/memberships/memberships.module";
import { NutritionModule } from "./modules/nutrition/nutrition.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { TrainersModule } from "./modules/trainers/trainers.module";
import { WorkoutModule } from "./modules/workout/workout.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ScheduleModule as TrainerScheduleModule } from "./modules/schedule/schedule.module";
import { EventsModule } from "./modules/events/events.module";
import { AuditModule } from "./modules/audit/audit.module";
import { SearchModule } from "./modules/search/search.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    ClubsModule,
    GymsModule,
    AttendanceModule,
    AnalyticsModule,
    AiModule,
    MembersModule,
    TrainersModule,
    GoalsModule,
    NutritionModule,
    MeasurementsModule,
    MembershipsModule,
    ReportsModule,
    WorkoutModule,
    NotificationsModule,
    PaymentsModule,
    TrainerScheduleModule,
    EventsModule,
    AuditModule,
    SearchModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
