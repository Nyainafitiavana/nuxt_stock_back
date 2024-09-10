import { Module } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterController } from './cash-register.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../../utils/helper';
import { SettingsService } from '../settings/settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService, Helper, SettingsService],
})
export class CashRegisterModule {}
