import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOptions: CorsOptions = {
    origin: '*',
    credentials: true,
  };

  app.enableCors(corsOptions);

  // Log incoming requests
  app.use((req, res, next) => {
    console.log(`Request URL: ${req.url}`);
    next();
  });

  await app.listen(3001);
}
bootstrap();
