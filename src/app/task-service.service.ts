import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskServiceService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger: Logger = new Logger('Clean token job');

  @Cron(CronExpression.EVERY_WEEKEND)
  async handleCron() {
    try {
      console.log(this.logger);
      await this.prisma.token.deleteMany({});
      console.log('All items cleared successfully.');
    } catch (error) {
      console.error('Error while clearing items:', (error as Error).message);
    }
  }
}
