import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DemoAccountsBox } from './demo-accounts-box';

type ButtonProps = { onClick: () => void; children: ReactNode };

function isElement(
  node: ReactNode,
): node is ReactElement<{ children?: ReactNode }> {
  return typeof node === 'object' && node !== null && 'props' in node;
}

function buttons(node: ReactNode): ReactElement<ButtonProps>[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isElement(node)) return [];
  if (node.type === 'button') return [node as ReactElement<ButtonProps>];
  return buttons(node.props.children);
}

function label(button: ReactElement<ButtonProps>): string {
  const [name] = button.props.children as ReactElement<{ children: string }>[];
  return name.props.children;
}

describe('DemoAccountsBox', () => {
  it('botão de conta de demonstração preenche e-mail e senha', () => {
    const onPick = vi.fn();
    const box = DemoAccountsBox({ onPick });

    buttons(box)
      .find((button) => label(button) === 'Geovanna')
      ?.props.onClick();

    expect(onPick).toHaveBeenCalledWith({
      email: 'geovanna@agora.dev',
      password: 'Agora2026!',
    });
  });
});
