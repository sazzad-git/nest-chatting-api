// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../../users/users.service'
import { Role } from '@prisma/client'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService
  ) {
    const jwtSecret = configService.get<string>('JWT_ACCESS_TOKEN_SECRET')
    if (!jwtSecret) {
      throw new Error(
        'JWT_ACCESS_TOKEN_SECRET is not defined in environment variables'
      )
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    })
  }

  async validate(payload: { sub: string; username: string; roles: Role[] }) {
    // এখানে আপনি ইউজার আইডি দিয়ে ডেটাবেস থেকে ইউজারকে লোড করতে পারেন
    // এবং প্রয়োজনে অতিরিক্ত ডেটা payload এ যোগ করতে পারেন।
    const user = await this.usersService.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('User not found.')
    }
    // পাসওয়ার্ড বা রিফ্রেশ টোকেন ছাড়া ইউজার অবজেক্ট ফেরত দিন
    const { password, refreshToken, ...result } = user
    return result
  }
}
