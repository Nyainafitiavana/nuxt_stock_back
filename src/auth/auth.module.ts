import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { jwtConstants } from './constants';
import { UserModule } from '../user/user.module';
import Helper from '../utils/helper';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '8h' },
    }),
    UserModule,
    PrismaModule,
  ],
  providers: [AuthService, Helper],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
