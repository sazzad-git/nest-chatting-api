// src/chat/chat.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common'
import { ChatService } from './chat.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator'
// import { User } from '@prisma/client'
import { Prisma } from '@prisma/client'
import type { User } from '@prisma/client'

class CreateConversationDto {
  participantIds: string[]
  isGroup: boolean
  name?: string
}

const UserType: User = {} as any
const _unused = Prisma.ModelName.User

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  createConversation(
    @GetCurrentUser() user: User,
    @Body() body: CreateConversationDto
  ) {
    return this.chatService.createConversation(
      user,
      body.participantIds,
      body.isGroup,
      body.name
    )
  }

  @Get('conversations')
  getUserConversations(@GetCurrentUser() user: User) {
    return this.chatService.getUserConversations(user.id)
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') conversationId: string,
    @GetCurrentUser() user: User
  ) {
    return this.chatService.getMessagesInConversation(conversationId, user.id)
  }
}
