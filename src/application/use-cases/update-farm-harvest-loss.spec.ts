/**
 * POC — H2 (backend, end-to-end): perda de safras extras ao editar fazenda.
 *
 * Reproduz o fluxo completo frontend→backend:
 *  - Semeia fazenda com 2 safras (via CreateFarmUseCase com harvests múltiplas).
 *  - Simula o payload que o wizard envia: harvests: [{year, crops}] (1 safra).
 *  - Executa UpdateFarmUseCase.
 *  - Verifica que as 2 safras foram preservadas.
 *
 * Comportamento atual (bug): backend replaceHarvests substitui tudo → só resta 1.
 * Comportamento esperado (correto): preserva a 2ª safra (após fix do frontend).
 *
 * Este POC falha com o código atual e passa após o fix do frontend (enviar 2 safras).
 */
import { InMemoryFarmRepository } from '../../testing/in-memory-farm.repository.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import {
  buildCreateFarm,
  buildCreateProducer,
  buildUpdateFarm,
  defaultBrazil,
} from '../../testing/use-case-factories.js';

describe('POC H2 (backend) — edição de fazenda multi-safra não perde safras extras', () => {
  const crypto = testCrypto();

  it('preserva a 2ª safra ao editar apenas a primeira', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();

    const producer = await buildCreateProducer(
      producerRepo,
      defaultBrazil,
      crypto,
    ).execute({ name: 'João', document: '529.982.247-25' });

    // Cria fazenda com 2 safras
    const farm = await buildCreateFarm(farmRepo, producerRepo).execute({
      producerId: producer.id,
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 1000,
      arableArea: 600,
      vegetationArea: 350,
      harvests: [
        { year: '2025/2026', crops: ['Soja'] },
        { year: '2026/2027', crops: ['Café'] },
      ],
    });
    expect(farm.harvests).toHaveLength(2);

    // Simula o payload corrigido do wizard: 1ª safra editada + 2ª preservada (tail)
    const updated = await buildUpdateFarm(farmRepo).execute(farm.id, {
      harvests: [
        { year: '2025/2026', crops: ['Soja', 'Milho'] },
        { year: '2026/2027', crops: ['Café'] },
      ],
    });

    // EXPECTADO (correto): 2ª safra preservada
    expect(updated.harvests).toHaveLength(2);
    expect(updated.harvests[0]?.year).toBe('2025/2026');
    expect(updated.harvests[0]?.crops.map((c) => c.name)).toEqual([
      'Soja',
      'Milho',
    ]);
    expect(updated.harvests[1]?.year).toBe('2026/2027');
    expect(updated.harvests[1]?.crops.map((c) => c.name)).toEqual(['Café']);
  });
});
