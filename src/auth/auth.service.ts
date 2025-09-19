// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { User } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  // ইউজার যাচাইয়ের জন্য (Local Strategy দ্বারা ব্যবহৃত)
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username)
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user
      return result
    }
    return null
  }

  // নতুন ইউজার রেজিস্টার করুন
  async register(
    username: string,
    email: string,
    passwordPlain: string
  ): Promise<User> {
    const existingUser = await this.usersService.findByUsername(username)
    if (existingUser) {
      throw new BadRequestException('Username already taken.')
    }
    const existingEmail = await this.usersService.findByEmail(email)
    if (existingEmail) {
      throw new BadRequestException('Email already in use.')
    }
    return this.usersService.create(username, email, passwordPlain)
  }

  // JWT অ্যাক্সেস এবং রিফ্রেশ টোকেন তৈরি করুন
  async getTokens(userId: string, username: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME'
          ),
        }
      ),
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>(
            'JWT_REFRESH_TOKEN_EXPIRATION_TIME'
          ),
        }
      ),
    ])
    return { accessToken, refreshToken }
  }

  // লগইন করার সময় টোকেন এবং রিফ্রেশ টোকেন ডেটাবেসে সেভ করুন
  async login(user: any) {
    const { accessToken, refreshToken } = await this.getTokens(
      user.id,
      user.username
    )
    await this.usersService.updateRefreshToken(user.id, refreshToken)
    return { user, accessToken, refreshToken }
  }

  // লগআউট: রিফ্রেশ টোকেন ডেটাবেস থেকে মুছে দিন
  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null)
  }

  // রিফ্রেশ টোকেন দিয়ে নতুন অ্যাক্সেস টোকেন জেনারেট করুন
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId)
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException(
        'Access Denied: User not found or refresh token missing.'
      )
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken
    ) // হ্যাশ করা রিফ্রেশ টোকেন যাচাই করুন
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access Denied: Invalid refresh token.')
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.getTokens(
      user.id,
      user.username
    )
    await this.usersService.updateRefreshToken(user.id, newRefreshToken) // নতুন রিফ্রেশ টোকেন সেভ করুন
    return { accessToken, refreshToken: newRefreshToken }
  }

  // রিফ্রেশ টোকেন হ্যাশ করে ডেটাবেসে সেভ করুন
  async hashRefreshToken(refreshToken: string) {
    return bcrypt.hash(refreshToken, 10)
  }
}
