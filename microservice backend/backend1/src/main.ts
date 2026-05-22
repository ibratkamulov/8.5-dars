import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Auth Service running on http://localhost:${port}`);
}
bootstrap();
