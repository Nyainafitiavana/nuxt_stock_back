import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { ICashRegister } from './cash-register.interface';
import { STATUS } from '../../utils/constant';
import { SettingsService } from '../settings/settings.service';
import { Settings } from '@prisma/client';

@Injectable()
export class CashRegisterService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
    private settingsService: SettingsService,
  ) {}

  async cashSummary(): Promise<ICashRegister> {
    //---------Beginning of get all amount of all expenses---------
    const amountPurchase: number = await this.getAmountPurchase();
    const amountSales: number = await this.getAmountSales();
    const amountExpenses: number = await this.getAmountExpenses();
    //---------End of get all amount of all expenses---------
    //---------Summary-------------
    //Get initialCash on settings
    const settings: Settings = await this.settingsService.getSettings();
    const initialCash: number = settings.initialCash;
    //The amount of initial cash and the amount of sales is the input
    const totalInput: number = initialCash + amountSales;
    //The amount purchase and expenses is the output
    const totalOutput: number = amountPurchase + amountExpenses;
    //So real_cash = input - output
    const real_cash: number = totalInput - totalOutput;

    return {
      amount_output: totalOutput,
      amount_input: totalInput,
      initial_cash: initialCash,
      real_cash: real_cash,
    };
  }

  async getAmountPurchase(): Promise<number> {
    const result = await this.prisma.$queryRaw`
      select 
        coalesce(sum(psp."purchasePrice" * d.quantity), 0) as amount_purchase
        from "Movement" m 
        left join "Details" d on d."movementId" = m.id 
        left join "Status" s on s.id = m."statusId" 
        left join "ProductSalesPrice" psp on psp.id = d."salesPriceId" 
        where "isSales" = false
        and s.code = ${STATUS.VALIDATED}
    `;

    return result[0].amount_purchase;
  }

  async getAmountSales(): Promise<number> {
    const result = await this.prisma.$queryRaw`
      select 
        coalesce(
            sum(
                case when d."isUnitPrice" = true then 
                    (psp."unitPrice" * d.quantity) else 
                    (psp.wholesale * d.quantity) end
            ) 
        , 0) as amount_sales
      from "Movement" m 
      left join "Details" d on d."movementId" = m.id 
      left join "Status" s on s.id = m."statusId" 
      left join "ProductSalesPrice" psp on psp.id = d."salesPriceId" 
      where "isSales" = true
      and s.code = ${STATUS.COMPLETED}
    `;

    return result[0].amount_sales;
  }

  async getAmountExpenses(): Promise<number> {
    const result = await this.prisma.$queryRaw`
      select 
        coalesce(sum(e.amount), 0) as amount_expenses 
      from "Expenses" e 
      left join "Status" s on s.id = e."statusId" 
      where s.code = ${STATUS.ACTIVE}
    `;

    return result[0].amount_expenses;
  }
}
