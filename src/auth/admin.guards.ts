import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from './auth.guards';

@Injectable()
export class AdminGuard extends AuthGuard {
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
