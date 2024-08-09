export type Paginate<T> = {
  data: T;
  totalRows: number;
  page: number;
};

export type ExecuteResponse = {
  message: string;
  statusCode: number;
};
