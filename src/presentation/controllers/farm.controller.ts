import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateFarmUseCase } from '../../application/use-cases/create-farm.use-case.js';
import { DeleteFarmUseCase } from '../../application/use-cases/delete-farm.use-case.js';
import { UpdateFarmUseCase } from '../../application/use-cases/update-farm.use-case.js';
import { ValidateFarmCarUseCase } from '../../application/use-cases/validate-farm-car.use-case.js';
import {
  CreateFarmDto,
  UpdateFarmDto,
  UuidParamDto,
} from '../dtos/producer.dto.js';
import { toFarmResponse } from '../mappers/producer-response.mapper.js';

@ApiTags('farms')
@Controller('farms')
export class FarmController {
  public constructor(
    private readonly createFarm: CreateFarmUseCase,
    private readonly updateFarm: UpdateFarmUseCase,
    private readonly deleteFarm: DeleteFarmUseCase,
    private readonly validateFarmCar: ValidateFarmCarUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Fazenda criada' })
  public async create(@Body() body: CreateFarmDto) {
    const farm = await this.createFarm.execute(body);
    return toFarmResponse(farm);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'Fazenda atualizada' })
  public async update(
    @Param() params: UuidParamDto,
    @Body() body: UpdateFarmDto,
  ) {
    const farm = await this.updateFarm.execute(params.id, body);
    return toFarmResponse(farm);
  }

  @Post(':id/car/validate')
  @ApiOkResponse({ description: 'Auditoria CAR (validação local)' })
  public async validateCar(@Param() params: UuidParamDto) {
    return this.validateFarmCar.execute(params.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Fazenda removida (soft delete)' })
  public async remove(@Param() params: UuidParamDto): Promise<void> {
    await this.deleteFarm.execute(params.id);
  }
}
