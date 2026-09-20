import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';
import type { ProducerListItem } from '../../domain/repositories/producer.repository.js';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';

interface FarmResponse {
  id: string;
  producerId: string;
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  carNumber: string | null;
  carStatus: string | null;
  climateRiskScore: number | null;
  territorialValidationStatus: string;
  territorialValidationPendingAt: string | null;
  territorialValidationPendingReason: string | null;
  harvests: Array<{
    id: string;
    year: string;
    status: string;
    crops: string[];
  }>;
}

interface ProducerResponse {
  id: string;
  name: string;
  document: string;
  esgStatus: string;
  esgCheckedAt: string | null;
  documentValidationStatus: string;
  documentValidationPendingAt: string | null;
  documentValidationPendingReason: string | null;
  farms: FarmResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ProducerListItemResponse {
  id: string;
  name: string;
  document: string;
  esgStatus: string;
  esgCheckedAt: string | null;
  documentValidationStatus: string;
  documentValidationPendingAt: string | null;
  documentValidationPendingReason: string | null;
  farmsCount: number;
  farmStates: string[];
  totalAreaHa: number;
  arableAreaHa: number;
  vegetationAreaHa: number;
}

export function toFarmResponse(farm: Farm): FarmResponse {
  return {
    id: farm.id,
    producerId: farm.producerId,
    name: farm.name,
    city: farm.city,
    state: farm.state,
    totalArea: farm.area.totalArea,
    arableArea: farm.area.arableArea,
    vegetationArea: farm.area.vegetationArea,
    carNumber: farm.carNumber?.value ?? null,
    carStatus: farm.carStatus,
    climateRiskScore: farm.climateRiskScore,
    territorialValidationStatus: farm.territorialValidationStatus,
    territorialValidationPendingAt:
      farm.territorialValidationPendingAt?.toISOString() ?? null,
    territorialValidationPendingReason:
      farm.territorialValidationPendingReason,
    harvests: farm.harvests.map((harvest) => ({
      id: harvest.id,
      year: harvest.year,
      status: harvest.status,
      crops: harvest.crops.map((crop) => crop.name),
    })),
  };
}

export function toProducerResponse(producer: Producer): ProducerResponse {
  return {
    id: producer.id,
    name: producer.name,
    document: producer.document.masked(),
    esgStatus: producer.esgStatus,
    esgCheckedAt: producer.esgCheckedAt?.toISOString() ?? null,
    documentValidationStatus: producer.documentValidationStatus,
    documentValidationPendingAt:
      producer.documentValidationPendingAt?.toISOString() ?? null,
    documentValidationPendingReason:
      producer.documentValidationPendingReason,
    farms: producer.farms.map(toFarmResponse),
    createdAt: producer.createdAt.toISOString(),
    updatedAt: producer.updatedAt.toISOString(),
  };
}

export function toProducerListItem(
  item: ProducerListItem,
): ProducerListItemResponse {
  return {
    id: item.id,
    name: item.name,
    document: CpfCnpj.create(item.documentDigits).masked(),
    esgStatus: item.esgStatus,
    esgCheckedAt: item.esgCheckedAt?.toISOString() ?? null,
    documentValidationStatus: item.documentValidationStatus,
    documentValidationPendingAt:
      item.documentValidationPendingAt?.toISOString() ?? null,
    documentValidationPendingReason: item.documentValidationPendingReason,
    farmsCount: item.farmsCount,
    farmStates: item.farmStates,
    totalAreaHa: item.totalAreaHa,
    arableAreaHa: item.arableAreaHa,
    vegetationAreaHa: item.vegetationAreaHa,
  };
}
