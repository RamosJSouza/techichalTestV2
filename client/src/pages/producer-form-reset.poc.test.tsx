/**
 * POC — H1: reset do form descarta edições ao validar CAR / deletar fazenda.
 *
 * Cenário reproduzido (espelha a lógica de ProducerFormPage.tsx:213-227):
 *  1. Carrega produtor com 2 fazendas (farms[0]=A, farms[1]=B).
 *  2. Usuário clica em farms[1] (loadFarmIntoForm) → form mostra B.
 *  3. Usuário edita o nome de B (digita "B editado").
 *  4. Clica em "Validar CAR" → validateFarmCar invalida ['Producers']
 *     → getProducer refaz → `existing` recebe NOVA referência (mesmo id).
 *  5. useEffect([existing, reset]) dispara → reset() para farms[0]=A.
 *
 * Comportamento esperado (correto): form continua mostrando B editada.
 * Comportamento atual (bug): form volta para A, edições de B perdidas.
 *
 * Este POC falha com o código atual e passa após o fix (guardar loadedProducerId).
 */
import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import type { FarmResponse, ProducerResponse } from '../shared/types/api';
import {
  farmFromResponse,
  defaultFarm,
} from './producer-form-helpers';
import type { WizardFormValues } from '../shared/schemas/producer.schemas';

const farmA: FarmResponse = {
  id: 'farm-a',
  producerId: 'p1',
  name: 'Fazenda A',
  city: 'Ribeirão Preto',
  state: 'SP',
  totalArea: 100,
  arableArea: 50,
  vegetationArea: 20,
  carNumber: null,
  carStatus: null,
  climateRiskScore: null,
  harvests: [{ id: 'h-a', year: '2025/2026', status: 'ACTIVE', crops: ['Soja'] }],
};

const farmB: FarmResponse = {
  id: 'farm-b',
  producerId: 'p1',
  name: 'Fazenda B',
  city: 'Franca',
  state: 'SP',
  totalArea: 200,
  arableArea: 100,
  vegetationArea: 40,
  carNumber: 'SP-123-ABC',
  carStatus: null,
  climateRiskScore: null,
  harvests: [{ id: 'h-b', year: '2026/2027', status: 'ACTIVE', crops: ['Milho'] }],
};

function makeProducer(farms: FarmResponse[]): ProducerResponse {
  return {
    id: 'p1',
    name: 'João',
    document: '***.982.247-**',
    esgStatus: 'APPROVED',
    esgCheckedAt: null,
    farms,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/**
 * Harness que replica o useEffect de ProducerFormPage.tsx (com guard loadedProducerId).
 * `existingRef` é controlado externamente para simular o refetch do RTK Query.
 */
function useWizardHarness(existing: ProducerResponse | null) {
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['Soja']);
  const loadedProducerId = useRef<string | null>(null);
  const { reset, getValues, setValue } = useForm<WizardFormValues>({
    defaultValues: {
      name: '',
      document: '00000000000',
      farm: defaultFarm(),
    },
    mode: 'onSubmit',
  });

  // === Espelho do useEffect corrigido (guard contra refetch do mesmo produtor) ===
  useEffect(() => {
    if (!existing) {
      loadedProducerId.current = null;
      return;
    }
    if (loadedProducerId.current === existing.id) {
      return;
    }
    loadedProducerId.current = existing.id;
    const farm = existing.farms[0];
    setEditingFarmId(farm?.id ?? null);
    reset({
      name: existing.name,
      document: '00000000000',
      farm: farm ? farmFromResponse(farm) : defaultFarm(),
    });
    if (farm?.harvests[0]?.crops) {
      setSelectedCrops([...farm.harvests[0].crops]);
    }
  }, [existing, reset]);

  // loadFarmIntoForm (ProducerFormPage.tsx:258-271)
  const loadFarmIntoForm = (farm: FarmResponse): void => {
    setEditingFarmId(farm.id);
    reset({
      name: getValues('name'),
      document: getValues('document'),
      farm: farmFromResponse(farm),
    });
    setSelectedCrops(
      farm.harvests[0]?.crops?.length ? [...farm.harvests[0].crops] : ['Soja'],
    );
  };

  return { editingFarmId, selectedCrops, getValues, setValue, reset, loadFarmIntoForm };
}

describe('POC H1 — reset do form descarta edições ao refetch (validateCar/deleteFarm)', () => {
  it('preserva a fazenda em edição após refetch do mesmo produtor', () => {
    const producerV1 = makeProducer([farmA, farmB]);
    // Simula refetch: mesmo id, nova referência (carStatus mudou)
    const producerV2 = makeProducer([
      { ...farmA, carStatus: 'ACTIVE' },
      farmB,
    ]);

    const { result, rerender } = renderHook(
      ({ existing }) => useWizardHarness(existing),
      { initialProps: { existing: producerV1 as ProducerResponse | null } },
    );

    // 1. Carga inicial → editingFarmId = farmA
    expect(result.current.editingFarmId).toBe('farm-a');

    // 2. Usuário clica em farms[1]=B
    act(() => result.current.loadFarmIntoForm(farmB));
    expect(result.current.editingFarmId).toBe('farm-b');
    expect(result.current.getValues('farm').name).toBe('Fazenda B');

    // 3. Usuário edita o nome de B
    act(() =>
      result.current.setValue('farm.name', 'Fazenda B editada', {
        shouldValidate: false,
      }),
    );
    expect(result.current.getValues('farm').name).toBe('Fazenda B editada');

    // 4. validateCar invalida ['Producers'] → getProducer refaz → nova ref
    rerender({ existing: producerV2 as ProducerResponse | null });

    // 5. EXPECTADO (correto): form continua em B editada
    expect(result.current.editingFarmId).toBe('farm-b'); // ← FAIL atual: 'farm-a'
    expect(result.current.getValues('farm').name).toBe('Fazenda B editada'); // ← FAIL atual: 'Fazenda A'
  });
});
