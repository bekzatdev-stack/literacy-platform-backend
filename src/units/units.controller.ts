import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units.query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Roles(UserRole.PARENT, UserRole.ADMIN)
  @Get()
  listUnits(
    @CurrentUser() currentUser: AuthUser,
    @Query() query: ListUnitsQueryDto,
  ) {
    return this.unitsService.listUnits(currentUser, query);
  }

  @Roles(UserRole.PARENT, UserRole.ADMIN)
  @Get(':id')
  getUnitById(@Param('id') id: string) {
    return this.unitsService.getUnitById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  createUnit(
    @CurrentUser() currentUser: AuthUser,
    @Body() createUnitDto: CreateUnitDto,
  ) {
    return this.unitsService.createUnit(currentUser, createUnitDto);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id')
  updateUnit(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ) {
    return this.unitsService.updateUnit(currentUser, id, updateUnitDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deleteUnit(@CurrentUser() currentUser: AuthUser, @Param('id') id: string) {
    return this.unitsService.deleteUnit(currentUser, id);
  }
}
