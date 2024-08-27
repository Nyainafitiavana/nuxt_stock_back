export interface IHistoryValidation {
  uuid: string;
  createdAt: Date;
  observation: string;
  validator: {
    firstName: string;
    lastName: string;
  };
  status: {
    uuid: string;
    designation: string;
    code: string;
  };
}
