import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateProducerUseCase } from '../../application/use-cases/create-producer.use-case.js';
import { DeleteProducerUseCase } from '../../application/use-cases/delete-producer.use-case.js';
import { GetProducerByIdUseCase } from '../../application/use-cases/get-producer-by-id.use-case.js';
import { ListProducersUseCase } from '../../application/use-cases/list-producers.use-case.js';
import { SearchProducerByDocumentUseCase } from '../../application/use-cases/search-producer-by-document.use-case.js';
import { UpdateProducerUseCase } from '../../application/use-cases/update-producer.use-case.js';
import {
  CreateProducerDto,
  SearchProducerQueryDto,
  UpdateProducerDto,
  UuidParamDto,
} from '../dtos/producer.dto.js';
import { MaskPiiInterceptor } from '../interceptors/mask-pii.interceptor.js';
import { toProducerResponse } from '../mappers/producer-response.mapper.js';

@ApiTags('producers')
@Controller('producers')
@UseInterceptors(MaskPiiInterceptor)
export class ProducerController {
  public constructor(
    private readonly createProducer: CreateProducerUseCase,
    private readonly listProducers: ListProducersUseCase,
    private readonly getProducerById: GetProducerByIdUseCase,
    private readonly searchProducerByDocument: SearchProducerByDocumentUseCase,
    private readonly updateProducer: UpdateProducerUseCase,
    private readonly deleteProducer: DeleteProducerUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Produtor criado' })
  public async create(@Body() body: CreateProducerDto) {
    const producer = await this.createProducer.execute(body);
    return toProducerResponse(producer);
  }

  @Get()
  @ApiOkResponse({ description: 'Lista de produtores' })
  public async list() {
    const producers = await this.listProducers.execute();
    return producers.map(toProducerResponse);
  }

  @Get('search')
  @ApiOkResponse({ description: 'Busca por documento (blind index)' })
  public async search(@Query() query: SearchProducerQueryDto) {
    const producer = await this.searchProducerByDocument.execute(query.document);
    return toProducerResponse(producer);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalhe do produtor' })
  public async getById(@Param() params: UuidParamDto) {
    const producer = await this.getProducerById.execute(params.id);
    return toProducerResponse(producer);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'Produtor atualizado' })
  public async update(
    @Param() params: UuidParamDto,
    @Body() body: UpdateProducerDto,
  ) {
    const producer = await this.updateProducer.execute(params.id, body);
    return toProducerResponse(producer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(@Param() params: UuidParamDto): Promise<void> {
    await this.deleteProducer.execute(params.id);
  }
}
