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
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ListLessonsQueryDto } from './dto/list-lessons.query.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonsService } from './lessons.service';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Roles(UserRole.PARENT, UserRole.ADMIN)
  @Get()
  listLessons(
    @CurrentUser() currentUser: AuthUser,
    @Query() query: ListLessonsQueryDto,
  ) {
    return this.lessonsService.listLessons(currentUser, query);
  }

  @Roles(UserRole.PARENT, UserRole.ADMIN)
  @Get(':id')
  getLessonById(@CurrentUser() currentUser: AuthUser, @Param('id') id: string) {
    return this.lessonsService.getAccessibleLessonById(currentUser, id);
  }

  @Roles(UserRole.ADMIN)
  @Post('unit/:unitId')
  createLesson(
    @CurrentUser() currentUser: AuthUser,
    @Param('unitId') unitId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.lessonsService.createLesson(
      currentUser,
      unitId,
      createLessonDto,
    );
  }

  @Roles(UserRole.ADMIN)
  @Put(':id')
  updateLesson(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonsService.updateLesson(currentUser, id, updateLessonDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deleteLesson(@CurrentUser() currentUser: AuthUser, @Param('id') id: string) {
    return this.lessonsService.deleteLesson(currentUser, id);
  }
}
