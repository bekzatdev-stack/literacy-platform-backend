import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { ProgressService } from './progress.service';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT, UserRole.ADMIN)
@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('exercises/:id/submit')
  submitExercise(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
    @Body() submitExerciseDto: SubmitExerciseDto,
  ) {
    return this.progressService.submitExercise(
      currentUser,
      id,
      submitExerciseDto,
    );
  }

  @Post('lessons/:id/complete')
  completeLesson(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
    @Body() completeLessonDto: CompleteLessonDto,
  ) {
    return this.progressService.completeLesson(
      currentUser,
      id,
      completeLessonDto,
    );
  }

  @Get('children/:id/progress')
  getChildProgress(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
  ) {
    return this.progressService.getChildProgressHistory(currentUser, id);
  }

  @Get('children/:id/badges')
  getChildBadges(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
  ) {
    return this.progressService.getChildBadges(currentUser, id);
  }
}
