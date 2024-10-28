export interface ICashRegister {
  initial_cash: number;
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
