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
}
