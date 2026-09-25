import { useEffect, useRef, useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { WizardFormValues } from '../shared/schemas/producer.schemas';
import type { FarmResponse, ProducerResponse } from '../shared/types/api';
import { defaultFarm, farmFromResponse } from './producer-form-helpers';

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
  territorialValidationStatus: 'VALIDATED',
  territorialValidationPendingAt: null,
  territorialValidationPendingReason: null,
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
  territorialValidationStatus: 'VALIDATED',
  territorialValidationPendingAt: null,
  territorialValidationPendingReason: null,
  harvests: [{ id: 'h-b', year: '2026/2027', status: 'ACTIVE', crops: ['Milho'] }],
};

function makeProducer(farms: FarmResponse[]): ProducerResponse {
  return {
    id: 'p1',
    name: 'João',
    document: '***.982.247-**',
    esgStatus: 'APPROVED',
    esgCheckedAt: null,
    documentValidationStatus: 'VALIDATED',
    documentValidationPendingAt: null,
    documentValidationPendingReason: null,
    farms,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function useWizardHarness(existing: ProducerResponse | null) {
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const loadedProducerId = useRef<string | null>(null);
  const { reset, getValues, setValue } = useForm<WizardFormValues>({
    defaultValues: {
      name: '',
      document: '00000000000',
      farm: defaultFarm(),
    },
    mode: 'onSubmit',
  });

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
  }, [existing, reset]);

  const loadFarmIntoForm = (farm: FarmResponse): void => {
    setEditingFarmId(farm.id);
    reset({
      name: getValues('name'),
      document: getValues('document'),
      farm: farmFromResponse(farm),
    });
  };

  return { editingFarmId, getValues, setValue, reset, loadFarmIntoForm };
}

describe('POC H1 — reset do form descarta edições ao refetch (validateCar/deleteFarm)', () => {
  it('preserva a fazenda em edição após refetch do mesmo produtor', () => {
    const producerV1 = makeProducer([farmA, farmB]);
    const producerV2 = makeProducer([
      { ...farmA, carStatus: 'ACTIVE' },
      farmB,
    ]);

    const { result, rerender } = renderHook(
      ({ existing }) => useWizardHarness(existing),
      { initialProps: { existing: producerV1 as ProducerResponse | null } },
    );

    expect(result.current.editingFarmId).toBe('farm-a');

    act(() => result.current.loadFarmIntoForm(farmB));
    expect(result.current.editingFarmId).toBe('farm-b');
    expect(result.current.getValues('farm').name).toBe('Fazenda B');

    act(() =>
      result.current.setValue('farm.name', 'Fazenda B editada', {
        shouldValidate: false,
      }),
    );
    expect(result.current.getValues('farm').name).toBe('Fazenda B editada');

    rerender({ existing: producerV2 as ProducerResponse | null });

    expect(result.current.editingFarmId).toBe('farm-b');
    expect(result.current.getValues('farm').name).toBe('Fazenda B editada');
  });
});
