import { createZodDto } from 'nestjs-zod';
import { ufParamSchema } from '../schemas/ibge.schemas.js';

export class UfParamDto extends createZodDto(ufParamSchema) {}
