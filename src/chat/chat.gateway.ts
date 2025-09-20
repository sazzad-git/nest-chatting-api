// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'
import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(ChatGateway.name)
  private onlineUsers = new Map<string, string>() // userId -> socketId

  constructor(
    private readonly chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  // WebSocket কানেকশন অথেনটিকেশন
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string
      if (!token) throw new Error('Authentication token missing')

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      })

      client.data.user = payload // সকেটে ইউজার ডেটা যোগ করুন
      this.onlineUsers.set(payload.sub, client.id)
      this.logger.log(`Client connected: ${client.id}, User ID: ${payload.sub}`)
    } catch (e) {
      this.logger.error(`Authentication failed: ${e.message}`)
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      this.onlineUsers.delete(client.data.user.sub)
    }
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  // ক্লায়েন্টকে একটি চ্যাট রুমে জয়েন করানো
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user
    const isParticipant = await this.chatService.isUserParticipant(
      user.sub,
      conversationId
    )
    if (isParticipant) {
      client.join(conversationId)
      this.logger.log(`User ${user.sub} joined conversation ${conversationId}`)
    } else {
      client.emit('error', 'You are not authorized to join this conversation.')
    }
  }

  // মেসেজ পাঠানো এবং ব্রডকাস্ট করা
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() payload: { conversationId: string; content: string },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user // অথেনটিকেটেড ইউজার
    const { conversationId, content } = payload

    // --- START: অথোরাইজেশন চেক যোগ করুন ---
    const isParticipant = await this.chatService.isUserParticipant(
      user.sub, // ইউজারের আইডি
      conversationId
    )

    if (!isParticipant) {
      // যদি ইউজার অংশগ্রহণকারী না হয়, তাহলে একটি এরর ইভেন্ট পাঠান
      client.emit('error', {
        message: 'You are not a participant of this conversation.',
      })
      this.logger.warn(
        `User ${user.sub} tried to send message to conversation ${conversationId} without being a participant.`
      )
      return // ফাংশন থেকে বেরিয়ে যান
    }
    // --- END: অথোরাইজেশন চেক ---

    // মেসেজ ডেটাবেসে সেভ করুন (এই অংশটি ঠিক আছে)
    const message = await this.chatService.createMessage(
      user.sub,
      conversationId,
      content
    )

    // রুমে থাকা সকল ক্লায়েন্টের কাছে মেসেজ পাঠান
    this.server.to(conversationId).emit('newMessage', message)

    // নোটিফিকেশন পাঠান
    this.handleNotification(message, user.sub)
  }

  @SubscribeMessage('markAsSeen')
  async handleMarkAsSeen(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket
  ) {
    const userId = client.data.user.sub
    // এখন this.prisma এর পরিবর্তে chatService এর মেথড কল করুন
    await this.chatService.markConversationAsSeen(userId, conversationId)

    // অন্য অংশগ্রহণকারীদের কাছে 'conversationSeen' ইভেন্ট পাঠান
    client
      .to(conversationId)
      .emit('conversationSeen', { conversationId, userId })

    this.logger.log(
      `User ${userId} marked conversation ${conversationId} as seen.`
    )
  }

  // লাইভ নোটিফিকেশন হ্যান্ডেল করা
  private handleNotification(message: any, senderId: string) {
    const conversation = message.conversation

    conversation.participants.forEach((participant) => {
      // প্রেরককে নোটিফিকেশন পাঠাবেন না
      if (participant.userId === senderId) return

      // অংশগ্রহণকারী অনলাইন আছে কিনা তা চেক করুন
      const recipientSocketId = this.onlineUsers.get(participant.userId)
      if (recipientSocketId) {
        // নোটিফিকেশন পাঠান
        this.server.to(recipientSocketId).emit('notification', {
          message: `New message from ${message.sender.username} in ${conversation.name || 'a chat'}`,
          conversationId: conversation.id,
        })
        this.logger.log(`Sent notification to user ${participant.userId}`)
      }
    })
  }
}
