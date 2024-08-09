import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guards';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard extends AuthGuard {
  constructor(
    private reflector: Reflector,
    jwtService: JwtService,
  ) {
    super(jwtService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context); // Ensure the user is authenticated

    const request = context.switchToHttp().getRequest();
    const user = request['user'];

    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access only');
    }
    return true;
  }
}
