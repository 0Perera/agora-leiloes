export class SettledEventDto {
  alias!: string | null;
  amount!: number | null;
}

// Lista fechada: o stream é público, nada além destes campos pode sair nele.
export function toSettledEvent(result: SettledEventDto): SettledEventDto {
  return { alias: result.alias, amount: result.amount };
}
