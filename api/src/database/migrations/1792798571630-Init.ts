import { MigrationInterface } from 'typeorm';

// Vazia de propósito: só prova que as migrations rodam no boot e no deploy.
export class Init1792798571630 implements MigrationInterface {
  public async up(): Promise<void> {}

  public async down(): Promise<void> {}
}
