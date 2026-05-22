import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3000;

  await app.startAllMicroservices();
  await app.listen(port);

  console.log(`Product Service HTTP: http://localhost:${port}`);
  console.log('Product Service RabbitMQ: product_queue da tinglayapti');
}
bootstrap();
