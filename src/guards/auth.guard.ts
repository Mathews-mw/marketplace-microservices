import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

interface IJwtUser {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic: boolean = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = IJwtUser>(
    err: Error | null,
    user: IJwtUser | false,
    _info: unknown,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user as TUser;
  }
}
