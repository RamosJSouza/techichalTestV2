import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  useLazySearchProducerQuery,
  useUpdateFarmMutation,
  useUpdateProducerMutation,
  useValidateFarmCarMutation,
} from '../store/api/apiSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import { setWizardStep, showToast } from '../store/slices/uiSlice';
import { Button } from '../components/atoms/Button';
import { Select } from '../components/atoms/Select';
import { Spinner } from '../components/atoms/Spinner';
import { TextInput } from '../components/atoms/TextInput';
import { CityAutocomplete } from '../components/molecules/CityAutocomplete';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { CropChip } from '../components/molecules/CropChip';
import { ErrorRetryPanel } from '../components/molecules/ErrorRetryPanel';
import { ValidationBanner } from '../components/molecules/ValidationBanner';
import { BRAZILIAN_STATES } from '../shared/lib/brazilian-states';
import { digitsOnly } from '../shared/lib/match-producer-search';
import { CROP_NAMES } from '../shared/lib/crop-names';
import { httpStatusDetail } from '../shared/lib/http-error-detail';
import { useEsgCarFeature } from '../shared/lib/use-esg-car-enabled';
import type { FarmResponse } from '../shared/types/api';
import {
  defaultFarm,
  emptyToUndefined,
  farmFromResponse,
  normalizeCarNumber,
  removedHarvestYears,
  toFarmApiPayload,
  toFiniteNumber,
} from './producer-form-helpers';

const MAX_HARVESTS = 10;

const Lead = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

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
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.textSecondary};
`;

const StepBar = styled.span<{ $active: boolean }>`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.border};
`;

const Remainder = styled.p<{ $negative: boolean }>`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme, $negative }) =>
    $negative ? theme.colors.danger : theme.colors.textSecondary};
`;

const HarvestBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
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

const DuplicateGuide = styled.p`
  margin: 0;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid #e57373;
  background: ${({ theme }) => theme.colors.dangerBg};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.875rem;
`;

const GuideLink = styled(Link)`
  color: inherit;
  font-weight: 700;
`;

type Step0Field = 'name' | 'document';

type FoundProducer = {
  id: string;
  name: string;
};

type ContinueProducerStepInput = {
  isEdit: boolean;
  name: string;
  document: string;
  search: (document: string) => Promise<FoundProducer>;
  resetStepFeedback: () => void;
  setChecking: (checking: boolean) => void;
  setFieldError: (field: Step0Field, message: string) => void;
  setStepError: (message: string) => void;
  setDuplicate: (producer: FoundProducer) => void;
  advance: () => void;
};

function duplicateDocumentMessage(document: string): string {
  if (digitsOnly(document).length === 14) {
    return 'Este CNPJ já está cadastrado.';
  }
  return 'Este CPF já está cadastrado.';
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 404
  );
}

async function continueProducerStep(
  input: ContinueProducerStepInput,
): Promise<void> {
  const parsed = input.isEdit
    ? wizardStep0EditSchema.safeParse({ name: input.name })
    : wizardStep0Schema.safeParse({
        name: input.name,
        document: input.document,
      });

  input.resetStepFeedback();

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'name' || key === 'document') {
        input.setFieldError(key, issue.message);
      }
    }
    input.setStepError('Corrija os campos do produtor antes de continuar.');
    return;
  }

  if (input.isEdit) {
    input.advance();
    return;
  }

  input.setChecking(true);
  try {
    const found = await input.search(input.document);
    input.setFieldError('document', duplicateDocumentMessage(input.document));
    input.setDuplicate({ id: found.id, name: found.name });
  } catch (error: unknown) {
    if (isNotFound(error)) {
      input.advance();
    } else {
      input.setStepError(
        'Não foi possível conferir o documento. Tente continuar de novo.',
      );
    }
  } finally {
    input.setChecking(false);
  }
}

export function ProducerFormPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const openOnFarm = searchParams.get('passo') === 'fazenda';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const step = useAppSelector((s) => s.ui.wizardStep);
  const [step0Error, setStep0Error] = useState<string | null>(null);
  const [checkingDocument, setCheckingDocument] = useState(false);
  const [existingDocument, setExistingDocument] = useState<FoundProducer | null>(
    null,
  );
  const [draftFarms, setDraftFarms] = useState<FarmAreasFormValues[]>([]);
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const [isAddingFarm, setIsAddingFarm] = useState(false);
  const [pendingFarmDelete, setPendingFarmDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const loadedProducerId = useRef<string | null>(null);
  const loadedYears = useRef<string[]>([]);

  const {
    data: existing,
    isLoading: loadingExisting,
    isError: loadError,
    error: loadQueryError,
    refetch: refetchProducer,
  } = useGetProducerQuery(id ?? '', { skip: !id });
  const [createProducer, { isLoading: creating }] = useCreateProducerMutation();
  const [updateProducer, { isLoading: updating }] = useUpdateProducerMutation();
  const [updateFarm, { isLoading: updatingFarm }] = useUpdateFarmMutation();
  const [createFarm, { isLoading: creatingFarm }] = useCreateFarmMutation();
  const [deleteFarm, { isLoading: deletingFarm }] = useDeleteFarmMutation();
  const [validateCar, { isLoading: validatingCar }] =
    useValidateFarmCarMutation();
  const [searchProducer] = useLazySearchProducerQuery();
  const esgCar = useEsgCarFeature();

  const {
    register,
    control,
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'farm.harvests',
  });

  useLayoutEffect(() => {
    dispatch(setWizardStep(openOnFarm ? 1 : 0));
  }, [dispatch, openOnFarm]);

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
    setIsAddingFarm(!farm);
    loadedYears.current = farm
      ? farm.harvests.map((harvest) => harvest.year.trim())
      : [];
    reset({
      name: existing.name,
      document: '00000000000',
      farm: farm ? farmFromResponse(farm) : defaultFarm(),
    });
  }, [existing, reset]);

  const totalArea = watch('farm.totalArea');
  const arableArea = watch('farm.arableArea');
  const vegetationArea = watch('farm.vegetationArea');
  const harvests = watch('farm.harvests');
  const farmState = watch('farm.state');
  const farmCity = watch('farm.city');

  const areas = useMemo(() => {
    const total = toFiniteNumber(totalArea);
    const arable = toFiniteNumber(arableArea);
    const vegetation = toFiniteNumber(vegetationArea);
    if (total === null || arable === null || vegetation === null) {
      return null;
    }
    return { total, arable, vegetation };
  }, [totalArea, arableArea, vegetationArea]);

  const areaValid =
    areas !== null &&
    farmAreasSchema.safeParse({
      name: 'x',
      city: 'x',
      state: 'SP',
      totalArea: areas.total,
      arableArea: areas.arable,
      vegetationArea: areas.vegetation,
    }).success;

  const areaRemainder =
    areas === null ? null : areas.total - areas.arable - areas.vegetation;

  const saving =
    creating || updating || updatingFarm || creatingFarm || deletingFarm;

  if (isEdit && loadingExisting) {
    return <Spinner />;
  }

  if (isEdit && (loadError || !existing)) {
    return (
      <ErrorRetryPanel
        message="Falha ao carregar produtor."
        detail={httpStatusDetail(loadQueryError)}
        onRetry={() => {
          void refetchProducer();
        }}
      />
    );
  }

  const loadFarmIntoForm = (farm: FarmResponse): void => {
    setIsAddingFarm(false);
    setEditingFarmId(farm.id);
    loadedYears.current = farm.harvests.map((harvest) => harvest.year.trim());
    reset({
      name: getValues('name'),
      document: getValues('document'),
      farm: farmFromResponse(farm),
    });
  };

  const startNewFarm = (): void => {
    setIsAddingFarm(true);
    setEditingFarmId(null);
    loadedYears.current = [];
    setValue('farm', defaultFarm());
  };

  const toggleCrop = (index: number, crop: string): void => {
    const current = getValues(`farm.harvests.${index}.crops`) ?? [];
    const next = current.includes(crop)
      ? current.filter((item) => item !== crop)
      : [...current, crop];
    setValue(`farm.harvests.${index}.crops`, next, { shouldDirty: true });
  };

  const goToStep1 = (): Promise<void> => {
    const values = getValues();
    return continueProducerStep({
      isEdit,
      name: values.name,
      document: values.document,
      search: (document) => searchProducer(document).unwrap(),
      resetStepFeedback: () => {
        clearErrors(['name', 'document']);
        setStep0Error(null);
        setExistingDocument(null);
      },
      setChecking: setCheckingDocument,
      setFieldError: (field, message) => {
        setError(field, { type: 'manual', message });
      },
      setStepError: setStep0Error,
      setDuplicate: setExistingDocument,
      advance: () => {
        dispatch(setWizardStep(1));
      },
    });
  };

  const onInvalid = (formErrors: typeof errors): void => {
    if (formErrors.name || formErrors.document) {
      dispatch(setWizardStep(0));
      setStep0Error('Corrija os campos do produtor antes de salvar.');
    }
  };

  const queueCurrentFarm = (): boolean => {
    const values = getValues();
    const payload = toFarmApiPayload(values.farm);
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
    loadedYears.current = [];
    setValue('farm', defaultFarm());
    return true;
  };

  const onSubmit = handleSubmit(async (values) => {
    const current = toFarmApiPayload(values.farm);
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
              removedYears: removedHarvestYears(
                loadedYears.current,
                parsedCurrent.data.harvests,
              ),
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
    try {
      await deleteFarm(farmId).unwrap();
      dispatch(
        showToast({ message: 'Fazenda removida.', variant: 'success' }),
      );
      if (editingFarmId === farmId) {
        startNewFarm();
      }
      setPendingFarmDelete(null);
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
    <>
    <Card onSubmit={onSubmit} noValidate>
      <h1>{isEdit ? 'Editar produtor' : 'Novo produtor'}</h1>
      <Lead>
        Informe o produtor e as fazendas. Cada fazenda pode ter várias safras, e
        cada safra várias culturas.
      </Lead>
      <Steps>
        <Step $active={step === 0}>
          1. Produtor
          <StepBar $active={step === 0} />
        </Step>
        <Step $active={step === 1}>
          2. Fazenda
          <StepBar $active={step === 1} />
        </Step>
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
          {existingDocument ? (
            <DuplicateGuide role="status">
              O cadastro de {existingDocument.name} já usa este documento. Abra
              esse cadastro para incluir uma fazenda, ou informe outro
              documento.{' '}
              <GuideLink
                to={`/producers/${existingDocument.id}/edit?passo=fazenda`}
              >
                Abrir cadastro
              </GuideLink>
            </DuplicateGuide>
          ) : null}
          {step0Error ? (
            <ValidationBanner valid={false} message={step0Error} />
          ) : null}
          <Button
            type="button"
            onClick={() => {
              void goToStep1();
            }}
            disabled={checkingDocument}
          >
            {checkingDocument ? 'Conferindo documento…' : 'Continuar'}
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
                      {esgCar.enabled && farm.carStatus
                        ? ` · CAR ${farm.carStatus}`
                        : ''}
                    </span>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingFarmDelete({ id: farm.id, name: farm.name });
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
          <Select
            label="UF"
            error={errors.farm?.state?.message}
            value={farmState ?? ''}
            onChange={(e) => {
              setValue('farm.state', e.target.value.toUpperCase(), {
                shouldValidate: true,
              });
              setValue('farm.city', '', { shouldValidate: true });
            }}
          >
            <option value="">Selecione</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Select>
          <CityAutocomplete
            uf={farmState ?? ''}
            value={farmCity ?? ''}
            error={errors.farm?.city?.message}
            disabled={!farmState}
            onChange={(v) =>
              setValue('farm.city', v, { shouldValidate: true })
            }
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
          {areaRemainder !== null ? (
            <Remainder $negative={areaRemainder < 0}>
              Restam {areaRemainder} ha
            </Remainder>
          ) : null}
          <ValidationBanner
            valid={areaValid}
            message={
              areaValid
                ? 'A soma cabe na área total.'
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
          {esgCar.enabled && isEdit && editingFarmId ? (
            <Button
              type="button"
              variant="secondary"
              disabled={validatingCar}
              aria-busy={validatingCar}
              onClick={() => void handleValidateCar()}
            >
              {validatingCar ? 'Validando CAR…' : 'Validar CAR'}
            </Button>
          ) : null}

          {fields.map((field, index) => {
            const crops = harvests?.[index]?.crops ?? [];
            return (
              <HarvestBlock key={field.id}>
                <TextInput
                  label={
                    index === 0 ? 'Ano da safra' : `Ano da safra ${index + 1}`
                  }
                  placeholder="2025/2026"
                  maxLength={10}
                  {...register(`farm.harvests.${index}.year`)}
                />
                <div>
                  <strong>Culturas da safra</strong>
                  <ChipRow>
                    {CROP_NAMES.map((crop) => (
                      <CropChip
                        key={crop}
                        label={crop}
                        selected={crops.includes(crop)}
                        onToggle={() => toggleCrop(index, crop)}
                      />
                    ))}
                  </ChipRow>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => remove(index)}
                >
                  Remover safra
                </Button>
              </HarvestBlock>
            );
          })}
          <Button
            type="button"
            variant="secondary"
            disabled={fields.length >= MAX_HARVESTS}
            onClick={() => append({ year: '', crops: [] })}
          >
            Adicionar safra
          </Button>

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
            <Button
              type="submit"
              disabled={!areaValid || saving}
              aria-busy={saving}
            >
              {saving ? 'Salvando…' : isEdit ? 'Salvar fazenda' : 'Salvar tudo'}
            </Button>
          </Row>
        </>
      )}
    </Card>
    <ConfirmDialog
      open={pendingFarmDelete !== null}
      title="Excluir fazenda"
      message={
        pendingFarmDelete
          ? `A fazenda ${pendingFarmDelete.name} sai da lista.`
          : ''
      }
      busy={deletingFarm}
      onCancel={() => {
        if (!deletingFarm) {
          setPendingFarmDelete(null);
        }
      }}
      onConfirm={() => {
        if (!pendingFarmDelete || deletingFarm) {
          return;
        }
        void handleDeleteFarm(pendingFarmDelete.id);
      }}
    />
    </>
  );
}
