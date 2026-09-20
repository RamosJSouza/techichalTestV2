import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RevalidateFarmTerritorialUseCase } from '../../application/use-cases/revalidate-farm-territorial.use-case.js';
import { RevalidateProducerDocumentUseCase } from '../../application/use-cases/revalidate-producer-document.use-case.js';
import { RevalidateResultDto } from '../dtos/producer-response.dto.js';
import { UuidParamDto } from '../dtos/producer.dto.js';
import { AdminTokenGuard } from '../guards/admin-token.guard.js';

@ApiTags('admin')
@Controller('admin/revalidate')
@UseGuards(AdminTokenGuard)
@ApiHeader({
  name: 'X-Admin-Token',
  required: true,
  description: 'Token administrativo (ADMIN_API_TOKEN)',
})
export class AdminRevalidateController {
  public constructor(
    private readonly revalidateProducer: RevalidateProducerDocumentUseCase,
    private readonly revalidateFarm: RevalidateFarmTerritorialUseCase,
  ) {}

  @Post('producers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Revalida CNPJ do produtor via BrasilAPI',
    type: RevalidateResultDto,
  })
  public async producer(@Param() params: UuidParamDto) {
    return this.revalidateProducer.execute(params.id, 'admin');
  }

  @Post('farms/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Revalida cidade/UF da fazenda via BrasilAPI',
    type: RevalidateResultDto,
  })
  public async farm(@Param() params: UuidParamDto) {
    return this.revalidateFarm.execute(params.id, 'admin');
  }
}
