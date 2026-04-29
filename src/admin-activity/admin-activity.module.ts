import { Global, Module } from '@nestjs/common';
import { AdminActivityService } from './admin-activity.service';

@Global()
@Module({
  providers: [AdminActivityService],
  exports: [AdminActivityService],
})
export class AdminActivityModule {}
