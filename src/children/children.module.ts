import { Module } from '@nestjs/common';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';
import { ChildRepository } from './repositories/child.repository';

@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService, ChildRepository],
  exports: [ChildrenService, ChildRepository],
})
export class ChildrenModule {}
