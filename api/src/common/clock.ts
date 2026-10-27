import { Injectable } from '@nestjs/common';

// Hora de referência das regras: sempre a do servidor, trocada nos testes.
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
