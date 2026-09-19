import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateFarmUseCase } from '../../application/use-cases/create-farm.use-case.js';
import { CreateFarmDto } from '../dtos/producer.dto.js';
import { toFarmResponse } from '../mappers/producer-response.mapper.js';

@ApiTags('farms')
@Controller('farms')
export class FarmController {
  public constructor(private readonly createFarm: CreateFarmUseCase) {}

  @Post()
  @ApiCreatedResponse({ description: 'Fazenda criada' })
  public async create(@Body() body: CreateFarmDto) {
    const farm = await this.createFarm.execute(body);
    return toFarmResponse(farm);
  }
}
