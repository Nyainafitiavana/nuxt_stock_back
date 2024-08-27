import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthInterface } from './auth.interface';
import { UserService } from '../user/user.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string): Promise<AuthInterface> {
    const user: User = await this.userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException({
        message: `This email "${email}" is not found`,
      });
    }

    if (password !== user.password) {
      throw new UnauthorizedException({
        message: `Passwords do not match`,
      });
    }

    delete user.password;

    return {
      statusCode: HttpStatus.OK,
      message: 'Login success',
      access_token: await this.jwtService.signAsync({ user }),
      is_admin: user.isAdmin,
      id: user.uuid,
    };
  }
}
