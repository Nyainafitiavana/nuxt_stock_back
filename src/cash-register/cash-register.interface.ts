export interface ICashRegister {
  initial_cash: number;
  presentSalesAmount: number;
  presentPurchaseAmount: number;
  presentExpensesAmount: number;
  totalAmountSales: number;
  totalAmountPurchase: number;
  amountExpenses: number;
  amount_output: number;
  amount_input: number;
  real_cash: number;
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
