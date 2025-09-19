import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles) {
      return true // যদি কোনো রোলের প্রয়োজন না হয়, তাহলে অ্যাক্সেস দাও
    }
    const { user } = context.switchToHttp().getRequest()
    // req.user এর roles অ্যারেতে requiredRoles এর কোনো একটি রোল আছে কিনা তা চেক করুন
    return requiredRoles.some((role) => user.roles?.includes(role))
  }
}
