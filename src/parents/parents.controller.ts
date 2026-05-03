import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentsService } from './parents.service';

@ApiTags('Parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT, UserRole.ADMIN)
@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get(':id')
  getParentProfile(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
  ) {
    return this.parentsService.getParentProfile(currentUser, id);
  }

  @Put(':id')
  updateParentProfile(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentsService.updateParentProfile(
      currentUser,
      id,
      updateParentDto,
    );
  }

  @Get(':id/children')
  getParentChildren(
    @CurrentUser() currentUser: AuthUser,
    @Param('id') id: string,
  ) {
    return this.parentsService.getParentChildren(currentUser, id);
  }
}
