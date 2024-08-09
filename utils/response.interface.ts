export interface ResponseInterface {
  statusCode: number;
  message: string;
  data?: [] | object;
  totalRows?: number;
  page?: number | null;
  limit?: number | null;
}
