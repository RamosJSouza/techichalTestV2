import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';

export interface FarmResponse {
  id: string;
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  harvests: Array<{
    id: string;
    year: string;
    crops: string[];
  }>;
}

export interface ProducerResponse {
  id: string;
  name: string;
  document: string;
  farms: FarmResponse[];
  createdAt: string;
  updatedAt: string;
}

export function toFarmResponse(farm: Farm): FarmResponse {
  return {
    id: farm.id,
    name: farm.name,
    city: farm.city,
    state: farm.state,
    totalArea: farm.area.totalArea,
    arableArea: farm.area.arableArea,
    vegetationArea: farm.area.vegetationArea,
    harvests: farm.harvests.map((harvest) => ({
      id: harvest.id,
      year: harvest.year,
      crops: harvest.crops.map((crop) => crop.name),
    })),
  };
}

export function toProducerResponse(producer: Producer): ProducerResponse {
  return {
    id: producer.id,
    name: producer.name,
    document: producer.document.value,
    farms: producer.farms.map(toFarmResponse),
    createdAt: producer.createdAt.toISOString(),
    updatedAt: producer.updatedAt.toISOString(),
  };
}
