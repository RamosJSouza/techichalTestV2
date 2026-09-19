import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testAgTechMocks, testCrypto } from '../../testing/test-helpers.js';
import { buildCreateProducer } from '../../testing/use-case-factories.js';
import { GetProducerEsgComplianceUseCase } from './get-producer-esg-compliance.use-case.js';

describe('GetProducerEsgComplianceUseCase', () => {
  it('retorna parecer ESG do produtor', async () => {
    const crypto = testCrypto();
    const repo = new InMemoryProducerRepository(crypto);
    const producer = await buildCreateProducer(repo).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const result = await new GetProducerEsgComplianceUseCase(
      repo,
      testAgTechMocks().socio,
    ).execute(producer.id);

    expect(result.producerId).toBe(producer.id);
    expect(result.esgStatus).toBe('APPROVED');
    expect(result.hasIbamaEmbargo).toBe(false);
  });
});
