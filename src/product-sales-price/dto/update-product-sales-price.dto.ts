import { PartialType } from '@nestjs/mapped-types';
import { CreateProductSalesPriceDto } from './create-product-sales-price.dto';

export class UpdateProductSalesPriceDto extends PartialType(CreateProductSalesPriceDto) {}
