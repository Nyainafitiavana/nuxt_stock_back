import { v4 as uuidv4 } from 'uuid';
import { DetailsWithStock, IInvoiceData } from '../movement/details.interface';
import { Settings, User } from '@prisma/client';

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

  public formatDateString = (
    dateString: string,
    format: 'ENG' | 'FR',
    longFormat: boolean = false,
  ): string => {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }

    let formattedDate: string;

    if (longFormat) {
      // Long format with official formats
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      };
      formattedDate =
        format === 'ENG'
          ? date.toLocaleDateString('en-US', options) // e.g., "September 03, 2024"
          : date.toLocaleDateString('fr-FR', options); // e.g., "03 septembre 2024"
    } else {
      // Short format with official formats
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      };
      formattedDate =
        format === 'ENG'
          ? date.toLocaleDateString('en-US', options) // e.g., "09/03/2024"
          : date.toLocaleDateString('fr-FR', options); // e.g., "03/09/2024"
    }

    return formattedDate;
  };

  public formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  public ticketPdfTemplate = async (
    userConnect: User,
    invoiceData: IInvoiceData,
    appSetting: Settings,
  ): Promise<string> => {
    return `
        <style>
          body {
              width: 80mm; /* Set width to match your PDF width */
              height: 200mm;
              font-family: Arial, "Roboto Light",serif;
              font-size: 12px;
              margin: 3px;
              padding: 0;
              overflow: hidden; /* Prevent overflow */
          }
          .head-invoice {
            font-size: 10px;
          }
          .separate {
              width: 30px;
          }
          .invoice-title {
              font-weight: 600;
          }
          .invoice-number {
              margin-left: 5px;
          }
          .company-name, .invoice-date {
              font-weight: 600;
          }
    
          .product-list-table {
              margin-top: 10px;
              width: 99%;
              font-size: 11px;
          }
    
          .product-list-table, .product-list-table th, .product-list-table td {
              border: 1px solid black;
              border-collapse: collapse;
          }
          .body-list {
            font-size: 9px;
          }
          .price {
              text-align: right;
          }
          .qt {
              text-align: center;
          }
          .total {
              margin-top: 5px;
              font-size: 10px;
          }
          .legend {
              margin-top: 5px;
              font-size: 9px;
          }
          
        </style>
        <body>
            <table>
              <tbody>
                <tr class="head-invoice">
                  <td class="company-name">${appSetting.companyName}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-title">${invoiceData.language === 'ENG' ? 'INVOICE' : 'FACTURE'}</span>
                    <span class="invoice-number">n°: ${invoiceData.reference}</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td>${appSetting.companyAddress}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">Date :</span>
                    <span class="invoice-number">${await this.getDateNowString()}</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td>${appSetting.companyPhoneNumber}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">Client :</span>
                    <span class="invoice-number">${invoiceData.client}</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td></td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">${invoiceData.language === 'ENG' ? 'Editor' : 'Editeur'} :</span>
                    <span class="invoice-number"> ${userConnect.lastName} ${userConnect.firstName}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <table class="product-list-table">
              <thead class="head-invoice">
                <tr>
                  <th>${invoiceData.language === 'ENG' ? 'Designation' : 'Désignation'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'S.P' : 'P.V'} ${appSetting.currencyType}</th>
                  <th>${invoiceData.language === 'ENG' ? 'Qt.O' : 'Qt.C'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'DLV' : 'LV'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'RM' : 'RTL'}</th>
                  <th>Total ${appSetting.currencyType}</th>
                </tr>
              </thead>
              <tbody class="body-list">
                ${invoiceData.details
                  .map(
                    (item: DetailsWithStock) => `
                      <tr>
                        <td>${item.product_name}</td>
                        <td class="price">${item.is_unit_price ? this.formatPrice(item.unit_price) : this.formatPrice(item.wholesale_price)}</td>
                        <td class="qt">${item.quantity}</td>
                        <td class="qt">${item.quantity_delivered}</td>
                        <td class="qt">${item.quantity - item.quantity_delivered}</td>
                        <td class="price">${item.is_unit_price ? this.formatPrice(item.unit_price * item.quantity_delivered) : this.formatPrice(item.wholesale_price * item.quantity_delivered)}</td>
                      </tr>
                    `,
                  )
                  .join('')}
              </tbody>
            </table>
            <table class="total">
              <tr>
                <th>Total : </th>
                <td>${this.formatPrice(invoiceData.amountPaid)} ${appSetting.currencyType}</td>
              </tr>
            </table>
            <table class="legend">
              <tr >
                <th>${invoiceData.language === 'ENG' ? 'S.P' : 'P.V'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Sales price' : 'Prix de vente'} </td>
                <th>${invoiceData.language === 'ENG' ? 'Qt.O' : 'Qt.D'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Quantity ordered' : 'Quantité commandée'} </td>
                <th>${invoiceData.language === 'ENG' ? 'DLV' : 'LV'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Delivered' : 'Livré'} </td>
                <th>${invoiceData.language === 'ENG' ? 'RM' : 'RTL'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Remaining' : 'Reste'}</td>
              </tr>
            </table>
        </body>
    `;
  };

  public a4PdfTemplate = async (
    userConnect: User,
    invoiceData: IInvoiceData,
    appSetting: Settings,
  ): Promise<string> => {
    return `
        <style>
          body {
              font-family: Arial, "Roboto Light",serif;
              font-size: 12px;
              margin: 3px;
              padding: 0;
              overflow: hidden; /* Prevent overflow */
          }
          .head-invoice {
            font-size: 10px;
          }
          .separate {
              width: 30px;
          }
          .invoice-title {
              font-weight: 600;
          }
          .invoice-number {
              margin-left: 5px;
          }
          .company-name, .invoice-date {
              font-weight: 600;
          }
    
          .product-list-table {
              margin-top: 10px;
              width: 99%;
              font-size: 11px;
          }
    
          .product-list-table, .product-list-table th, .product-list-table td {
              border: 1px solid black;
              border-collapse: collapse;
          }
          .body-list {
            font-size: 9px;
          }
          .price {
              text-align: right;
          }
          .qt {
              text-align: center;
          }
          .total {
              margin-top: 5px;
              font-size: 10px;
          }
          .legend {
              margin-top: 5px;
              font-size: 9px;
          }
          
        </style>
        <body>
            <table>
              <tbody>
                <tr class="head-invoice">
                  <td class="company-name">${appSetting.companyName}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-title">${invoiceData.language === 'ENG' ? 'INVOICE' : 'FACTURE'}</span>
                    <span class="invoice-number">n°: ${invoiceData.reference}</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td>${appSetting.companyAddress}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">Date :</span>
                    <span class="invoice-number">${await this.getDateNowString()}</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td>${appSetting.companyPhoneNumber}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">Client :</span>
                    <span class="invoice-number">${invoiceData.client}</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td></td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">${invoiceData.language === 'ENG' ? 'Editor' : 'Editeur'} :</span>
                    <span class="invoice-number"> ${userConnect.lastName} ${userConnect.firstName}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <table class="product-list-table">
              <thead class="head-invoice">
                <tr>
                  <th>${invoiceData.language === 'ENG' ? 'Designation' : 'Désignation'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'S.P' : 'P.V'} ${appSetting.currencyType}</th>
                  <th>${invoiceData.language === 'ENG' ? 'Qt.O' : 'Qt.C'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'DLV' : 'LV'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'RM' : 'RTL'}</th>
                  <th>Total ${appSetting.currencyType}</th>
                </tr>
              </thead>
              <tbody class="body-list">
                ${invoiceData.details
                  .map(
                    (item: DetailsWithStock) => `
                      <tr>
                        <td>${item.product_name}</td>
                        <td class="price">${item.is_unit_price ? this.formatPrice(item.unit_price) : this.formatPrice(item.wholesale_price)}</td>
                        <td class="qt">${item.quantity}</td>
                        <td class="qt">${item.quantity_delivered}</td>
                        <td class="qt">${item.quantity - item.quantity_delivered}</td>
                        <td class="price">${item.is_unit_price ? this.formatPrice(item.unit_price * item.quantity_delivered) : this.formatPrice(item.wholesale_price * item.quantity_delivered)}</td>
                      </tr>
                    `,
                  )
                  .join('')}
              </tbody>
            </table>
            <table class="total">
              <tr>
                <th>Total : </th>
                <td>${this.formatPrice(invoiceData.amountPaid)} ${appSetting.currencyType}</td>
              </tr>
            </table>
            <table class="legend">
              <tr >
                <th>${invoiceData.language === 'ENG' ? 'S.P' : 'P.V'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Sales price' : 'Prix de vente'} </td>
                <th>${invoiceData.language === 'ENG' ? 'Qt.O' : 'Qt.D'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Quantity ordered' : 'Quantité commandée'} </td>
                <th>${invoiceData.language === 'ENG' ? 'DLV' : 'LV'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Delivered' : 'Livré'} </td>
                <th>${invoiceData.language === 'ENG' ? 'RM' : 'RTL'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Remaining' : 'Reste'}</td>
              </tr>
            </table>
        </body>
    `;
  };
}
export default Helper;
