import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Settings } from '@prisma/client';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ExecuteResponse } from '../utils/custom.interface';
import { CustomException } from '../utils/ExeptionCustom';
import { MESSAGE } from '../utils/constant';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(): Promise<Settings> {
    const settings: Settings = await this.prisma.settings.findFirst();
    delete settings.id;
    return settings;
  }

  async update(
    uuid: string,
    updateSettingsDto: UpdateSettingsDto,
  ): Promise<ExecuteResponse> {
    const findSettings: Settings = await this.prisma.settings.findUnique({
      where: { uuid: uuid },
    });

    if (!findSettings) {
      throw new CustomException(MESSAGE.ID_NOT_FOUND, HttpStatus.CONFLICT);
    }

    await this.prisma.settings.update({
      where: {
        id: findSettings.id,
      },
      data: {
        ...updateSettingsDto,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
