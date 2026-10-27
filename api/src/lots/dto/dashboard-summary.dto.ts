export class LiveSummaryDto {
  count!: number;
  currentBidTotal!: number;
}

export class ScheduledSummaryDto {
  count!: number;
  nextStartsAt!: Date | null;
}

export class EndedSummaryDto {
  count!: number;
  withoutBids!: number;
}

export class DashboardSummaryDto {
  live!: LiveSummaryDto;
  scheduled!: ScheduledSummaryDto;
  ended!: EndedSummaryDto;
  // Soma dos comprovantes dos lotes do leiloeiro, não o saldo da carteira (D-039).
  received!: number;
}
