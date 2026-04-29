import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { ListChildrenQueryDto } from './dto/list-children.query.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@ApiTags('Children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT, UserRole.ADMIN)
@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  listChildren(
    @CurrentUser() currentUser: AuthUser,
    @Query() query: ListChildrenQueryDto,
  ) {
    return this.childrenService.listChildren(currentUser, query);
  }

  @Post()
  createChild(
    @CurrentUser() currentUser: AuthUser,
    @Body() createChildDto: CreateChildDto,
  ) {
    return this.childrenService.createChild(currentUser, createChildDto);
  }

  @Get(':id')
  getChildById(@CurrentUser() currentUser: AuthUser, @Param('id') id: string) {
    return this.childrenService.getChildById(currentUser, id);
  }

  @Put(':id')
  updateChild(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
    @Body() updateChildDto: UpdateChildDto,
  ) {
    return this.childrenService.updateChild(currentUser, id, updateChildDto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  deleteChild(@CurrentUser() currentUser: AuthUser, @Param('id') id: string) {
    return this.childrenService.deleteChild(currentUser, id);
  }
}
