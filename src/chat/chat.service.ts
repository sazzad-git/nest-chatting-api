import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { User } from '@prisma/client'

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // নতুন কথোপকথন তৈরি (ব্যক্তিগত বা গ্রুপ)
  async createConversation(
    currentUser: User,
    participantIds: string[],
    isGroup: boolean,
    name?: string
  ) {
    const allParticipantIds = [...new Set([currentUser.id, ...participantIds])]

    // ব্যক্তিগত চ্যাটের ক্ষেত্রে, যদি দুজনের মধ্যে আগে থেকেই চ্যাট থাকে, তবে নতুন না বানিয়ে পুরোনোটিই ফেরত দাও
    if (!isGroup && allParticipantIds.length === 2) {
      const existingConversation = await this.prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: allParticipantIds[0] } } },
            { participants: { some: { userId: allParticipantIds[1] } } },
          ],
        },
      })
      if (existingConversation) return existingConversation
    }

    // নতুন কথোপকথন তৈরি
    return this.prisma.conversation.create({
      data: {
        isGroup,
        name: isGroup ? name : null,
        adminId: isGroup ? currentUser.id : null,
        participants: {
          create: allParticipantIds.map((id) => ({ userId: id })),
        },
      },
    })
  }

  // লগইন করা ইউজারের সব কথোপকথন খুঁজুন
  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
  }

  // একটি নির্দিষ্ট কথোপকথনের মেসেজ খুঁজুন
  async getMessagesInConversation(conversationId: string, userId: string) {
    // ইউজার এই কথোপকথনের অংশ কিনা তা যাচাই করুন
    const isParticipant = await this.isUserParticipant(userId, conversationId)
    if (!isParticipant) {
      throw new UnauthorizedException(
        'You are not a participant of this conversation.'
      )
    }
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, username: true } } },
    })
  }

  // মেসেজ তৈরি এবং সেভ করুন (এটি গেটওয়ে থেকে ব্যবহৃত হবে)
  async createMessage(
    senderId: string,
    conversationId: string,
    content: string
  ) {
    const message = await this.prisma.message.create({
      data: {
        senderId,
        conversationId,
        content,
      },
      include: {
        sender: { select: { id: true, username: true } },
        conversation: { include: { participants: true } }, // নোটিফিকেশনের জন্য অংশগ্রহণকারীদের প্রয়োজন
      },
    })
    await this.prisma.userInConversation.updateMany({
      where: {
        conversationId: conversationId,
        NOT: { userId: senderId }, // প্রেরককে বাদ দিন
      },
      data: {
        unreadCount: {
          increment: 1, // আগের মানের সাথে ১ যোগ করুন
        },
      },
    })
    return message
  }

  // মেসেজ 'seen' করার জন্য নতুন সার্ভিস মেথড
  async markConversationAsSeen(userId: string, conversationId: string) {
    // ইউজার এই কথোপকথনের অংশ কিনা তা নিশ্চিত করুন (ঐচ্ছিক কিন্তু ভালো)
    const isParticipant = await this.isUserParticipant(userId, conversationId)
    if (!isParticipant) {
      throw new UnauthorizedException(
        'You are not a participant of this conversation.'
      )
    }

    return this.prisma.userInConversation.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      data: { unreadCount: 0 },
    })
  }

  // হেল্পার ফাংশন: ইউজার অংশগ্রহণকারী কিনা
  async isUserParticipant(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const count = await this.prisma.userInConversation.count({
      where: { userId, conversationId },
    })
    return count > 0
  }
}
