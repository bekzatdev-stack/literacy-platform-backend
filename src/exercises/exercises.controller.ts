import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('Exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Roles(UserRole.PARENT, UserRole.ADMIN)
  @Get('lessons/:lessonId/exercises')
  listExercises(
    @CurrentUser() currentUser: AuthUser,
    @Param('lessonId') lessonId: string,
  ) {
    return this.exercisesService.listExercises(currentUser, lessonId);
  }

  @Roles(UserRole.ADMIN)
  @Post('lessons/:lessonId/exercises')
  createExercise(
    @CurrentUser() currentUser: AuthUser,
    @Param('lessonId') lessonId: string,
    @Body() createExerciseDto: CreateExerciseDto,
  ) {
    return this.exercisesService.createExercise(
      currentUser,
      lessonId,
      createExerciseDto,
    );
  }

  @Roles(UserRole.ADMIN)
  @Put('lessons/:lessonId/exercises/:exerciseId')
  updateExercise(
    @CurrentUser() currentUser: AuthUser,
    @Param('exerciseId') exerciseId: string,
    @Body() updateExerciseDto: UpdateExerciseDto,
  ) {
    return this.exercisesService.updateExercise(
      currentUser,
      exerciseId,
      updateExerciseDto,
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete('lessons/:lessonId/exercises/:exerciseId')
  deleteExercise(
    @CurrentUser() currentUser: AuthUser,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.exercisesService.deleteExercise(currentUser, exerciseId);
  }
}
