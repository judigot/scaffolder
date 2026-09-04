import { Controller, Get } from '@nestjs/common';

interface IHealthResponse {
  status: 'healthy';
  timestamp: string;
}

@Controller()
export class HealthController {
  @Get('health')
  health(): IHealthResponse {
    const response: IHealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
    return response;
  }
}
