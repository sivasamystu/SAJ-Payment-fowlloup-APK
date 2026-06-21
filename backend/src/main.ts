import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend clients (web and mobile local server ports)
  app.enableCors();

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Set global validation rules
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger documentation builder
  const config = new DocumentBuilder()
    .setTitle('SAJ Surveying Payment Collection System API')
    .setDescription('Backend REST APIs for tracking survey works and automating invoice collection reminders.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`NestJS application bootstrap successful on port ${port}`);
  console.log(`REST API documentation available at http://localhost:${port}/docs`);
}
bootstrap();
