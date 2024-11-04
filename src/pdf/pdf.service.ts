import { Injectable } from '@nestjs/common';
import * as path from 'path';
import puppeteer, { PDFOptions } from 'puppeteer';

@Injectable()
export class PdfService {
  async createPdfWithTable(
    htmlContent: string,
    format: 'A4' | 'TICKET',
  ): Promise<{ url: string }> {
    // Define the path to the PDF file in the public directory
    const pdfPath = path.join(process.cwd(), 'public', 'generated.pdf');

    // Define PDF options based on format
    const options: PDFOptions = {
      path: pdfPath,
      printBackground: true,
    };

    // Set standard or custom dimensions
    if (format === 'A4') {
      options.format = 'A4';
    } else if (format === 'TICKET') {
      options.width = '2.75in';
      options.height = '8.5in';
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent);
    await page.pdf(options);

    await browser.close();

    return {
      url: `/api/pdf/generated.pdf`,
    };
  }
}
