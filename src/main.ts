import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: 'http://localhost:3001', // আপনার Next.js ফ্রন্টএন্ডের অরিজিন
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
