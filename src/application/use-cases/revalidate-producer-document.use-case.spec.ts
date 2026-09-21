import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto, testLogger } from '../../testing/test-helpers.js';
import {
  buildCreateProducer,
  noopAudit,
  noopTx,
} from '../../testing/use-case-factories.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { ExternalValidationAuditEntry } from '../services/external-validation-audit.port.js';
import { RevalidateProducerDocumentUseCase } from './revalidate-producer-document.use-case.js';

describe('RevalidateProducerDocumentUseCase', () => {
  const crypto = testCrypto();

  it('promove PENDING → VALIDATED e audita', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    const auditEntries: ExternalValidationAuditEntry[] = [];
    const audit = {
      append: async (entry: ExternalValidationAuditEntry) => {
        auditEntries.push(entry);
      },
    };

    const pendingBrazil: BrazilDataServiceInterface = {
      getCnpjData: async () => ({
        outcome: 'PENDING_EXTERNAL_VALIDATION',
        reason: 'circuit_open',
      }),
      isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
      listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
      getCircuitStats: () => ({
        cnpjOpen: false,
        cityOpen: false,
        citiesOpen: false,
      }),
    };

    const producer = await buildCreateProducer(
      repo,
      pendingBrazil,
      crypto,
      audit,
    ).execute({
      name: 'Empresa',
      document: '11.222.333/0001-81',
    });
    expect(producer.documentValidationStatus).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );

    const activeBrazil: BrazilDataServiceInterface = {
      getCnpjData: async () => ({
        outcome: 'VALIDATED',
        data: {
          cnpj: '11222333000181',
          razaoSocial: 'Empresa LTDA',
          isActive: true,
        },
      }),
      isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
      listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
      getCircuitStats: () => ({
        cnpjOpen: false,
        cityOpen: false,
        citiesOpen: false,
      }),
    };

    const result = await new RevalidateProducerDocumentUseCase(
      repo,
      activeBrazil,
      audit,
      testLogger(),
      noopTx(),
    ).execute(producer.id, 'admin');

    expect(result.previousStatus).toBe('PENDING_EXTERNAL_VALIDATION');
    expect(result.newStatus).toBe('VALIDATED');
    const refreshed = await repo.findById(producer.id);
    expect(refreshed?.documentValidationStatus).toBe('VALIDATED');
    expect(
      auditEntries.some(
        (e) =>
          e.trigger === 'admin' &&
          e.newStatus === 'VALIDATED' &&
          e.resourceType === 'producer_document',
      ),
    ).toBe(true);
  });

  it('persiste REJECTED quando CNPJ 404 na revalidação', async () => {
    const repo = new InMemoryProducerRepository(crypto);
    const audit = noopAudit();
    const pendingBrazil: BrazilDataServiceInterface = {
      getCnpjData: async () => ({
        outcome: 'PENDING_EXTERNAL_VALIDATION',
        reason: 'timeout_or_network',
      }),
      isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
      listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
      getCircuitStats: () => ({
        cnpjOpen: false,
        cityOpen: false,
        citiesOpen: false,
      }),
    };
    const producer = await buildCreateProducer(
      repo,
      pendingBrazil,
      crypto,
      audit,
    ).execute({
      name: 'Empresa',
      document: '11.222.333/0001-81',
    });

    const rejectedBrazil: BrazilDataServiceInterface = {
      getCnpjData: async () => ({
        outcome: 'REJECTED',
        reason: 'CNPJ não encontrado',
      }),
      isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
      listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
      getCircuitStats: () => ({
        cnpjOpen: false,
        cityOpen: false,
        citiesOpen: false,
      }),
    };

    const result = await new RevalidateProducerDocumentUseCase(
      repo,
      rejectedBrazil,
      audit,
      testLogger(),
      noopTx(),
    ).execute(producer.id, 'job');

    expect(result.newStatus).toBe('REJECTED');
    expect((await repo.findById(producer.id))?.documentValidationStatus).toBe(
      'REJECTED',
    );
  });
});
