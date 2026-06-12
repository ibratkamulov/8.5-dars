import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000",
    credentials: true
  });
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const docs = new DocumentBuilder()
    .setTitle("FastResult API")
    .setDescription("Fitness club management, analytics, AI recommendations, and memberships")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, docs));

  await app.listen(config.get<number>("PORT") ?? 4000);
}

void bootstrap();
