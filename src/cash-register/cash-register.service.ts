import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { ICashRegister, ICashSummary } from './cash-register.interface';
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

  async cashGlobalSummary(): Promise<ICashRegister> {
    //---------Beginning of get all amount of all expenses---------
    const totalAmountPurchase: number = await this.getAmountPurchase();
    const totalAmountSales: number = await this.getAmountSales();
    const amountExpenses: number = await this.getAmountExpenses();
    //---------End of get all amount of all expenses---------
    //---------Summary-------------
    //Get initialCash on settings
    const settings: Settings = await this.settingsService.getSettings();
    const initialCash: number = settings.initialCash;
    //The amount of sales is the input
    const totalInput: number = totalAmountSales;
    //The amount purchase and expenses is the output
    const totalOutput: number = totalAmountPurchase + amountExpenses;
    //So real_cash = input - output + initialCash
    const real_cash: number = totalInput - totalOutput + initialCash;
    //Get present amount
    const presentSalesAmount: number = await this.getAmountSales(false);
    const presentPurchaseAmount: number = await this.getAmountPurchase(false);
    const presentExpensesAmount: number = await this.getAmountExpenses(false);

    return {
      initial_cash: initialCash,
      presentSalesAmount: presentSalesAmount,
      presentPurchaseAmount: presentPurchaseAmount,
      presentExpensesAmount: presentExpensesAmount,
      totalAmountSales: totalAmountSales,
      totalAmountPurchase: totalAmountPurchase,
      amountExpenses: amountExpenses,
      amount_output: totalOutput,
      amount_input: totalInput,
      real_cash: real_cash,
    };
  }

  async getAmountPurchase(total: boolean = true): Promise<number> {
    const result = await this.prisma.$queryRaw`
    select 
      coalesce(sum(psp."purchasePrice" * d.quantity), 0) as amount_purchase
    from "Movement" m 
    left join "Details" d on d."movementId" = m.id 
    left join "Status" s on s.id = m."statusId" 
    left join "ProductSalesPrice" psp on psp.id = d."salesPriceId" 
    where m."isSales" = false
    and s."code" = ${STATUS.VALIDATED}
    and (${total} or m."createdAt"::DATE = CURRENT_DATE)
  `;

    return result[0].amount_purchase;
  }

  async getAmountSales(total: boolean = true): Promise<number> {
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
      and (${total} or m."createdAt"::DATE = CURRENT_DATE)
    `;

    return result[0].amount_sales;
  }

  async getAmountExpenses(total: boolean = true): Promise<number> {
    const result = await this.prisma.$queryRaw`
      select 
        coalesce(sum(e.amount), 0) as amount_expenses 
      from "Expenses" e 
      left join "Status" s on s.id = e."statusId" 
      where s.code = ${STATUS.ACTIVE}
        and (${total} or e."createdAt"::DATE = CURRENT_DATE)
    `;

    return result[0].amount_expenses;
  }

  async getWeeklySummaryCash(): Promise<ICashSummary[]> {
    return this.prisma.$queryRaw`
      WITH week_days AS (
        SELECT generate_series(
            DATE_TRUNC('week', CURRENT_DATE)::date, 
            (DATE_TRUNC('week', CURRENT_DATE) + '6 days'::interval)::date, 
            '1 day'::interval
        ) AS day
      )
      SELECT 
          wd.day as x_series, 
          COALESCE(SUM(CASE 
              WHEN m."isSales" = false AND s.code = 'VLD' THEN (psp."purchasePrice" * d.quantity)
              ELSE 0 
          END), 0) AS total_purchase_amount,
          COALESCE(SUM(CASE 
              WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                  CASE 
                      WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                      ELSE (psp.wholesale * d.quantity)
                  END
              ELSE 0 
          END), 0) AS total_sales_amount,
          COALESCE(SUM(CASE 
              WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                  CASE 
                      WHEN d."isUnitPrice" = true THEN 
                          GREATEST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0)
                      ELSE 
                          GREATEST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0)
                  END
              ELSE 0 
          END), 0) AS total_profit_amount,
          COALESCE(SUM(CASE 
              WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                  CASE 
                      WHEN d."isUnitPrice" = true THEN 
                          ABS(LEAST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0))
                      ELSE 
                          ABS(LEAST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0))
                  END
              ELSE 0 
          END), 0) AS total_loss_amount
      FROM week_days wd
      LEFT JOIN "Movement" m ON m."createdAt"::date = wd.day
      LEFT JOIN "Details" d ON m.id = d."movementId"
      LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
      LEFT JOIN "Status" s ON m."statusId" = s.id
      WHERE s.code IN ('CMP', 'VLD') OR s.code IS NULL
      GROUP BY wd.day
      ORDER BY wd.day;
    `;
  }

  async getMonthlySummaryCash(): Promise<ICashSummary[]> {
    return this.prisma.$queryRaw`
      WITH year_months AS (
        SELECT 
            EXTRACT(MONTH FROM generate_series(
                DATE_TRUNC('year', CURRENT_DATE)::date, 
                (DATE_TRUNC('year', CURRENT_DATE) + '11 months'::interval)::date, 
                '1 month'::interval
            )) AS month_number
      ),
      month_names AS (
          SELECT 1 AS month_number, 'Jan' AS month_name
          UNION ALL SELECT 2, 'Feb'
          UNION ALL SELECT 3, 'Mar'
          UNION ALL SELECT 4, 'Apr'
          UNION ALL SELECT 5, 'May'
          UNION ALL SELECT 6, 'Jun'
          UNION ALL SELECT 7, 'Jul'
          UNION ALL SELECT 8, 'Aug'
          UNION ALL SELECT 9, 'Sep'
          UNION ALL SELECT 10, 'Oct'
          UNION ALL SELECT 11, 'Nov'
          UNION ALL SELECT 12, 'Dec'
      )
      SELECT 
          mn.month_name x_series,
          COALESCE(SUM(CASE 
              WHEN m."isSales" = false AND s.code = 'VLD' THEN (psp."purchasePrice" * d.quantity)
              ELSE 0 
          END), 0) AS total_purchase_amount,
          COALESCE(SUM(CASE 
              WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                  CASE 
                      WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                      ELSE (psp.wholesale * d.quantity)
                  END
              ELSE 0 
          END), 0) AS total_sales_amount,
          COALESCE(SUM(CASE 
              WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                  CASE 
                      WHEN d."isUnitPrice" = true THEN 
                          GREATEST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0)
                      ELSE 
                          GREATEST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0)
                  END
              ELSE 0 
          END), 0) AS total_profit_amount,
          COALESCE(SUM(CASE 
              WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                  CASE 
                      WHEN d."isUnitPrice" = true THEN 
                          ABS(LEAST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0))
                      ELSE 
                          ABS(LEAST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0))
                  END
              ELSE 0 
          END), 0) AS total_loss_amount
      FROM year_months ym
      JOIN month_names mn ON ym.month_number = mn.month_number
      LEFT JOIN "Movement" m ON EXTRACT(MONTH FROM m."createdAt") = ym.month_number
      LEFT JOIN "Details" d ON m.id = d."movementId"
      LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
      LEFT JOIN "Status" s ON m."statusId" = s.id
      WHERE s.code IN ('CMP', 'VLD') OR s.code IS NULL
      GROUP BY mn.month_name, mn.month_number
      ORDER BY mn.month_number;
    `;
  }

  async getYearlySummaryCash(): Promise<ICashSummary[]> {
    return this.prisma.$queryRaw`
      WITH years AS (
        SELECT generate_series(EXTRACT(YEAR FROM CURRENT_DATE) - 4, EXTRACT(YEAR FROM CURRENT_DATE)) AS year
      ),
      yearly_data AS (
          SELECT 
              EXTRACT(YEAR FROM m."createdAt") AS year,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = false AND s.code = 'VLD' THEN (psp."purchasePrice" * d.quantity)
                  ELSE 0 
              END), 0) AS total_purchase_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                          ELSE (psp.wholesale * d.quantity)
                      END
                  ELSE 0 
              END), 0) AS total_sales_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN 
                              GREATEST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0)
                          ELSE 
                              GREATEST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0)
                      END
                  ELSE 0 
              END), 0) AS total_profit_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = 'CMP' THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN 
                              ABS(LEAST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0))
                          ELSE 
                              ABS(LEAST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0))
                      END
                  ELSE 0 
              END), 0) AS total_loss_amount
          FROM "Movement" m
          LEFT JOIN "Details" d ON m.id = d."movementId"
          LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN "Status" s ON m."statusId" = s.id
          WHERE s.code IN ('CMP', 'VLD') OR s.code IS NULL
          GROUP BY EXTRACT(YEAR FROM m."createdAt")
      )
      SELECT 
          y.year as x_series,
          COALESCE(yd.total_purchase_amount, 0) AS total_purchase_amount,
          COALESCE(yd.total_sales_amount, 0) AS total_sales_amount,
          COALESCE(yd.total_profit_amount, 0) AS total_profit_amount,
          COALESCE(yd.total_loss_amount, 0) AS total_loss_amount
      FROM years y
      LEFT JOIN yearly_data yd ON y.year = yd.year
      ORDER BY y.year;
    `;
  }
}
