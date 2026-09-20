import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { InvalidDomainValueException } from '../../domain/exceptions/invalid-domain-value.exception.js';
import { InvalidFarmAreaException } from '../../domain/exceptions/invalid-farm-area.exception.js';

type PgLikeError = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  cause?: unknown;
};

export type PgIntegrityContext = 'document' | 'generic';

function readPgField(error: unknown, field: 'code' | 'constraint'): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const direct = error as PgLikeError;
  if (field === 'code' && typeof direct.code === 'string') {
    return direct.code;
  }
  if (field === 'constraint') {
    if (typeof direct.constraint === 'string') {
      return direct.constraint;
    }
    if (typeof direct.constraint_name === 'string') {
      return direct.constraint_name;
    }
  }
  if (direct.cause) {
    return readPgField(direct.cause, field);
  }
  return undefined;
}

function isAreaConstraint(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('area') ||
    n.includes('arable') ||
    n.includes('vegetation') ||
    n.includes('total_area')
  );
}

function isStatusOrUfConstraint(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes('status') ||
    n.includes('state_uf') ||
    n.includes('state_len') ||
    n.includes('_uf_')
  );
}

/**
 * Converte violações PostgreSQL de integridade em exceções de domínio.
 * - 23505 unique → ConflictException (409)
 * - 23514 check (área) → InvalidFarmAreaException (400)
 * - 23514 check (UF/status) → InvalidDomainValueException (400)
 */
export function mapPgIntegrityError(
  error: unknown,
  ctx: PgIntegrityContext = 'generic',
): never {
  const code = readPgField(error, 'code');
  const constraint = readPgField(error, 'constraint') ?? '';

  if (code === '23505') {
    throw new ConflictException(
      ctx === 'document'
        ? 'Já existe produtor com este documento.'
        : 'Já existe registro com este valor único.',
    );
  }

  if (code === '23514') {
    if (isAreaConstraint(constraint)) {
      throw new InvalidFarmAreaException(
        'Áreas da fazenda violam a invariante (total > 0, parcelas ≥ 0, soma ≤ total).',
      );
    }
    if (isStatusOrUfConstraint(constraint)) {
      throw new InvalidDomainValueException(
        'Valor de status ou UF inválido para persistência.',
      );
    }
    throw new InvalidDomainValueException(
      'Violação de restrição de integridade no banco.',
    );
  }

  throw error;
}

/** @deprecated Prefer mapPgIntegrityError — mantido para callers existentes. */
export function rethrowUniqueAsConflict(
  error: unknown,
  message = 'Já existe registro com este valor único.',
): never {
  const code = readPgField(error, 'code');
  if (code === '23505') {
    throw new ConflictException(message);
  }
  mapPgIntegrityError(error, 'generic');
}
