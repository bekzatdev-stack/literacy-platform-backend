import { Module } from '@nestjs/common';
import { AsyncTasksController } from './async-tasks.controller';
import { AsyncTasksService } from './async-tasks.service';
import { AsyncTasksRepository } from './repositories/async-tasks.repository';

@Module({
  controllers: [AsyncTasksController],
  providers: [AsyncTasksService, AsyncTasksRepository],
})
export class AsyncTasksModule {}
