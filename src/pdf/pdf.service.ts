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

    // Set custom dimensions for TICKET format
    if (format === 'TICKET') {
      // Use specific dimensions for ticket format
      options.width = '80mm'; // Width of 80mm
      options.height = '200mm'; // Height of 200mm
      options.margin = {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      }; // Set margins to 0 if needed
    } else if (format === 'A4') {
      options.format = 'A4'; // Keep A4 for A4 format
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set the viewport to ensure proper rendering
    await page.setViewport({ width: 800, height: 2000 });

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf(options);

    await browser.close();

    return {
      url: `/api/pdf/generated.pdf`,
    };
  }
}
