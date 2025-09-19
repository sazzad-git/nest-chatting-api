// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard' // পরে তৈরি করা হবে
import { JwtAuthGuard } from './guards/jwt-auth.guard' // পরে তৈরি করা হবে
import { CreateUserDto } from '../users/dto/create-user.dto' // User DTO (যদি থাকে)
import { Public } from './decorators/public.decorator' // পরে তৈরি করা হবে
import {
  GetCurrentUser,
  GetCurrentUserId,
} from './decorators/get-current-user.decorator' // পরে তৈরি করা হবে
import { JwtRefreshGuard } from './guards/jwt-refresh.guard' // পরে তৈরি করা হবে

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() // এটি পাবলিক এন্ডপয়েন্ট, Auth Guard এর বাইরে থাকবে
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.register(
      createUserDto.username,
      createUserDto.email,
      createUserDto.password
    )
    return {
      message: 'User registered successfully',
      user: { id: user.id, username: user.username, email: user.email },
    }
  }

  @Public() // এটি পাবলিক এন্ডপয়েন্ট
  @UseGuards(LocalAuthGuard) // Local Strategy ব্যবহার করুন
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: any) {
    // req.user LocalAuthGuard থেকে আসবে
    // console.log(req.user)
    const { accessToken, refreshToken } = await this.authService.login(req.user)
    return {
      user: req.user,
      accessToken,
      refreshToken,
    }
  }

  @UseGuards(JwtAuthGuard) // JWT Guard ব্যবহার করুন
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@GetCurrentUserId() userId: string) {
    await this.authService.logout(userId)
    return { message: 'Logged out successfully' }
  }

  @Public() // এটি পাবলিক এন্ডপয়েন্ট
  @UseGuards(JwtRefreshGuard) // JwtRefresh Strategy ব্যবহার করুন
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string
  ) {
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokens(userId, refreshToken)
    return {
      accessToken,
      refreshToken: newRefreshToken,
    }
  }

  @UseGuards(JwtAuthGuard) // সুরক্ষিত রুট
  @Get('profile')
  getProfile(@Request() req) {
    // req.user JWT strategy থেকে আসবে
    return req.user
  }
}
