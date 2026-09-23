import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // 1. Import Swagger

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });

  // 2. Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('Tài liệu API hệ thống E-Commerce')
    .setVersion('1.0')
    .addBearerAuth() // Hỗ trợ nút Authorize để test Token
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // Đường dẫn sẽ là /api/docs do dính GlobalPrefix 'api'

  // 3. Chạy ứng dụng (mặc định port 3000)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
