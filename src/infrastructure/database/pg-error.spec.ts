import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { InvalidDomainValueException } from '../../domain/exceptions/invalid-domain-value.exception.js';
import { InvalidFarmAreaException } from '../../domain/exceptions/invalid-farm-area.exception.js';
import { mapPgIntegrityError, rethrowUniqueAsConflict } from './pg-error.js';

describe('mapPgIntegrityError', () => {
  it('converte 23505 em ConflictException (documento)', () => {
    expect(() => mapPgIntegrityError({ code: '23505' }, 'document')).toThrow(
      ConflictException,
    );
    try {
      mapPgIntegrityError({ code: '23505' }, 'document');
    } catch (error) {
      expect((error as ConflictException).message).toContain('documento');
    }
  });

  it('converte 23514 de área em InvalidFarmAreaException', () => {
    expect(() =>
      mapPgIntegrityError({
        code: '23514',
        constraint: 'farms_area_sum_chk',
      }),
    ).toThrow(InvalidFarmAreaException);
  });

  it('converte 23514 de UF/status em InvalidDomainValueException', () => {
    expect(() =>
      mapPgIntegrityError({
        code: '23514',
        constraint: 'farms_state_uf_chk',
      }),
    ).toThrow(InvalidDomainValueException);
    expect(() =>
      mapPgIntegrityError({
        code: '23514',
        constraint: 'harvests_status_chk',
      }),
    ).toThrow(InvalidDomainValueException);
  });

  it('lê code/constraint aninhados em cause', () => {
    expect(() =>
      mapPgIntegrityError({
        cause: { code: '23514', constraint_name: 'farms_arable_area_nonneg_chk' },
      }),
    ).toThrow(InvalidFarmAreaException);
  });

  it('relança erros sem código de integridade', () => {
    const original = new Error('boom');
    expect(() => mapPgIntegrityError(original)).toThrow(original);
  });
});

describe('rethrowUniqueAsConflict', () => {
  it('converte código 23505 em ConflictException', () => {
    expect(() =>
      rethrowUniqueAsConflict({ code: '23505' }, 'duplicado'),
    ).toThrow(ConflictException);
  });
});
