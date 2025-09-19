// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    // Public ডেকোরেটর চেক করুন
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true // পাবলিক এন্ডপয়েন্টের জন্য অথেনটিকেশন বাইপাস করুন
    }
    return super.canActivate(context) // সুরক্ষিত এন্ডপয়েন্টের জন্য JWT যাচাই করুন
  }

  // handleRequest মেথডটি অপশনাল, এটি কাস্টম এরর মেসেজের জন্য ব্যবহার করা যেতে পারে
  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token')
    }
    return user
  }
}
