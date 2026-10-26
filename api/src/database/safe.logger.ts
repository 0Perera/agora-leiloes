import { AdvancedConsoleLogger } from 'typeorm';

// Descarta os parâmetros das queries: um erro de query não pode vazar e-mail nem hash de senha no log.
export class SafeLogger extends AdvancedConsoleLogger {
  logQuery(query: string): void {
    super.logQuery(query);
  }

  logQueryError(error: string, query: string): void {
    super.logQueryError(error, query);
  }

  logQuerySlow(time: number, query: string): void {
    super.logQuerySlow(time, query);
  }
}
