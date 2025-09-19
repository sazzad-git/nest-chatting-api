// src/auth/strategies/jwt-refresh.strategy.ts
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express' // Request টাইপ ইম্পোর্ট করুন

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh'
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true, // রিকোয়েস্ট অবজেক্টকে ভ্যালিডেট ফাংশনে পাস করার জন্য
    } as StrategyOptionsWithRequest)
  }

  async validate(req: Request, payload: { sub: string; username: string }) {
    const authHeader = req.get('Authorization')
    if (!authHeader) {
      throw new UnauthorizedException('Refresh token malformed')
    }
    const refreshToken = authHeader.replace('Bearer', '').trim()
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token malformed')

    // এখানে আমরা userId এবং refreshToken উভয়ই ফেরত দিচ্ছি,
    // যা AuthService.refreshTokens ফাংশনটি ব্যবহার করবে।
    return {
      userId: payload.sub,
      username: payload.username,
      refreshToken,
    }
  }
}
