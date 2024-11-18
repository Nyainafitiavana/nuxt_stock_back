import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';
import { ProductModule } from '../product/product.module';
import { ProductSalesPriceModule } from '../product-sales-price/product-sales-price.module';
import { UnitModule } from '../unit/unit.module';
import { MovementModule } from '../movement/movement.module';
import { SettingsModule } from '../settings/settings.module';
import { ExpenseTypeModule } from '../expense-type/expense-type.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { PdfModule } from '../pdf/pdf.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskServiceService } from './task-service.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PdfModule,
    AuthModule,
    UserModule,
    PrismaModule,
    CategoryModule,
    ProductModule,
    UnitModule,
    ProductSalesPriceModule,
    MovementModule,
    SettingsModule,
    ExpenseTypeModule,
    ExpensesModule,
    CashRegisterModule,
  ],
  controllers: [AppController],
  providers: [AppService, TaskServiceService],
})
export class AppModule {}
