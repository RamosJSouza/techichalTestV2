import { createZodDto } from 'nestjs-zod';
import {
  createFarmSchema,
  createProducerSchema,
  listProducersQuerySchema,
  searchProducerQuerySchema,
  updateFarmSchema,
  updateProducerSchema,
  uuidParamSchema,
} from '../schemas/producer.schemas.js';

export class CreateProducerDto extends createZodDto(createProducerSchema) {}
export class UpdateProducerDto extends createZodDto(updateProducerSchema) {}
export class SearchProducerQueryDto extends createZodDto(
  searchProducerQuerySchema,
) {}
export class ListProducersQueryDto extends createZodDto(
  listProducersQuerySchema,
) {}
export class UuidParamDto extends createZodDto(uuidParamSchema) {}
export class CreateFarmDto extends createZodDto(createFarmSchema) {}
export class UpdateFarmDto extends createZodDto(updateFarmSchema) {}
