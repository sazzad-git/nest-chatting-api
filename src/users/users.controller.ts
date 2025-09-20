// src/users/users.controller.ts
import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard' // JWT Guard ইম্পোর্ট করুন
import {
  GetCurrentUser,
  GetCurrentUserId,
} from '../auth/decorators/get-current-user.decorator'
import { RolesGuard } from 'src/auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'
import type { User } from '@prisma/client'

@Controller('users')
@UseGuards(JwtAuthGuard) // এই কন্ট্রোলারের সকল রুট ডিফল্টভাবে সুরক্ষিত
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // সাধারণত শুধুমাত্র অ্যাডমিন সকল ইউজার দেখতে পারে
  // @Roles(Role.ADMIN) // আপনি রোল-বেসড অথরাইজেশন যোগ করতে পারেন
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAllUsers()
  }

  // অ্যাডমিনদের জন্য সকল ইউজার দেখার রুট
  @Get('all')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  adminFindAllUsers() {
    return this.usersService.findAllUsers() // সকল ইউজার
  }

  // চ্যাটের জন্য ইউজার খোঁজার রুট (সকল লগইন করা ইউজারের জন্য)
  @Get('search-for-chat')
  findAllUsersForChat(@GetCurrentUser() currentUser: User) {
    return this.usersService.findAllExcept(currentUser.id)
  }

  @Get() // GET /users
  findAllUsers(@GetCurrentUser() currentUser: User) {
    // নিজেকে বাদ দিয়ে বাকি সব ব্যবহারকারীকে ফেরত দিন
    return this.usersService.findAllExcept(currentUser.id)
  }
  // একজন ইউজার নিজের প্রোফাইল দেখতে পারে
  @Get('profile')
  getProfile(@GetCurrentUserId() userId: string) {
    return this.usersService.findById(userId)
  }

  // অ্যাডমিন যেকোনো ইউজারকে আইডি দিয়ে দেখতে পারে
  // @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id)
  }

  // একজন ইউজার নিজের প্রোফাইল আপডেট করতে পারে
  @Patch('profile')
  updateProfile(
    @GetCurrentUserId() userId: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.usersService.updateUser(userId, updateUserDto)
  }

  // অ্যাডমিন যেকোনো ইউজারকে ডিলিট করতে পারে
  // @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.removeUser(id)
  }
}
