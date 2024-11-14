export interface ICashRegister {
  presentSalesAmount: number;
  presentPurchaseAmount: number;
  presentExpensesAmount: number;
}

export interface IProfitLoss {
  x_series: string;
  total_profit_amount: number;
  total_loss_amount: number;
}

export interface ISalesPurchase {
  x_series: string;
  total_purchase_amount: number;
  total_sales_amount: number;
}

export interface IExpenses {
  x_series: string;
  total_expenses: number;
}

export interface IRevenue {
  x_series: string;
  revenue: number;
}

export interface ICashSummary {
  total_purchase_amount: number;
  total_sales_amount: number;
  total_expenses_amount: number;
  initial_cash: number;
  real_cash: number;
}
