import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Clock } from '../common/clock';
import { SettlementService } from './settlement.service';

// Maior atraso aceito pelo setTimeout; acima disso o Node dispara na hora.
const MAX_DELAY_MS = 2 ** 31 - 1;
const RETRY_MS = 30_000;

// Um timer só, para o próximo ends_at, sem cron (D-009).
@Injectable()
export class SettlementTimer
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SettlementTimer.name);
  private handle: NodeJS.Timeout | null = null;
  private target: Date | null = null;
  private retry: NodeJS.Timeout | null = null;
  private generation = 0;
  private stopped = false;

  constructor(
    private readonly settlement: SettlementService,
    private readonly clock: Clock,
  ) {}

  // Sem await: o boot não espera a liquidação dos vencidos.
  onApplicationBootstrap(): void {
    void this.run();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.generation += 1;
    this.clear();
    this.cancelRetry();
  }

  refresh(): void {
    void this.schedule();
  }

  private async run(): Promise<void> {
    this.handle = null;
    this.target = null;
    const now = this.clock.now();
    try {
      const ids = await this.settlement.due(now);
      for (const id of ids) await this.settle(id);
    } catch (error) {
      this.logger.error(`due lots lookup failed: ${reason(error)}`);
    }
    // Mesmo instante do due: lote que encerrou durante o laço não some entre as duas consultas.
    await this.schedule(now);
  }

  private async settle(id: number): Promise<void> {
    try {
      await this.settlement.settle(id);
    } catch (error) {
      this.logger.error(`lot ${id} settlement failed: ${reason(error)}`);
    }
  }

  // Só a geração mais recente arma: uma resposta antiga não desfaz uma prorrogação.
  private async schedule(from?: Date): Promise<void> {
    if (this.stopped) return;
    this.generation += 1;
    const generation = this.generation;
    try {
      const next = await this.settlement.next(from ?? this.clock.now());
      if (generation !== this.generation) return;
      this.cancelRetry();
      this.arm(next);
    } catch (error) {
      this.logger.error(`next lot lookup failed: ${reason(error)}`);
      if (generation === this.generation) this.retryLater();
    }
  }

  // Timer à parte: o disparo já armado continua valendo enquanto o banco não responde.
  private retryLater(): void {
    this.cancelRetry();
    this.retry = setTimeout(() => {
      this.retry = null;
      void this.schedule();
    }, RETRY_MS);
  }

  private cancelRetry(): void {
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
  }

  private arm(next: Date | null): void {
    const now = this.clock.now();
    // Disparo já vencido ainda na fila: ele liquida e recalcula; cancelar pularia o lote.
    if (this.target && this.target <= now) return;
    this.clear();
    if (!next) return;
    const delay = next.getTime() - now.getTime();
    const bounded = Math.min(Math.max(delay, 0), MAX_DELAY_MS);
    this.target = new Date(now.getTime() + bounded);
    this.handle = setTimeout(() => void this.run(), bounded);
  }

  private clear(): void {
    if (this.handle) clearTimeout(this.handle);
    this.handle = null;
    this.target = null;
  }
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}
