import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Next,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NextFunction, Response, Request } from 'express';
import { User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guards';
import { AdminGuard } from '../auth/admin.guards';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';

@Controller('/api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Body() createUserDto: CreateUserDto,
  ): Promise<void> {
    try {
      const user: User = await this.userService.create(createUserDto);

      res.status(HttpStatus.OK).json(user);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get()
  async findAll(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const limit: number = Number(req.query.limit);
      const page: number = Number(req.query.page);
      const keyword: string = req.query.value
        ? (req.query.value as string)
        : '';
      const status: string = req.query.status
        ? (req.query.status as string)
        : '';

      const users: Paginate<User[]> = await this.userService.findAll(
        limit,
        page,
        keyword,
        status,
      );

      res.status(HttpStatus.OK).json(users);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get('/:uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const user: User = await this.userService.findOne(uuid);

      res.status(HttpStatus.OK).json(user);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateUserDto: UpdateUserDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const updated: ExecuteResponse = await this.userService.update(
        uuid,
        updateUserDto,
      );

      res.status(HttpStatus.OK).json(updated);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Delete(':uuid')
  async remove(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const deleted: ExecuteResponse = await this.userService.remove(uuid);

      res.status(HttpStatus.OK).json(deleted);
    } catch (error) {
      next(error);
    }
  }
}
