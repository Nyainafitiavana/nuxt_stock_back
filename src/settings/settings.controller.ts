import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Next,
  Param,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AdminGuard } from '../auth/admin.guards';
import { NextFunction, Response } from 'express';
import { ExecuteResponse } from '../../utils/custom.interface';
import { Settings } from '@prisma/client';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthGuard } from '../auth/auth.guards';

@Controller('/api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(AdminGuard)
  @Get()
  async getSettings(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const settings: Settings = await this.settingsService.getSettings();

      res.status(HttpStatus.OK).json(settings);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get('/currency/type')
  async getCurrencyType(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const settings: Settings = await this.settingsService.getSettings();

      res.status(HttpStatus.OK).json({ currencyType: settings.currencyType });
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const updated: ExecuteResponse = await this.settingsService.update(
        uuid,
        updateSettingsDto,
      );

      res.status(HttpStatus.OK).json(updated);
    } catch (error) {
      next(error);
    }
  }
}
