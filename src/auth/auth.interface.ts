export interface AuthInterface {
  statusCode: number;
  message: string;
  access_token?: string;
  is_admin?: boolean;
  id: string;
}
