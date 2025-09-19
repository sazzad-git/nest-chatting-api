// src/chat/chat.module.ts
import { Module } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { ChatGateway } from './chat.gateway'
import { AuthModule } from '../auth/auth.module' // <-- AuthModule ইম্পোর্ট করুন
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule, AuthModule], // <-- AuthModule যোগ করুন
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
