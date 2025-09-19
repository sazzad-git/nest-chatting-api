// src/app.module.ts
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module' // <--- এটি যোগ করুন
import { UsersModule } from './users/users.module' // User ম্যানেজমেন্টের জন্য (যদি থাকে)
import { ConfigModule } from '@nestjs/config' // <--- এটি যোগ করুন

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
