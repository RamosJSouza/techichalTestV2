import { InactiveCnpjException } from '../../domain/exceptions/inactive-cnpj.exception.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { BrazilDataServiceInterface } from './brazil-data.service.interface.js';
import { resolveCnpjDocumentValidation } from './resolve-cnpj-document-validation.js';

const ACTIVE_CNPJ = '11222333000181';

function stubBrazil(
  getCnpjData: BrazilDataServiceInterface['getCnpjData'],
): BrazilDataServiceInterface {
  return {
    getCnpjData,
    isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
    listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
    getCircuitStats: () => ({
      cnpjOpen: false,
      cityOpen: false,
      citiesOpen: false,
    }),
  };
}

describe('resolveCnpjDocumentValidation', () => {
  const document = CpfCnpj.create(ACTIVE_CNPJ);

  describe('mode strict', () => {
    it('lança InactiveCnpjException em REJECTED', async () => {
      const brazil = stubBrazil(async () => ({
        outcome: 'REJECTED',
        reason: 'cnpj_inactive',
      }));
      await expect(
        resolveCnpjDocumentValidation({
          mode: 'strict',
          brazilData: brazil,
          document,
        }),
      ).rejects.toBeInstanceOf(InactiveCnpjException);
    });

    it('lança quando VALIDATED mas inativo', async () => {
      const brazil = stubBrazil(async () => ({
        outcome: 'VALIDATED',
        data: {
          cnpj: ACTIVE_CNPJ,
          razaoSocial: 'X',
          situacaoCadastral: 'BAIXADA',
          isActive: false,
        },
      }));
      await expect(
        resolveCnpjDocumentValidation({
          mode: 'strict',
          brazilData: brazil,
          document,
        }),
      ).rejects.toBeInstanceOf(InactiveCnpjException);
    });

    it('retorna PENDING sem lançar', async () => {
      const brazil = stubBrazil(async () => ({
        outcome: 'PENDING_EXTERNAL_VALIDATION',
        reason: 'timeout_or_network',
      }));
      const result = await resolveCnpjDocumentValidation({
        mode: 'strict',
        brazilData: brazil,
        document,
      });
      expect(result).toEqual({
        status: 'PENDING_EXTERNAL_VALIDATION',
        pendingReason: 'timeout_or_network',
      });
    });

    it('retorna VALIDATED com razaoSocial', async () => {
      const brazil = stubBrazil(async () => ({
        outcome: 'VALIDATED',
        data: {
          cnpj: ACTIVE_CNPJ,
          razaoSocial: 'Empresa LTDA',
          situacaoCadastral: 'ATIVA',
          isActive: true,
        },
      }));
      const result = await resolveCnpjDocumentValidation({
        mode: 'strict',
        brazilData: brazil,
        document,
      });
      expect(result).toEqual({
        status: 'VALIDATED',
        pendingReason: null,
        razaoSocial: 'Empresa LTDA',
      });
    });
  });

  describe('mode revalidate', () => {
    it('nunca lança; mapeia inativo para REJECTED', async () => {
      const brazil = stubBrazil(async () => ({
        outcome: 'VALIDATED',
        data: {
          cnpj: ACTIVE_CNPJ,
          razaoSocial: 'X',
          situacaoCadastral: 'BAIXADA',
          isActive: false,
        },
      }));
      const result = await resolveCnpjDocumentValidation({
        mode: 'revalidate',
        brazilData: brazil,
        document,
      });
      expect(result).toEqual({
        status: 'REJECTED',
        reason: 'cnpj_inactive',
      });
    });

    it('mapeia PENDING e REJECTED', async () => {
      const pending = stubBrazil(async () => ({
        outcome: 'PENDING_EXTERNAL_VALIDATION',
        reason: 'circuit_open',
      }));
      expect(
        await resolveCnpjDocumentValidation({
          mode: 'revalidate',
          brazilData: pending,
          document,
        }),
      ).toEqual({
        status: 'PENDING_EXTERNAL_VALIDATION',
        reason: 'circuit_open',
      });

      const rejected = stubBrazil(async () => ({
        outcome: 'REJECTED',
        reason: 'not_found',
      }));
      expect(
        await resolveCnpjDocumentValidation({
          mode: 'revalidate',
          brazilData: rejected,
          document,
        }),
      ).toEqual({ status: 'REJECTED', reason: 'not_found' });
    });
  });
});
