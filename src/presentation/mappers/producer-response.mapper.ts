import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';

export interface FarmResponse {
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
  harvests: Array<{
    id: string;
    year: string;
    status: string;
    crops: string[];
  }>;
}

export interface ProducerResponse {
  id: string;
  name: string;
  document: string;
  esgStatus: string;
  esgCheckedAt: string | null;
  farms: FarmResponse[];
  createdAt: string;
  updatedAt: string;
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
    farms: producer.farms.map(toFarmResponse),
    createdAt: producer.createdAt.toISOString(),
    updatedAt: producer.updatedAt.toISOString(),
  };
}
