import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Order Service running on http://localhost:${port}`);
}
bootstrap();
