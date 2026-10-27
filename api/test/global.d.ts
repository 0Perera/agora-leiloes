import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  var postgres: StartedPostgreSqlContainer | undefined;
}
