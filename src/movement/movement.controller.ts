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
import { AdminGuard } from '../auth/admin.guards';
import { NextFunction, Request, Response } from 'express';
import { Movement, User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guards';

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

  @Get()
  findAll() {
    return this.movementService.findAll();
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
