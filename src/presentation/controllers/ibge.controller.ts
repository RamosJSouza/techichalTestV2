import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ListCitiesByStateUseCase } from '../../application/use-cases/list-cities-by-state.use-case.js';
import { UfParamDto } from '../dtos/ibge.dto.js';

@ApiTags('ibge')
@Controller('ibge')
export class IbgeController {
  public constructor(
    private readonly listCitiesByState: ListCitiesByStateUseCase,
  ) {}

  @Get('states/:uf/cities')
  @ApiOkResponse({ description: 'Lista de municípios do IBGE para a UF' })
  public async listCities(
    @Param() params: UfParamDto,
  ): Promise<{ cities: string[] }> {
    const cities = await this.listCitiesByState.execute(params.uf);
    return { cities };
  }
}
