import {
  Controller,
  Get,
  HttpStatus,
  Next,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto';
import { NextFunction, Response, Request } from 'express';
import { AuthInterface } from './auth.interface';
import { AuthGuard } from './auth.guards';

@Controller('/api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login')
  async signIn(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const body: AuthDto = req.body;

      const result: AuthInterface = await this.authService.signIn(
        body.email,
        body.password,
      );

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @Post('/logout')
  async logout(@Req() req: any, @Res() res: Response): Promise<void> {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    await this.authService.blacklistToken(token);
    const result = {
      statusCode: HttpStatus.OK,
      message: 'Logged out successfully',
    };

    res.status(HttpStatus.OK).json(result);
  }

  @UseGuards(AuthGuard)
  @Get('/test-token')
  async testToken(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      res
        .status(HttpStatus.OK)
        .json({ statusCode: HttpStatus.OK, message: 'Token valid.' });
    } catch (error) {
      next(error);
    }
  }
}
