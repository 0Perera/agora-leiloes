import { Global, Module } from '@nestjs/common';
import { Clock } from './clock';

// Instância única: o seed desloca o relógio e todos os services enxergam a mesma hora.
@Global()
@Module({
  providers: [Clock],
  exports: [Clock],
})
export class ClockModule {}
