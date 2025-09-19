// src/users/users.service.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'
import { CreateUserDto } from './dto/create-user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } })
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async findAllUsers() {
    return this.prisma.user.findMany()
  }

  async updateUser(id: string, updateUserDto: Partial<CreateUserDto>) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    })
  }
  async removeUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
    })
  }
  async create(username: string, email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10) // পাসওয়ার্ড হ্যাশ করুন
    return this.prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword, // হ্যাশ করা পাসওয়ার্ড সেভ করুন
      },
    })
  }

  // রিফ্রেশ টোকেন সেভ করার জন্য
  async updateRefreshToken(userId: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    })
  }

  // ইউজারকে যাচাই করা (পাসওয়ার্ড ছাড়া)
  async validateUser(username: string, passwordPlain: string): Promise<any> {
    const user = await this.findByUsername(username)
    if (user && (await bcrypt.compare(passwordPlain, user.password))) {
      const { password, ...result } = user // পাসওয়ার্ড বাদ দিয়ে ইউজার অবজেক্ট ফেরত দিন
      return result
    }
    return null
  }
}
