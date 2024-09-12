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

export interface ICashWeekly extends IGlobalField {
  day_date: Date;
}

export interface ICashMonthly extends IGlobalField {
  month: string;
}

export interface ICashYearly extends IGlobalField {
  year: number;
}

interface IGlobalField {
  total_purchase_price: number;
  total_sales: number;
  total_expenses: number;
  benefits: number;
  loss: number;
}
