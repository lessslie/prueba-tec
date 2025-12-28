import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const originsEnv = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '';
  const envOrigins = originsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('MeliInsights API')
    .setDescription('Business intelligence API for Mercado Libre publications')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
  console.log(`API documentation: http://localhost:${process.env.PORT || 3001}/api/docs`);
}

bootstrap();
