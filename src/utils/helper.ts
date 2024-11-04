import { v4 as uuidv4 } from 'uuid';

class Helper {
  public calculateOffset = async (
    limit: number,
    page: number,
  ): Promise<number> => {
    return limit * (page - 1);
  };

  public getDateNowString = async (): Promise<string> => {
    const date: Date = new Date();
    const year: string = date.toLocaleString('default', { year: 'numeric' });
    const month: string = date.toLocaleString('default', { month: '2-digit' });
    const day: string = date.toLocaleString('default', { day: '2-digit' });

    return year + '-' + month + '-' + day;
  };

  public getYear = async (): Promise<string> => {
    const date: Date = new Date();
    return date.toLocaleString('default', { year: 'numeric' });
  };

  public getMonth = async (): Promise<string> => {
    const date: Date = new Date();
    return date.toLocaleString('default', { month: '2-digit' });
  };

  public getDay = async (): Promise<string> => {
    const date: Date = new Date();
    return date.toLocaleString('default', { day: '2-digit' });
  };

  public generateUuid = async (): Promise<string> => {
    return uuidv4();
  };
}
export default Helper;
