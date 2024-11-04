import { Controller, Get, Param, Res } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { Response } from 'express';
import { join } from 'path';

@Controller('/api/pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('/:name')
  getPdf(@Res() res: Response, @Param('name') pdfName: string) {
    res.sendFile(join(__dirname, '..', '..', '..', 'public', pdfName));
  }
}
