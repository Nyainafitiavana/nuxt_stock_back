import { Controller, Next, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto';
import { NextFunction, Response, Request } from 'express';
import { AuthInterface } from './auth.interface';
import Helper from '../utils/helper';

@Controller('/api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private helper: Helper,
  ) {}

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

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
