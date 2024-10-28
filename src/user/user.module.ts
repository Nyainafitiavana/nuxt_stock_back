import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../utils/helper';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, Helper],
  exports: [UserService],
})
export class UserModule {}
