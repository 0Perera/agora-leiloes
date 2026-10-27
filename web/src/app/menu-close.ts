export type CloseReason = 'escape' | 'outside';

// clique fora mantém o foco onde a pessoa clicou; só o Esc devolve o foco ao monograma
export function restoresFocus(reason: CloseReason): boolean {
  return reason === 'escape';
}
