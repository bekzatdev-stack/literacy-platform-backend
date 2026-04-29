import { Module } from '@nestjs/common';
import { UnitRepository } from './repositories/unit.repository';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, UnitRepository],
  exports: [UnitsService, UnitRepository],
})
export class UnitsModule {}
