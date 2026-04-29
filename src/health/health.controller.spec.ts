import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('should return API health information', () => {
    const result = healthController.getHealth();

    expect(result.status).toBe('ok');
    expect(result.message).toBe('Literacy Learning Platform API is running');
    expect(result.timestamp).toEqual(expect.any(String));
  });
});
