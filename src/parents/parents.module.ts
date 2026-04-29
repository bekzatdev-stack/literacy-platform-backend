import { Module } from '@nestjs/common';
import { ChildrenModule } from '../children/children.module';
import { UserRepository } from '../auth/repositories/user.repository';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';

@Module({
  imports: [ChildrenModule],
  controllers: [ParentsController],
  providers: [ParentsService, UserRepository],
})
export class ParentsModule {}
