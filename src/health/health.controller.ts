import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      message: 'Literacy Learning Platform API is running',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
