import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  Next,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { MovementService } from './movement.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { NextFunction, Request, Response } from 'express';
import { Details, Movement, User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guards';
import { Paginate } from '../../utils/custom.interface';

@Controller('/api/movement')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Body() createMovementDto: CreateMovementDto,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const userConnect: User = req['user'];
      const movement: Movement = await this.movementService.create(
        createMovementDto,
        userConnect,
      );

      res.status(HttpStatus.OK).json(movement);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const limit: number = req.query.limit ? Number(req.query.limit) : null;
      const page: number = req.query.page ? Number(req.query.page) : null;
      const isSales: string = req.query.isSales
        ? (req.query.isSales as string)
        : 'false';
      const status: string = req.query.status
        ? (req.query.status as string)
        : '';

      const movement: Paginate<Movement[]> = await this.movementService.findAll(
        limit,
        page,
        JSON.parse(isSales),
        status,
      );

      res.status(HttpStatus.OK).json(movement);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get(':uuid/details')
  async findAllDetailsMovement(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Req() req: Request,
    @Param('uuid') movementId: string,
  ): Promise<void> {
    try {
      const limit: number = req.query.limit ? Number(req.query.limit) : null;
      const page: number = req.query.page ? Number(req.query.page) : null;

      const detailsMovement: Paginate<Details[]> =
        await this.movementService.findAllDetailsMovement(
          limit,
          page,
          movementId,
        );

      res.status(HttpStatus.OK).json(detailsMovement);
    } catch (error) {
      next(error);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movementService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMovementDto: UpdateMovementDto,
  ) {
    return this.movementService.update(+id, updateMovementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movementService.remove(+id);
  }
}
