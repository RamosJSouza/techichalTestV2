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
import { ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { CreateProducerUseCase } from '../../application/use-cases/create-producer.use-case.js';
import { DeleteProducerUseCase } from '../../application/use-cases/delete-producer.use-case.js';
import { GetProducerByIdUseCase } from '../../application/use-cases/get-producer-by-id.use-case.js';
import { GetProducerEsgComplianceUseCase } from '../../application/use-cases/get-producer-esg-compliance.use-case.js';
import { ListProducersUseCase } from '../../application/use-cases/list-producers.use-case.js';
import { SearchProducerByDocumentUseCase } from '../../application/use-cases/search-producer-by-document.use-case.js';
import { UpdateProducerUseCase } from '../../application/use-cases/update-producer.use-case.js';
import { MaskPII } from '../decorators/mask-pii.decorator.js';
import {
  CreateProducerDto,
  ListProducersQueryDto,
  SearchProducerQueryDto,
  UpdateProducerDto,
  UuidParamDto,
} from '../dtos/producer.dto.js';
import {
  ProducerDetailResponseDto,
  ProducerListPageResponseDto,
} from '../dtos/producer-response.dto.js';
import { MaskPiiInterceptor } from '../interceptors/mask-pii.interceptor.js';
import { toProducerListItem, toProducerResponse } from '../mappers/producer-response.mapper.js';

class ProducerMaskedResponseDto {
  @ApiProperty({ example: 'a8f3d1b2-8c9e-4a1b-9f01-123456789abc' })
  public id!: string;

  @ApiProperty({ example: 'João da Silva' })
  public name!: string;

  @ApiProperty({
    description: 'CPF/CNPJ mascarado na resposta',
    examples: {
      cpf: { value: '***.982.247-**' },
      cnpj: { value: '**.222.333/0001-**' },
    },
    example: '***.982.247-**',
  })
  public document!: string;
}

@ApiTags('producers')
@Controller('producers')
@MaskPII()
@UseInterceptors(MaskPiiInterceptor)
export class ProducerController {
  public constructor(
    private readonly createProducer: CreateProducerUseCase,
    private readonly listProducers: ListProducersUseCase,
    private readonly getProducerById: GetProducerByIdUseCase,
    private readonly searchProducerByDocument: SearchProducerByDocumentUseCase,
    private readonly updateProducer: UpdateProducerUseCase,
    private readonly deleteProducer: DeleteProducerUseCase,
    private readonly getProducerEsgCompliance: GetProducerEsgComplianceUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({
    description: 'Produtor criado',
    type: ProducerMaskedResponseDto,
  })
  public async create(@Body() body: CreateProducerDto) {
    const producer = await this.createProducer.execute(body);
    return toProducerResponse(producer);
  }

  @Get()
  @ApiOkResponse({
    description:
      'Lista paginada resumida de produtores (farmsCount/áreas/UFs; sem harvests/crops).',
    type: ProducerListPageResponseDto,
  })
  public async list(@Query() query: ListProducersQueryDto) {
    const result = await this.listProducers.execute(query);
    return {
      items: result.items.map(toProducerListItem),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      nextCursor: result.nextCursor,
    };
  }

  @Get('search')
  @ApiOkResponse({
    description: 'Busca por documento (blind index) — retorno hidratado completo',
    type: ProducerDetailResponseDto,
  })
  public async search(@Query() query: SearchProducerQueryDto) {
    const producer = await this.searchProducerByDocument.execute(query.document);
    return toProducerResponse(producer);
  }

  @Get(':id/esg-compliance')
  @ApiOkResponse({ description: 'Parecer socioambiental ESG' })
  public async esgCompliance(@Param() params: UuidParamDto) {
    return this.getProducerEsgCompliance.execute(params.id);
  }

  @Get(':id')
  @ApiOkResponse({
    description:
      'Detalhe do produtor com fazendas, safras e culturas (hidratação completa)',
    type: ProducerDetailResponseDto,
  })
  public async getById(@Param() params: UuidParamDto) {
    const producer = await this.getProducerById.execute(params.id);
    return toProducerResponse(producer);
  }

  @Put(':id')
  @ApiOkResponse({
    description: 'Produtor atualizado',
    type: ProducerDetailResponseDto,
  })
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
