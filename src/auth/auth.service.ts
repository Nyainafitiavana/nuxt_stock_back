import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthInterface } from './auth.interface';
import { UserService } from '../user/user.service';
import { Status, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { STATUS } from '../utils/constant';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async signIn(email: string, password: string): Promise<AuthInterface> {
    const user: User = await this.userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException({
        message: `This email "${email}" is not found`,
      });
    }

    const isPasswordValid: boolean = await bcrypt.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: `Passwords do not match.`,
      });
    }

    delete user.password;

    const findDeletedStatus: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    if (user.statusId === findDeletedStatus.id) {
      throw new UnauthorizedException({
        message: `The user is no longer active.`,
      });
    }

    const token: string = await this.jwtService.signAsync({ user });
    const expiresAt = new Date(Date.now() + 8 * 3600 * 1000); // 8 hours

    await this.prisma.token.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Login success',
      access_token: await this.jwtService.signAsync({ user }),
      is_admin: user.isAdmin,
      id: user.uuid,
    };
  }

  async blacklistToken(token: string): Promise<void> {
    await this.prisma.token.deleteMany({ where: { token } });
  }
}
