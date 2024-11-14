import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ICashRegister,
  IExpenses,
  IProfitLoss,
  IRealCash,
  IRevenue,
  ISalesPurchase,
} from './cash-register.interface';
import { SettingsService } from '../settings/settings.service';
import { Settings } from '@prisma/client';
import { STATUS } from '../utils/constant';

@Injectable()
export class CashRegisterService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async cashGlobalSummary(): Promise<ICashRegister> {
    //Get initialCash on settings
    const settings: Settings = await this.settingsService.getSettings();
    const initialCash: number = settings.initialCash;
    //Get present amount
    const presentSalesAmount: number = await this.getPresentAmountSales();
    const presentPurchaseAmount: number = await this.getPresentAmountPurchase();
    const presentExpensesAmount: number = await this.getPresentAmountExpenses();

    return {
      initial_cash: initialCash,
      presentSalesAmount: presentSalesAmount,
      presentPurchaseAmount: presentPurchaseAmount,
      presentExpensesAmount: presentExpensesAmount,
    };
  }

  async getPresentAmountPurchase(): Promise<number> {
    const result = await this.prisma.$queryRaw`
      select 
        coalesce(sum(psp."purchasePrice" * d.quantity), 0) as amount_purchase
      from "Movement" m 
      left join "Details" d on d."movementId" = m.id 
      left join "Status" s on s.id = m."statusId" 
      left join "ProductSalesPrice" psp on psp.id = d."salesPriceId" 
      where m."isSales" = false
      and s."code" = ${STATUS.VALIDATED}
      and m."createdAt"::DATE = CURRENT_DATE
    `;

    return result[0].amount_purchase;
  }

  async getRealCash(): Promise<IRealCash> {
    return this.prisma.$queryRaw`
      WITH 
        expenses_data AS (
            SELECT 
                COALESCE(SUM(e.amount), 0) AS total_expenses_amount
            FROM "Expenses" e
            LEFT JOIN "Status" s ON e."statusId" = s.id
            WHERE s.code = ${STATUS.ACTIVE}
        ), 
        initial_cash_data AS (
            SELECT COALESCE(s."initialCash", 0) AS initial_cash FROM "Settings" s LIMIT 1
        ), 
        aggregated_data AS (
            SELECT
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = false AND s.code = ${STATUS.VALIDATED} THEN (psp."purchasePrice" * d.quantity)
                    ELSE 0 
                END), 0) AS total_purchase_amount,
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                        CASE 
                            WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                            ELSE (psp.wholesale * d.quantity)
                        END
                    ELSE 0 
                END), 0) AS total_sales_amount
            FROM "Movement" m
            LEFT JOIN "Details" d ON m.id = d."movementId"
            LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
            LEFT JOIN "Status" s ON m."statusId" = s.id
        )
        SELECT
            ad.total_purchase_amount,
            ad.total_sales_amount,
            ed.total_expenses_amount,
            ic.initial_cash,
            COALESCE((ic.initial_cash + ad.total_sales_amount) - (ad.total_purchase_amount + ed.total_expenses_amount), 0) AS real_cash
        FROM aggregated_data ad
        LEFT JOIN expenses_data ed ON true
        LEFT JOIN initial_cash_data ic ON true
        limit 1;
    `;
  }

  async getPresentAmountSales(): Promise<number> {
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
      and m."createdAt"::DATE = CURRENT_DATE
    `;

    return result[0].amount_sales;
  }

  async getPresentAmountExpenses(): Promise<number> {
    const result = await this.prisma.$queryRaw`
      select 
        coalesce(sum(e.amount), 0) as amount_expenses 
      from "Expenses" e 
      left join "Status" s on s.id = e."statusId" 
      where s.code = ${STATUS.ACTIVE}
        and e."createdAt"::DATE = CURRENT_DATE
    `;

    return result[0].amount_expenses;
  }

  async getWeeklyProfitAndLoss(): Promise<IProfitLoss[]> {
    return this.prisma.$queryRaw`
      WITH week_days AS (
            SELECT generate_series(
                DATE_TRUNC('week', CURRENT_DATE)::date, 
                (DATE_TRUNC('week', CURRENT_DATE) + '6 days'::interval)::date, 
                '1 day'::interval
            ) AS day
        ),
        movement_data AS (
            SELECT 
                wd.day as x_series, 
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                        CASE 
                            WHEN d."isUnitPrice" = true THEN 
                                GREATEST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0)
                            ELSE 
                                GREATEST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0)
                        END
                    ELSE 0 
                END), 0) AS total_profit_amount,
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
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
            WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
            GROUP BY wd.day
        )
        SELECT 
            wd.day AS x_series,
            COALESCE(m.total_profit_amount, 0) AS total_profit_amount,
            COALESCE(m.total_loss_amount, 0) AS total_loss_amount
        FROM week_days wd
        LEFT JOIN movement_data m ON wd.day = m.x_series
        ORDER BY wd.day;
    `;
  }

  async getMonthlyProfitAndLoss(): Promise<IProfitLoss[]> {
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
        ),
        monthly_movement_data AS (
            SELECT 
                EXTRACT(MONTH FROM m."createdAt") AS month_number,
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                        CASE 
                            WHEN d."isUnitPrice" = true THEN 
                                GREATEST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0)
                            ELSE 
                                GREATEST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0)
                        END
                    ELSE 0 
                END), 0) AS total_profit_amount,
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
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
            WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
            GROUP BY EXTRACT(MONTH FROM m."createdAt")
        )
        SELECT 
            mn.month_name AS x_series,
            COALESCE(mmd.total_profit_amount, 0) AS total_profit_amount,
            COALESCE(mmd.total_loss_amount, 0) AS total_loss_amount
        FROM year_months ym
        JOIN month_names mn ON ym.month_number = mn.month_number
        LEFT JOIN monthly_movement_data mmd ON ym.month_number = mmd.month_number
        ORDER BY ym.month_number;
    `;
  }

  async getYearlyProfitAndLoss(): Promise<IProfitLoss[]> {
    return this.prisma.$queryRaw`
      WITH years AS (
            SELECT generate_series(EXTRACT(YEAR FROM CURRENT_DATE) - 5, EXTRACT(YEAR FROM CURRENT_DATE)) AS year
        ),
        yearly_movement_data AS (
            SELECT 
                EXTRACT(YEAR FROM m."createdAt") AS year,
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                        CASE 
                            WHEN d."isUnitPrice" = true THEN 
                                GREATEST(((psp."unitPrice" - psp."purchasePrice") * d.quantity), 0)
                            ELSE 
                                GREATEST(((psp.wholesale - psp."purchasePrice") * d.quantity), 0)
                        END
                    ELSE 0 
                END), 0) AS total_profit_amount,
                COALESCE(SUM(CASE 
                    WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
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
            WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
            GROUP BY EXTRACT(YEAR FROM m."createdAt")
        )
        SELECT 
            y.year as x_series,
            COALESCE(ymd.total_profit_amount, 0) AS total_profit_amount,
            COALESCE(ymd.total_loss_amount, 0) AS total_loss_amount
        FROM years y
        LEFT JOIN yearly_movement_data ymd ON y.year = ymd.year
        ORDER BY y.year;
    `;
  }

  async getWeeklySalesAndPurchase(): Promise<ISalesPurchase[]> {
    return this.prisma.$queryRaw`
      WITH week_days AS (
          SELECT generate_series(
              DATE_TRUNC('week', CURRENT_DATE)::date, 
              (DATE_TRUNC('week', CURRENT_DATE) + '6 days'::interval)::date, 
              '1 day'::interval
          ) AS day
      ),
      movement_data AS (
          SELECT 
              wd.day as x_series, 
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = false AND s.code = ${STATUS.VALIDATED} THEN (psp."purchasePrice" * d.quantity)
                  ELSE 0 
              END), 0) AS total_purchase_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                          ELSE (psp.wholesale * d.quantity)
                      END
                  ELSE 0 
              END), 0) AS total_sales_amount
          FROM week_days wd
          LEFT JOIN "Movement" m ON m."createdAt"::date = wd.day
          LEFT JOIN "Details" d ON m.id = d."movementId"
          LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN "Status" s ON m."statusId" = s.id
          WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
          GROUP BY wd.day
      )
      SELECT 
          wd.day AS x_series,
          COALESCE(m.total_purchase_amount, 0) AS total_purchase_amount,
          COALESCE(m.total_sales_amount, 0) AS total_sales_amount
      FROM week_days wd
      LEFT JOIN movement_data m ON wd.day = m.x_series
      ORDER BY wd.day;
    `;
  }

  async getMonthlySalesAndPurchase(): Promise<ISalesPurchase[]> {
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
      ),
      monthly_movement_data AS (
          SELECT 
              EXTRACT(MONTH FROM m."createdAt") AS month_number,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = false AND s.code = ${STATUS.VALIDATED} THEN (psp."purchasePrice" * d.quantity)
                  ELSE 0 
              END), 0) AS total_purchase_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                          ELSE (psp.wholesale * d.quantity)
                      END
                  ELSE 0 
              END), 0) AS total_sales_amount
          FROM "Movement" m
          LEFT JOIN "Details" d ON m.id = d."movementId"
          LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN "Status" s ON m."statusId" = s.id
          WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
          GROUP BY EXTRACT(MONTH FROM m."createdAt")
      )
      SELECT 
          mn.month_name AS x_series,
          COALESCE(mmd.total_purchase_amount, 0) AS total_purchase_amount,
          COALESCE(mmd.total_sales_amount, 0) AS total_sales_amount
      FROM year_months ym
      JOIN month_names mn ON ym.month_number = mn.month_number
      LEFT JOIN monthly_movement_data mmd ON ym.month_number = mmd.month_number
      ORDER BY ym.month_number;
    `;
  }

  async getYearlySalesAndPurchase(): Promise<ISalesPurchase[]> {
    return this.prisma.$queryRaw`
      WITH years AS (
          SELECT generate_series(EXTRACT(YEAR FROM CURRENT_DATE) - 5, EXTRACT(YEAR FROM CURRENT_DATE)) AS year
      ),
      yearly_movement_data AS (
          SELECT 
              EXTRACT(YEAR FROM m."createdAt") AS year,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = false AND s.code = ${STATUS.VALIDATED} THEN (psp."purchasePrice" * d.quantity)
                  ELSE 0 
              END), 0) AS total_purchase_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                          ELSE (psp.wholesale * d.quantity)
                      END
                  ELSE 0 
              END), 0) AS total_sales_amount
          FROM "Movement" m
          LEFT JOIN "Details" d ON m.id = d."movementId"
          LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN "Status" s ON m."statusId" = s.id
          WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
          GROUP BY EXTRACT(YEAR FROM m."createdAt")
      )
      SELECT 
          y.year as x_series,
          COALESCE(ymd.total_purchase_amount, 0) AS total_purchase_amount,
          COALESCE(ymd.total_sales_amount, 0) AS total_sales_amount
      FROM years y
      LEFT JOIN yearly_movement_data ymd ON y.year = ymd.year
      ORDER BY y.year;
    `;
  }

  async getWeeklyExpenses(): Promise<IExpenses[]> {
    return this.prisma.$queryRaw`
      WITH week_days AS (
          SELECT generate_series(
              DATE_TRUNC('week', CURRENT_DATE)::date, 
              (DATE_TRUNC('week', CURRENT_DATE) + '6 days'::interval)::date, 
              '1 day'::interval
          ) AS day
      ),
      expenses_data AS (
          SELECT 
              wd.day AS x_series,
              COALESCE(SUM(e.amount), 0) AS total_expenses_amount
          FROM week_days wd
          LEFT JOIN "Expenses" e ON e."createdAt"::date = wd.day
          WHERE e."statusId" = (SELECT id FROM "Status" WHERE code = ${STATUS.ACTIVE})
          GROUP BY wd.day
      )
      SELECT 
          wd.day AS x_series,
          COALESCE(e.total_expenses_amount, 0) AS total_expenses_amount
      FROM week_days wd
      LEFT JOIN expenses_data e ON wd.day = e.x_series
      ORDER BY wd.day;
    `;
  }

  async getMonthlyExpenses(): Promise<IExpenses[]> {
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
      ),
      monthly_expenses_data AS (
          SELECT 
              EXTRACT(MONTH FROM e."createdAt") AS month_number,
              COALESCE(SUM(e.amount), 0) AS total_expenses_amount
          FROM "Expenses" e
          LEFT JOIN "Status" s ON e."statusId" = s.id
          WHERE s.code = ${STATUS.ACTIVE}
          GROUP BY EXTRACT(MONTH FROM e."createdAt")
      )
      SELECT 
          mn.month_name AS x_series,
          COALESCE(me.total_expenses_amount, 0) AS total_expenses_amount
      FROM year_months ym
      JOIN month_names mn ON ym.month_number = mn.month_number
      LEFT JOIN monthly_expenses_data me ON ym.month_number = me.month_number
      ORDER BY ym.month_number;
    `;
  }

  async getYearlyExpenses(): Promise<IExpenses[]> {
    return this.prisma.$queryRaw`
      WITH years AS (
          SELECT generate_series(EXTRACT(YEAR FROM CURRENT_DATE) - 5, EXTRACT(YEAR FROM CURRENT_DATE)) AS year
      ),
      yearly_expenses_data AS (
          SELECT 
              EXTRACT(YEAR FROM e."createdAt") AS year,
              COALESCE(SUM(e.amount), 0) AS total_expenses_amount
          FROM "Expenses" e
          WHERE e."statusId" = (SELECT id FROM "Status" WHERE code = ${STATUS.ACTIVE})
          GROUP BY EXTRACT(YEAR FROM e."createdAt")
      )
      SELECT 
          y.year as x_series,
          COALESCE(ye.total_expenses_amount, 0) AS total_expenses_amount
      FROM years y
      LEFT JOIN yearly_expenses_data ye ON y.year = ye.year
      ORDER BY y.year;
    `;
  }

  async getWeeklyRevenue(): Promise<IRevenue[]> {
    return this.prisma.$queryRaw`
      WITH week_days AS (
      SELECT generate_series(
          DATE_TRUNC('week', CURRENT_DATE)::date, 
          (DATE_TRUNC('week', CURRENT_DATE) + '6 days'::interval)::date, 
          '1 day'::interval
          ) AS day
      ),
      movement_data AS (
          SELECT 
              wd.day as x_series, 
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = false AND s.code = ${STATUS.VALIDATED} THEN (psp."purchasePrice" * d.quantity)
                  ELSE 0 
              END), 0) AS total_purchase_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                          ELSE (psp.wholesale * d.quantity)
                      END
                  ELSE 0 
              END), 0) AS total_sales_amount
          FROM week_days wd
          LEFT JOIN "Movement" m ON m."createdAt"::date = wd.day
          LEFT JOIN "Details" d ON m.id = d."movementId"
          LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN "Status" s ON m."statusId" = s.id
          WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
          GROUP BY wd.day
      ),
      expenses_data AS (
        SELECT 
          wd.day AS x_series,
          COALESCE(SUM(e.amount), 0) AS total_expenses_amount
        FROM week_days wd
        LEFT JOIN "Expenses" e ON e."createdAt"::date = wd.day
      WHERE e."statusId" = (SELECT id FROM "Status" WHERE code = ${STATUS.ACTIVE})
        GROUP BY wd.day
      ),
      initial_cash_data AS (
          SELECT COALESCE(s."initialCash", 0) AS initial_cash FROM "Settings" s LIMIT 1
      )
      SELECT 
          wd.day AS x_series,
          case when m.total_purchase_amount is null and m.total_sales_amount is null and e.total_expenses_amount is null then 0 else
          (COALESCE(m.total_sales_amount, 0) - COALESCE(m.total_purchase_amount, 0) - COALESCE(e.total_expenses_amount, 0)) end AS revenue
      FROM week_days wd
      LEFT JOIN movement_data m ON wd.day = m.x_series
      LEFT JOIN expenses_data e ON wd.day = e.x_series
      LEFT JOIN initial_cash_data ic ON true
      ORDER BY wd.day;
    `;
  }

  async getMonthlyRevenue(): Promise<IRevenue[]> {
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
      ),
      monthly_movement_data AS (
          SELECT 
              EXTRACT(MONTH FROM m."createdAt") AS month_number,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = false AND s.code = ${STATUS.VALIDATED} THEN (psp."purchasePrice" * d.quantity)
                  ELSE 0 
              END), 0) AS total_purchase_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                          ELSE (psp.wholesale * d.quantity)
                      END
                  ELSE 0 
              END), 0) AS total_sales_amount
          FROM "Movement" m
          LEFT JOIN "Details" d ON m.id = d."movementId"
          LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN "Status" s ON m."statusId" = s.id
          WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
          GROUP BY EXTRACT(MONTH FROM m."createdAt")
      ), 
      monthly_expenses_data AS (
          SELECT 
              EXTRACT(MONTH FROM e."createdAt") AS month_number,
              COALESCE(SUM(e.amount), 0) AS total_expenses_amount
          FROM "Expenses" e
          LEFT JOIN "Status" s ON e."statusId" = s.id
          WHERE s.code = ${STATUS.ACTIVE}
          GROUP BY EXTRACT(MONTH FROM e."createdAt")
      ), 
      initial_cash_data AS (
          SELECT COALESCE(s."initialCash", 0) AS initial_cash FROM "Settings" s LIMIT 1
      )
      SELECT 
          mn.month_name AS x_series,
        case when mmd.total_purchase_amount is null and mmd.total_sales_amount is null and me.total_expenses_amount is null then 0 else
          (COALESCE(mmd.total_sales_amount, 0) - COALESCE(mmd.total_purchase_amount, 0) - COALESCE(me.total_expenses_amount, 0)) end AS revenue
      FROM year_months ym
      JOIN month_names mn ON ym.month_number = mn.month_number
      LEFT JOIN monthly_movement_data mmd ON ym.month_number = mmd.month_number
      LEFT JOIN monthly_expenses_data me ON ym.month_number = me.month_number
      LEFT JOIN initial_cash_data ic ON true
      ORDER BY ym.month_number;
    `;
  }

  async getYearlyRevenue(): Promise<IRevenue[]> {
    return this.prisma.$queryRaw`
      WITH years AS (
        SELECT generate_series(EXTRACT(YEAR FROM CURRENT_DATE) - 5, EXTRACT(YEAR FROM CURRENT_DATE)) AS year
      ),
      yearly_movement_data AS (
          SELECT 
              EXTRACT(YEAR FROM m."createdAt") AS year,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = false AND s.code = ${STATUS.VALIDATED} THEN (psp."purchasePrice" * d.quantity)
                  ELSE 0 
              END), 0) AS total_purchase_amount,
              COALESCE(SUM(CASE 
                  WHEN m."isSales" = true AND s.code = ${STATUS.COMPLETED} THEN 
                      CASE 
                          WHEN d."isUnitPrice" = true THEN (psp."unitPrice" * d.quantity)
                          ELSE (psp.wholesale * d.quantity)
                      END
                  ELSE 0 
              END), 0) AS total_sales_amount
          FROM "Movement" m
          LEFT JOIN "Details" d ON m.id = d."movementId"
          LEFT JOIN "ProductSalesPrice" psp ON d."salesPriceId" = psp.id
          LEFT JOIN "Status" s ON m."statusId" = s.id
          WHERE s.code = ${STATUS.COMPLETED} OR s.code = ${STATUS.VALIDATED}
          GROUP BY EXTRACT(YEAR FROM m."createdAt")
      ),
      yearly_expenses_data AS (
          SELECT 
              EXTRACT(YEAR FROM e."createdAt") AS year,
          COALESCE(SUM(e.amount), 0) AS total_expenses_amount
        FROM "Expenses" e
        WHERE e."statusId" = (SELECT id FROM "Status" WHERE code = ${STATUS.ACTIVE})
        GROUP BY EXTRACT(YEAR FROM e."createdAt")
      ), 
      initial_cash_data AS (
          SELECT COALESCE(s."initialCash", 0) AS initial_cash FROM "Settings" s LIMIT 1
      )
      SELECT 
          y.year as x_series,
        case when ymd.total_purchase_amount is null and ymd.total_sales_amount is null and ye.total_expenses_amount is null then 0 else
          (COALESCE(ymd.total_sales_amount, 0) - COALESCE(ymd.total_purchase_amount, 0) - COALESCE(ye.total_expenses_amount, 0)) end AS revenue
      FROM years y
      LEFT JOIN yearly_expenses_data ye ON y.year = ye.year
      LEFT JOIN yearly_movement_data ymd ON y.year = ymd.year
      LEFT JOIN initial_cash_data ic ON true
      ORDER BY y.year;
    `;
  }
}
