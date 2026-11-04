import { NestFactory } from '@nestjs/core';
import { AuthRateLimitMiddleware } from './common/middleware/auth-rate-limit.middleware.js';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins.length ? corsOrigins : 'http://localhost:3000' });
  const authRateLimit = new AuthRateLimitMiddleware();
  app.use('/api/auth', authRateLimit.use.bind(authRateLimit));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}
await bootstrap();