import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EXTERNAL_VALIDATION_STATUSES } from '../../domain/constants/external-validation-status.js';

const STATUS_ENUM = [...EXTERNAL_VALIDATION_STATUSES];

/** Item da listagem paginada (summary — sem farms/harvests/crops). */
export class ProducerListItemResponseDto {
  @ApiProperty({ example: 'a8f3d1b2-8c9e-4a1b-9f01-123456789abc' })
  public id!: string;

  @ApiProperty({ example: 'João da Silva' })
  public name!: string;

  @ApiProperty({
    description: 'CPF/CNPJ mascarado',
    example: '***.982.247-**',
  })
  public document!: string;

  @ApiProperty({ example: 'APPROVED' })
  public esgStatus!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-01-15T12:00:00.000Z',
  })
  public esgCheckedAt!: string | null;

  @ApiProperty({
    enum: STATUS_ENUM,
    description:
      'VALIDATED | PENDING_EXTERNAL_VALIDATION | REJECTED (BrasilAPI CNPJ). Outage → PENDING, nunca positivo silencioso.',
  })
  public documentValidationStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  public documentValidationPendingAt!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Motivo da pendência (circuit_open, timeout_or_network, …)',
  })
  public documentValidationPendingReason!: string | null;

  @ApiProperty({
    description: 'Quantidade de fazendas ativas do produtor',
    example: 3,
  })
  public farmsCount!: number;

  @ApiProperty({
    description: 'UFs distintas das fazendas',
    type: [String],
    example: ['SP', 'MG'],
  })
  public farmStates!: string[];

  @ApiProperty({ example: 1250.5 })
  public totalAreaHa!: number;

  @ApiProperty({ example: 800 })
  public arableAreaHa!: number;

  @ApiProperty({ example: 450.5 })
  public vegetationAreaHa!: number;
}

/** Envelope da listagem paginada. */
export class ProducerListPageResponseDto {
  @ApiProperty({ type: [ProducerListItemResponseDto] })
  public items!: ProducerListItemResponseDto[];

  @ApiProperty({ example: 3334 })
  public total!: number;

  @ApiProperty({ example: 1 })
  public page!: number;

  @ApiProperty({ example: 20 })
  public pageSize!: number;
}

/** Safra no detalhe hidratado. */
class HarvestResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty({ example: '2024/2025' })
  public year!: string;

  @ApiProperty({ example: 'ACTIVE' })
  public status!: string;

  @ApiProperty({ type: [String], example: ['Soja', 'Milho'] })
  public crops!: string[];
}

/** Fazenda no detalhe hidratado. */
class FarmDetailResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public producerId!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public city!: string;

  @ApiProperty({ example: 'SP' })
  public state!: string;

  @ApiProperty()
  public totalArea!: number;

  @ApiProperty()
  public arableArea!: number;

  @ApiProperty()
  public vegetationArea!: number;

  @ApiPropertyOptional({ nullable: true })
  public carNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  public carStatus!: string | null;

  @ApiPropertyOptional({ nullable: true })
  public climateRiskScore!: number | null;

  @ApiProperty({
    enum: STATUS_ENUM,
    description: 'Validação cidade∈UF via BrasilAPI IBGE',
  })
  public territorialValidationStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  public territorialValidationPendingAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  public territorialValidationPendingReason!: string | null;

  @ApiProperty({ type: [HarvestResponseDto] })
  public harvests!: HarvestResponseDto[];
}

/** Detalhe completo do produtor (GET /producers/:id). */
export class ProducerDetailResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty({ description: 'CPF/CNPJ mascarado' })
  public document!: string;

  @ApiProperty()
  public esgStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  public esgCheckedAt!: string | null;

  @ApiProperty({
    enum: STATUS_ENUM,
    description:
      'Cadastro aceita PENDING; REJECTED/inativo bloqueia no write. Compliance plena exige VALIDATED.',
  })
  public documentValidationStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  public documentValidationPendingAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  public documentValidationPendingReason!: string | null;

  @ApiProperty({ type: [FarmDetailResponseDto] })
  public farms!: FarmDetailResponseDto[];

  @ApiProperty()
  public createdAt!: string;

  @ApiProperty()
  public updatedAt!: string;
}

/** Resultado de revalidação admin. */
export class RevalidateResultDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty({ enum: STATUS_ENUM })
  public previousStatus!: string;

  @ApiProperty({ enum: STATUS_ENUM })
  public newStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  public reason!: string | null;
}
