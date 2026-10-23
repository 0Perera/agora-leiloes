import { Controller, Get } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';

// Não toca no banco: só diz que a API está de pé (health check do Render).
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
