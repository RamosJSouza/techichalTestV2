import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  farmAreasSchema,
  wizardSchema,
  wizardStep0EditSchema,
  wizardStep0Schema,
  type FarmAreasFormValues,
  type WizardFormValues,
} from '../shared/schemas/producer.schemas';
import {
  useCreateFarmMutation,
  useCreateProducerMutation,
  useDeleteFarmMutation,
  useGetProducerQuery,
  useUpdateFarmMutation,
  useUpdateProducerMutation,
  useValidateFarmCarMutation,
} from '../store/api/apiSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import { setWizardStep, showToast } from '../store/slices/uiSlice';
import { Button } from '../components/atoms/Button';
import { TextInput } from '../components/atoms/TextInput';
import { CropChip } from '../components/molecules/CropChip';
import { ValidationBanner } from '../components/molecules/ValidationBanner';
import { Spinner } from '../components/atoms/Spinner';
import type { FarmResponse } from '../shared/types/api';
import {
  defaultFarm,
  emptyToUndefined,
  farmFromResponse,
  normalizeCarNumber,
  toFarmApiPayload,
  toFiniteNumber,
} from './producer-form-helpers';

const CROPS = ['Soja', 'Milho', 'Café', 'Algodão', 'Cana'] as const;

const Card = styled.form`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.level1};
`;

const Steps = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`;

const Step = styled.div<{ $active: boolean }>`
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.border};
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const FarmList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FarmItem = styled.li<{ $active: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.softTint : theme.colors.canvas};
  cursor: pointer;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

export function ProducerFormPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const step = useAppSelector((s) => s.ui.wizardStep);
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['Soja']);
  const [step0Error, setStep0Error] = useState<string | null>(null);
  const [draftFarms, setDraftFarms] = useState<FarmAreasFormValues[]>([]);
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const [isAddingFarm, setIsAddingFarm] = useState(false);
  const loadedProducerId = useRef<string | null>(null);

  const { data: existing, isLoading: loadingExisting } = useGetProducerQuery(
    id ?? '',
    { skip: !id },
  );
  const [createProducer, { isLoading: creating }] = useCreateProducerMutation();
  const [updateProducer, { isLoading: updating }] = useUpdateProducerMutation();
  const [updateFarm, { isLoading: updatingFarm }] = useUpdateFarmMutation();
  const [createFarm, { isLoading: creatingFarm }] = useCreateFarmMutation();
  const [deleteFarm, { isLoading: deletingFarm }] = useDeleteFarmMutation();
  const [validateCar, { isLoading: validatingCar }] =
    useValidateFarmCarMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: '',
      document: isEdit ? '00000000000' : '',
      farm: defaultFarm(),
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    dispatch(setWizardStep(0));
  }, [dispatch]);

  useEffect(() => {
    if (!existing) {
      loadedProducerId.current = null;
      return;
    }
    // Ignora refetch de cache do mesmo produtor (ex.: após validateCar/deleteFarm)
    // para não descartar edições em andamento nem trocar de fazenda ativa.
    if (loadedProducerId.current === existing.id) {
      return;
    }
    loadedProducerId.current = existing.id;
    const farm = existing.farms[0];
    setEditingFarmId(farm?.id ?? null);
    setIsAddingFarm(!farm);
    reset({
      name: existing.name,
      document: '00000000000',
      farm: farm ? farmFromResponse(farm) : defaultFarm(),
    });
    if (farm?.harvests[0]?.crops) {
      setSelectedCrops([...farm.harvests[0].crops]);
    }
  }, [existing, reset]);

  const totalArea = watch('farm.totalArea');
  const arableArea = watch('farm.arableArea');
  const vegetationArea = watch('farm.vegetationArea');
  const harvestYear = watch('farm.harvests.0.year');

  const areaValid = useMemo(() => {
    const total = toFiniteNumber(totalArea);
    const arable = toFiniteNumber(arableArea);
    const vegetation = toFiniteNumber(vegetationArea);
    if (total === null || arable === null || vegetation === null) {
      return false;
    }
    return farmAreasSchema.safeParse({
      name: 'x',
      city: 'x',
      state: 'SP',
      totalArea: total,
      arableArea: arable,
      vegetationArea: vegetation,
    }).success;
  }, [totalArea, arableArea, vegetationArea]);

  const saving =
    creating || updating || updatingFarm || creatingFarm || deletingFarm;

  if (isEdit && loadingExisting) {
    return <Spinner />;
  }

  const loadFarmIntoForm = (farm: FarmResponse): void => {
    setIsAddingFarm(false);
    setEditingFarmId(farm.id);
    reset({
      name: getValues('name'),
      document: getValues('document'),
      farm: farmFromResponse(farm),
    });
    setSelectedCrops(
      farm.harvests[0]?.crops?.length
        ? [...farm.harvests[0].crops]
        : ['Soja'],
    );
  };

  const startNewFarm = (): void => {
    setIsAddingFarm(true);
    setEditingFarmId(null);
    setValue('farm', defaultFarm());
    setSelectedCrops(['Soja']);
  };

  const goToStep1 = (): void => {
    const values = getValues();
    const parsed = isEdit
      ? wizardStep0EditSchema.safeParse({ name: values.name })
      : wizardStep0Schema.safeParse({
          name: values.name,
          document: values.document,
        });

    clearErrors(['name', 'document']);
    setStep0Error(null);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'name' || key === 'document') {
          setError(key, { type: 'manual', message: issue.message });
        }
      }
      setStep0Error('Corrija os campos do produtor antes de continuar.');
      return;
    }

    dispatch(setWizardStep(1));
  };

  const onInvalid = (formErrors: typeof errors): void => {
    if (formErrors.name || formErrors.document) {
      dispatch(setWizardStep(0));
      setStep0Error('Corrija os campos do produtor antes de salvar.');
    }
  };

  const queueCurrentFarm = (): boolean => {
    const values = getValues();
    const payload = toFarmApiPayload(values.farm, selectedCrops);
    const parsed = farmAreasSchema.safeParse(payload);
    if (!parsed.success) {
      dispatch(
        showToast({
          message: 'Preencha a fazenda atual antes de adicionar outra.',
          variant: 'error',
        }),
      );
      return false;
    }
    setDraftFarms((prev) => [...prev, parsed.data]);
    setValue('farm', defaultFarm());
    setSelectedCrops(['Soja']);
    return true;
  };

  const onSubmit = handleSubmit(async (values) => {
    const current = toFarmApiPayload(values.farm, selectedCrops);
    const parsedCurrent = farmAreasSchema.safeParse(current);
    if (!parsedCurrent.success) {
      return;
    }

    try {
      if (isEdit && id) {
        await updateProducer({
          id,
          body: { name: values.name },
        }).unwrap();

        if (isAddingFarm || !editingFarmId) {
          await createFarm({
            producerId: id,
            ...parsedCurrent.data,
            carNumber: normalizeCarNumber(parsedCurrent.data.carNumber),
          }).unwrap();
        } else {
          await updateFarm({
            id: editingFarmId,
            body: {
              name: parsedCurrent.data.name,
              city: parsedCurrent.data.city,
              state: parsedCurrent.data.state,
              totalArea: parsedCurrent.data.totalArea,
              arableArea: parsedCurrent.data.arableArea,
              vegetationArea: parsedCurrent.data.vegetationArea,
              carNumber:
                typeof parsedCurrent.data.carNumber === 'string'
                  ? parsedCurrent.data.carNumber
                  : null,
              harvests: parsedCurrent.data.harvests,
            },
          }).unwrap();
        }
      } else {
        const farms = [...draftFarms, parsedCurrent.data];
        await createProducer({
          name: values.name,
          document: values.document,
          farms: farms.map((f) => ({
            ...f,
            carNumber: normalizeCarNumber(f.carNumber),
          })),
        }).unwrap();
      }
      dispatch(showToast({ message: 'Salvo com sucesso.', variant: 'success' }));
      navigate('/producers');
    } catch {
    }
  }, onInvalid);

  const handleDeleteFarm = async (farmId: string): Promise<void> => {
    if (!window.confirm('Remover esta fazenda (soft delete)?')) {
      return;
    }
    try {
      await deleteFarm(farmId).unwrap();
      dispatch(
        showToast({ message: 'Fazenda removida.', variant: 'success' }),
      );
      if (editingFarmId === farmId) {
        startNewFarm();
      }
    } catch {
    }
  };

  const handleValidateCar = async (): Promise<void> => {
    if (!editingFarmId) {
      dispatch(
        showToast({
          message: 'Salve a fazenda antes de validar o CAR.',
          variant: 'info',
        }),
      );
      return;
    }
    try {
      await validateCar(editingFarmId).unwrap();
      dispatch(
        showToast({
          message: 'Auditoria CAR concluída.',
          variant: 'success',
        }),
      );
    } catch {
    }
  };

  return (
    <Card onSubmit={onSubmit} noValidate>
      <h1>{isEdit ? 'Editar produtor' : 'Novo produtor & fazenda'}</h1>
      <p style={{ color: '#616161', marginTop: 0 }}>
        Preencha o produtor e uma ou mais fazendas (áreas, safra, CAR).
      </p>
      <Steps>
        <Step $active={step === 0} />
        <Step $active={step === 1} />
      </Steps>

      {step === 0 ? (
        <>
          <TextInput
            label="Nome do produtor"
            error={errors.name?.message}
            {...register('name')}
          />
          {!isEdit ? (
            <TextInput
              label="CPF ou CNPJ"
              error={errors.document?.message}
              {...register('document')}
            />
          ) : (
            <ValidationBanner
              valid
              message="Documento permanece mascarado nas leituras; neste fluxo editamos o nome e as fazendas."
            />
          )}
          {step0Error ? (
            <ValidationBanner valid={false} message={step0Error} />
          ) : null}
          <Button type="button" onClick={goToStep1}>
            Continuar
          </Button>
        </>
      ) : (
        <>
          {isEdit && existing ? (
            <>
              <strong>Fazendas do produtor</strong>
              <FarmList>
                {existing.farms.map((farm) => (
                  <FarmItem
                    key={farm.id}
                    $active={!isAddingFarm && editingFarmId === farm.id}
                    onClick={() => loadFarmIntoForm(farm)}
                  >
                    <span>
                      {farm.name} — {farm.city}/{farm.state}
                      {farm.carStatus ? ` · CAR ${farm.carStatus}` : ''}
                    </span>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteFarm(farm.id);
                      }}
                    >
                      Excluir
                    </Button>
                  </FarmItem>
                ))}
              </FarmList>
              <Button type="button" variant="secondary" onClick={startNewFarm}>
                + Nova fazenda
              </Button>
            </>
          ) : null}

          {!isEdit && draftFarms.length > 0 ? (
            <>
              <strong>Fazendas na fila ({draftFarms.length})</strong>
              <FarmList>
                {draftFarms.map((farm, index) => (
                  <FarmItem key={`${farm.name}-${index}`} $active={false}>
                    <span>
                      {farm.name || `Fazenda ${index + 1}`} — {farm.city}/
                      {farm.state}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setDraftFarms((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remover
                    </Button>
                  </FarmItem>
                ))}
              </FarmList>
            </>
          ) : null}

          <TextInput
            label="Nome da fazenda"
            error={errors.farm?.name?.message}
            {...register('farm.name')}
          />
          <TextInput
            label="Cidade"
            error={errors.farm?.city?.message}
            {...register('farm.city')}
          />
          <TextInput
            label="UF (2 letras)"
            maxLength={2}
            error={errors.farm?.state?.message}
            {...register('farm.state')}
          />
          <TextInput
            label="Área total (ha)"
            type="number"
            step="0.01"
            error={errors.farm?.totalArea?.message}
            {...register('farm.totalArea', { setValueAs: emptyToUndefined })}
          />
          <TextInput
            label="Área agricultável (ha)"
            type="number"
            step="0.01"
            error={errors.farm?.arableArea?.message}
            {...register('farm.arableArea', { setValueAs: emptyToUndefined })}
          />
          <TextInput
            label="Área de vegetação (ha)"
            type="number"
            step="0.01"
            error={errors.farm?.vegetationArea?.message}
            {...register('farm.vegetationArea', {
              setValueAs: emptyToUndefined,
            })}
          />
          <ValidationBanner
            valid={areaValid}
            message={
              areaValid
                ? 'Invariante de área satisfeita (agricultável + vegetação ≤ total).'
                : 'Área agricultável + vegetação deve ser ≤ área total.'
            }
          />

          <TextInput
            label="Número do CAR (opcional)"
            placeholder="UF-XXXXXXX-XXXXXXXX…"
            error={errors.farm?.carNumber?.message}
            {...register('farm.carNumber', {
              setValueAs: (v) =>
                v === '' || v === null || v === undefined
                  ? undefined
                  : String(v).trim(),
            })}
          />
          {isEdit && editingFarmId ? (
            <Button
              type="button"
              variant="secondary"
              disabled={validatingCar}
              onClick={() => void handleValidateCar()}
            >
              {validatingCar ? 'Validando CAR…' : 'Validar CAR (SICAR)'}
            </Button>
          ) : null}

          <TextInput
            label="Ano da safra"
            placeholder="2025/2026"
            value={harvestYear ?? ''}
            onChange={(e) => {
              setValue(
                'farm.harvests',
                [
                  {
                    year: e.target.value,
                    crops: selectedCrops.length ? selectedCrops : ['Soja'],
                  },
                ],
                { shouldValidate: true },
              );
            }}
          />

          <div>
            <strong>Culturas da safra</strong>
            <ChipRow>
              {CROPS.map((crop) => (
                <CropChip
                  key={crop}
                  label={crop}
                  selected={selectedCrops.includes(crop)}
                  onToggle={() => {
                    setSelectedCrops((prev) => {
                      const next = prev.includes(crop)
                        ? prev.filter((c) => c !== crop)
                        : [...prev, crop];
                      const year =
                        getValues('farm.harvests.0.year') || '2025/2026';
                      setValue('farm.harvests', [
                        {
                          year,
                          crops: next.length ? next : ['Soja'],
                        },
                      ]);
                      return next;
                    });
                  }}
                />
              ))}
            </ChipRow>
          </div>

          <Row>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep0Error(null);
                dispatch(setWizardStep(0));
              }}
            >
              Voltar
            </Button>
            {!isEdit ? (
              <Button
                type="button"
                variant="secondary"
                disabled={!areaValid}
                onClick={() => {
                  queueCurrentFarm();
                }}
              >
                Adicionar fazenda à fila
              </Button>
            ) : null}
            <Button type="submit" disabled={!areaValid || saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar fazenda' : 'Salvar tudo'}
            </Button>
          </Row>
        </>
      )}
    </Card>
  );
}
