import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

type Constructor<T> = new () => T;

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class DatabaseEnv {
  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
  DATABASE_URL!: string;

  @Transform(toBoolean)
  @IsBoolean()
  DB_SSL!: boolean;
}

export class Env extends DatabaseEnv {
  @IsUrl({ require_tld: false })
  WEB_ORIGIN!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;
}

// As mensagens citam só o nome da variável, nunca o valor (a URL do banco tem senha).
export function validateEnv<T extends object>(
  schema: Constructor<T>,
  config: Record<string, unknown>,
): T {
  const env = plainToInstance(schema, config);
  const errors = validateSync(env);
  if (errors.length > 0) {
    const messages = errors.map((error) =>
      error.value === undefined
        ? `${error.property} is missing`
        : Object.values(error.constraints ?? {}).join('; '),
    );
    throw new Error(`Invalid environment:\n- ${messages.join('\n- ')}`);
  }
  return env;
}
