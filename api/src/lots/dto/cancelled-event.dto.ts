export class CancelledEventDto {
  cancelledAt!: Date;
}

// Lista fechada: o stream é público, nada além destes campos pode sair nele.
export function toCancelledEvent(event: CancelledEventDto): CancelledEventDto {
  return { cancelledAt: event.cancelledAt };
}
