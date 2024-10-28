import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Res,
  Next,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { MovementService } from './movement.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { RejectDto, UpdateDetailsDto } from './dto/update-movement.dto';
import { NextFunction, Request, Response } from 'express';
import { Movement, User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guards';
import { DetailsWithStock } from './details.interface';
import { AdminGuard } from '../auth/admin.guards';
import { IHistoryValidation } from './historyValidation.interface';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';

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
      const startDate: string = req.query.startDate
        ? String(req.query.startDate)
        : '';
      const endDate: string = req.query.endDate
        ? String(req.query.endDate)
        : '';
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
        startDate,
        endDate,
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
    @Param('uuid') movementId: string,
  ): Promise<void> {
    try {
      const detailsMovement: DetailsWithStock[] =
        await this.movementService.findAllDetailsMovement(movementId);

      res.status(HttpStatus.OK).json(detailsMovement);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Patch(':uuid/update_details')
  async updateDetailMovement(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('uuid') movementId: string,
    @Body() updateDetailsDto: UpdateDetailsDto,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const detailsMovement: ExecuteResponse =
        await this.movementService.updateDetailMovement(
          movementId,
          updateDetailsDto.details,
          req['user'],
        );

      res.status(HttpStatus.OK).json(detailsMovement);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch(':uuid/validate')
  async validateMovement(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('uuid') movementId: string,
  ): Promise<void> {
    try {
      const userConnect: User = req['user'];
      const validateMovement: ExecuteResponse =
        await this.movementService.validateMovement(movementId, userConnect);

      res.status(HttpStatus.OK).json(validateMovement);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch(':uuid/reject')
  async rejectMovement(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('uuid') movementId: string,
    @Body() rejectDto: RejectDto,
  ): Promise<void> {
    try {
      const userConnect: User = req['user'];
      const validateMovement: ExecuteResponse =
        await this.movementService.rejectMovement(
          movementId,
          userConnect,
          rejectDto,
        );

      res.status(HttpStatus.OK).json(validateMovement);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get(':uuid/history/validation')
  async findAllHistoryValidationMovement(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('uuid') movementId: string,
  ): Promise<void> {
    try {
      const historyValidation: IHistoryValidation[] =
        await this.movementService.findAllHistoryValidationMovement(movementId);

      res.status(HttpStatus.OK).json(historyValidation);
    } catch (error) {
      next(error);
    }
  }
}
