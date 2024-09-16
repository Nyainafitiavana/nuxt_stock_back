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
        SELECT 
            generate_series(
                DATE_TRUNC('week', CURRENT_DATE),  -- Start from Monday of the current week
                DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days',  -- End on Sunday
                '1 day'
            )::DATE AS x_series
      ),
      daily_totals AS (
          SELECT 
              wd.x_series,
              COALESCE(SUM(
                  CASE 
                      WHEN m."isSales" = false AND s."code" = ${STATUS.VALIDATED} THEN psp."purchasePrice" * d."quantity" -- Purchase calculation
                      ELSE 0
                  END
              ), 0) AS total_purchase_price,
              COALESCE(SUM(
                  CASE 
                      WHEN m."isSales" = true AND s."code" = ${STATUS.COMPLETED} THEN 
                          CASE 
                              WHEN d."isUnitPrice" = true THEN psp."unitPrice" * d."quantity"  -- Sales with unit price
                              ELSE psp."wholesale" * d."quantity"  -- Sales with wholesale price
                          END
                      ELSE 0
                  END
              ), 0) AS total_sales,
              COALESCE(expenses_sum.total_expenses, 0) AS total_expenses
          FROM 
              week_days wd
          LEFT JOIN 
              "Movement" m 
              ON DATE(m."createdAt") = wd.x_series
          LEFT JOIN 
              "Details" d ON m.id = d."movementId"
          LEFT JOIN 
              "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN 
              "Status" s ON m."statusId" = s.id
          LEFT JOIN (
              SELECT
                  DATE("createdAt") AS expense_date,
                  SUM("amount") AS total_expenses
              FROM 
                  "Expenses" e
              INNER JOIN
                  "Status" es ON e."statusId" = es.id
              WHERE 
                  es."code" = ${STATUS.ACTIVE}
              GROUP BY
                  DATE("createdAt")
          ) AS expenses_sum ON wd.x_series = expenses_sum.expense_date
          GROUP BY 
              wd.x_series, expenses_sum.total_expenses
      ),
      results AS (
          SELECT
              x_series,
              total_purchase_price,
              total_sales,
              total_expenses,
              CASE 
                  WHEN total_sales - (total_purchase_price + total_expenses) > 0 
                  THEN total_sales - (total_purchase_price + total_expenses)
                  ELSE 0
              END AS benefits,
              CASE 
                  WHEN total_sales - (total_purchase_price + total_expenses) < 0 
                  THEN ABS(total_sales - (total_purchase_price + total_expenses))
                  ELSE 0
              END AS loss
          FROM daily_totals
      )
      SELECT 
          x_series,
          total_purchase_price,
          total_sales,
          total_expenses,
          benefits,
          loss
      FROM results
      ORDER BY x_series;
    `;
  }

  async getMonthlySummaryCash(): Promise<ICashSummary[]> {
    return this.prisma.$queryRaw`
      WITH months AS (
        SELECT 
            generate_series(
                DATE_TRUNC('year', CURRENT_DATE),  -- Start from January of the current year
                DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '11 months',  -- End in December
                '1 month'
            )::DATE AS month_date
      ),
      monthly_totals AS (
          SELECT 
              DATE_TRUNC('month', wd.month_date) AS month_date,
              COALESCE(SUM(
                  CASE 
                      WHEN m."isSales" = false AND s."code" = ${STATUS.VALIDATED} THEN psp."purchasePrice" * d."quantity" -- Purchase calculation
                      ELSE 0
                  END
              ), 0) AS total_purchase_price,
              COALESCE(SUM(
                  CASE 
                      WHEN m."isSales" = true and s."code" = ${STATUS.COMPLETED}
                      THEN 
                          CASE 
                              WHEN d."isUnitPrice" = true THEN psp."unitPrice" * d."quantity"  -- Sales with unit price
                              ELSE psp."wholesale" * d."quantity"  -- Sales with wholesale price
                          END
                      ELSE 0
                  END
              ), 0) AS total_sales
          FROM 
              months wd
          LEFT JOIN 
              "Movement" m 
              ON DATE_TRUNC('month', m."createdAt") = DATE_TRUNC('month', wd.month_date)
          LEFT JOIN 
              "Details" d ON m.id = d."movementId"
          LEFT JOIN 
              "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN 
              "Status" s ON m."statusId" = s.id
          GROUP BY 
              wd.month_date
      ),
      monthly_expenses AS (
          SELECT
              DATE_TRUNC('month', "createdAt") AS expense_month,
              SUM("amount") AS total_expenses
          FROM 
              "Expenses" e
          INNER JOIN
              "Status" es ON e."statusId" = es.id
          WHERE 
              es."code" = ${STATUS.ACTIVE}
          GROUP BY
              DATE_TRUNC('month', "createdAt")
      ),
      results AS (
          SELECT
              mt.month_date,
              mt.total_purchase_price,
              mt.total_sales,
              COALESCE(me.total_expenses, 0) AS total_expenses,
              CASE 
                  WHEN mt.total_sales - (mt.total_purchase_price + COALESCE(me.total_expenses, 0)) > 0 
                  THEN mt.total_sales - (mt.total_purchase_price + COALESCE(me.total_expenses, 0))
                  ELSE 0
              END AS benefits,
              CASE 
                  WHEN mt.total_sales - (mt.total_purchase_price + COALESCE(me.total_expenses, 0)) < 0 
                  THEN ABS(mt.total_sales - (mt.total_purchase_price + COALESCE(me.total_expenses, 0)))
                  ELSE 0
              END AS loss
          FROM monthly_totals mt
          LEFT JOIN monthly_expenses me
          ON DATE_TRUNC('month', mt.month_date) = me.expense_month
      )
      SELECT 
          TO_CHAR(month_date, 'Mon') AS x_series,
          total_purchase_price,
          total_sales,
          total_expenses,
          benefits,
          loss
      FROM results
      ORDER BY month_date;
    `;
  }

  async getYearlySummaryCash(): Promise<ICashSummary[]> {
    return this.prisma.$queryRaw`
      WITH years AS (
          SELECT 
              generate_series(
                  DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '5 years',  -- 5 years before the current year
                  DATE_TRUNC('year', CURRENT_DATE),  -- Current year
                  '1 year'
              )::DATE AS x_series
      ),
      yearly_totals AS (
          SELECT 
              DATE_TRUNC('year', wd.x_series) AS x_series,
              COALESCE(SUM(
                  CASE 
                      WHEN m."isSales" = false AND s."code" = ${STATUS.VALIDATED} THEN psp."purchasePrice" * d."quantity" -- Purchase calculation
                      ELSE 0
                  END
              ), 0) AS total_purchase_price,
              COALESCE(SUM(
                  CASE 
                      WHEN m."isSales" = true AND s."code" = ${STATUS.COMPLETED} THEN 
                          CASE 
                              WHEN d."isUnitPrice" = true THEN psp."unitPrice" * d."quantity"  -- Sales with unit price
                              ELSE psp."wholesale" * d."quantity"  -- Sales with wholesale price
                          END
                      ELSE 0
                  END
              ), 0) AS total_sales
          FROM 
              years wd
          LEFT JOIN 
              "Movement" m 
              ON DATE_TRUNC('year', m."createdAt") = DATE_TRUNC('year', wd.x_series)
          LEFT JOIN 
              "Details" d ON m.id = d."movementId"
          LEFT JOIN 
              "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN 
              "Status" s ON m."statusId" = s.id
          GROUP BY 
              wd.x_series
      ),
      yearly_expenses AS (
          SELECT
              DATE_TRUNC('year', "createdAt") AS expense_year,
              SUM("amount") AS total_expenses
          FROM 
              "Expenses" e
          INNER JOIN
              "Status" es ON e."statusId" = es.id
          WHERE 
              es."code" = 'ACT'
          GROUP BY
              DATE_TRUNC('year', "createdAt")
      ),
      results AS (
          SELECT
              yt.x_series,
              yt.total_purchase_price,
              yt.total_sales,
              COALESCE(ye.total_expenses, 0) AS total_expenses,
              CASE 
                  WHEN yt.total_sales - (yt.total_purchase_price + COALESCE(ye.total_expenses, 0)) > 0 
                  THEN yt.total_sales - (yt.total_purchase_price + COALESCE(ye.total_expenses, 0))
                  ELSE 0
              END AS benefits,
              CASE 
                  WHEN yt.total_sales - (yt.total_purchase_price + COALESCE(ye.total_expenses, 0)) < 0 
                  THEN ABS(yt.total_sales - (yt.total_purchase_price + COALESCE(ye.total_expenses, 0)))
                  ELSE 0
              END AS loss
          FROM yearly_totals yt
          LEFT JOIN yearly_expenses ye
          ON DATE_TRUNC('year', yt.x_series) = ye.expense_year
      )
      SELECT 
          EXTRACT(YEAR FROM x_series) AS x_series,
          total_purchase_price,
          total_sales,
          total_expenses,
          benefits,
          loss
      FROM results
      ORDER BY x_series;
    `;
  }
}
