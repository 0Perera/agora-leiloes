import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('usa a inicial do primeiro e do último nome', () => {
    expect(initialsOf('ana maria souza')).toBe('AS');
  });

  it('usa só uma letra quando o nome tem uma palavra', () => {
    expect(initialsOf('Bia')).toBe('B');
  });
});
