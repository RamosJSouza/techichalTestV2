import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema.js';
import { APP_CONFIG_PORT } from '../application/services/app-config.port.js';
import type { AppConfigPort } from '../application/services/app-config.port.js';
import { CRYPTO_SERVICE_PORT } from '../application/services/crypto.service.interface.js';
import type { CryptoServiceInterface } from '../application/services/crypto.service.interface.js';
import { BRAZIL_DATA_SERVICE } from '../application/services/brazil-data.service.interface.js';
import type { BrazilDataServiceInterface } from '../application/services/brazil-data.service.interface.js';
import { EXTERNAL_VALIDATION_AUDIT_PORT } from '../application/services/external-validation-audit.port.js';
import type { ExternalValidationAuditPort } from '../application/services/external-validation-audit.port.js';
import { LOGGER_PORT } from '../application/services/logger.port.js';
import type { LoggerPort } from '../application/services/logger.port.js';
import { CreateFarmUseCase } from '../application/use-cases/create-farm.use-case.js';
import { CreateProducerUseCase } from '../application/use-cases/create-producer.use-case.js';
import { DeleteFarmUseCase } from '../application/use-cases/delete-farm.use-case.js';
import { DeleteProducerUseCase } from '../application/use-cases/delete-producer.use-case.js';
import { GetDashboardAnalyticsUseCase } from '../application/use-cases/get-dashboard-analytics.use-case.js';
import { GetDashboardStatsUseCase } from '../application/use-cases/get-dashboard-stats.use-case.js';
import { GetDashboardSummaryUseCase } from '../application/use-cases/get-dashboard-summary.use-case.js';
import { GetProducerByIdUseCase } from '../application/use-cases/get-producer-by-id.use-case.js';
import { GetProducerEsgComplianceUseCase } from '../application/use-cases/get-producer-esg-compliance.use-case.js';
import { ListCitiesByStateUseCase } from '../application/use-cases/list-cities-by-state.use-case.js';
import { ListProducersUseCase } from '../application/use-cases/list-producers.use-case.js';
import { RevalidateFarmTerritorialUseCase } from '../application/use-cases/revalidate-farm-territorial.use-case.js';
import { RevalidateProducerDocumentUseCase } from '../application/use-cases/revalidate-producer-document.use-case.js';
import { SearchProducerByDocumentUseCase } from '../application/use-cases/search-producer-by-document.use-case.js';
import { UpdateFarmUseCase } from '../application/use-cases/update-farm.use-case.js';
import { UpdateProducerUseCase } from '../application/use-cases/update-producer.use-case.js';
import { ValidateFarmCarUseCase } from '../application/use-cases/validate-farm-car.use-case.js';
import { DASHBOARD_REPOSITORY } from '../domain/repositories/dashboard.repository.js';
import type { IDashboardRepository } from '../domain/repositories/dashboard.repository.js';
import { FARM_REPOSITORY } from '../domain/repositories/farm.repository.js';
import type { IFarmRepository } from '../domain/repositories/farm.repository.js';
import { PRODUCER_REPOSITORY } from '../domain/repositories/producer.repository.js';
import type { IProducerRepository } from '../domain/repositories/producer.repository.js';
import { BrasilApiAdapter } from '../infrastructure/adapters/brasil-api/brasil-api.adapter.js';
import { NestAppConfigAdapter } from '../infrastructure/adapters/config/nest-app-config.adapter.js';
import { NestLoggerAdapter } from '../infrastructure/adapters/logging/nest-logger.adapter.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { CRYPTO_SERVICE } from '../infrastructure/database/database.tokens.js';
import { PendingExternalValidationJob } from '../infrastructure/jobs/pending-external-validation.job.js';
import { MetricsService } from '../infrastructure/observability/metrics.service.js';
import { DrizzleDashboardRepository } from '../infrastructure/repositories/drizzle-dashboard.repository.js';
import { DrizzleExternalValidationAuditRepository } from '../infrastructure/repositories/drizzle-external-validation-audit.repository.js';
import { DrizzleFarmRepository } from '../infrastructure/repositories/drizzle-farm.repository.js';
import { DrizzleProducerRepository } from '../infrastructure/repositories/drizzle-producer.repository.js';
import { AdminRevalidateController } from './controllers/admin-revalidate.controller.js';
import { DashboardController } from './controllers/dashboard.controller.js';
import { FarmController } from './controllers/farm.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { IbgeController } from './controllers/ibge.controller.js';
import { ObservabilityController } from './controllers/observability.controller.js';
import { ProducerController } from './controllers/producer.controller.js';
import { AdminTokenGuard } from './guards/admin-token.guard.js';

@Module({
  imports: [
    DatabaseModule,
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  controllers: [
    HealthController,
    ObservabilityController,
    ProducerController,
    FarmController,
    DashboardController,
    IbgeController,
    AdminRevalidateController,
  ],
  providers: [
    MetricsService,
    NestLoggerAdapter,
    NestAppConfigAdapter,
    AdminTokenGuard,
    {
      provide: LOGGER_PORT,
      useExisting: NestLoggerAdapter,
    },
    {
      provide: APP_CONFIG_PORT,
      useExisting: NestAppConfigAdapter,
    },
    {
      provide: EXTERNAL_VALIDATION_AUDIT_PORT,
      useClass: DrizzleExternalValidationAuditRepository,
    },
    {
      provide: CreateProducerUseCase,
      useFactory: (
        producers: IProducerRepository,
        brazil: BrazilDataServiceInterface,
        crypto: CryptoServiceInterface,
        config: AppConfigPort,
        logger: LoggerPort,
        audit: ExternalValidationAuditPort,
      ): CreateProducerUseCase =>
        new CreateProducerUseCase(
          producers,
          brazil,
          crypto,
          config,
          logger,
          audit,
        ),
      inject: [
        PRODUCER_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        CRYPTO_SERVICE_PORT,
        APP_CONFIG_PORT,
        LOGGER_PORT,
        EXTERNAL_VALIDATION_AUDIT_PORT,
      ],
    },
    {
      provide: ListProducersUseCase,
      useFactory: (producers: IProducerRepository): ListProducersUseCase =>
        new ListProducersUseCase(producers),
      inject: [PRODUCER_REPOSITORY],
    },
    {
      provide: GetProducerByIdUseCase,
      useFactory: (producers: IProducerRepository): GetProducerByIdUseCase =>
        new GetProducerByIdUseCase(producers),
      inject: [PRODUCER_REPOSITORY],
    },
    {
      provide: SearchProducerByDocumentUseCase,
      useFactory: (
        producers: IProducerRepository,
        crypto: CryptoServiceInterface,
      ): SearchProducerByDocumentUseCase =>
        new SearchProducerByDocumentUseCase(producers, crypto),
      inject: [PRODUCER_REPOSITORY, CRYPTO_SERVICE_PORT],
    },
    {
      provide: UpdateProducerUseCase,
      useFactory: (
        producers: IProducerRepository,
        crypto: CryptoServiceInterface,
        brazil: BrazilDataServiceInterface,
        logger: LoggerPort,
        audit: ExternalValidationAuditPort,
      ): UpdateProducerUseCase =>
        new UpdateProducerUseCase(producers, crypto, brazil, logger, audit),
      inject: [
        PRODUCER_REPOSITORY,
        CRYPTO_SERVICE_PORT,
        BRAZIL_DATA_SERVICE,
        LOGGER_PORT,
        EXTERNAL_VALIDATION_AUDIT_PORT,
      ],
    },
    {
      provide: DeleteProducerUseCase,
      useFactory: (
        producers: IProducerRepository,
        logger: LoggerPort,
      ): DeleteProducerUseCase => new DeleteProducerUseCase(producers, logger),
      inject: [PRODUCER_REPOSITORY, LOGGER_PORT],
    },
    {
      provide: CreateFarmUseCase,
      useFactory: (
        farms: IFarmRepository,
        producers: IProducerRepository,
        brazil: BrazilDataServiceInterface,
        config: AppConfigPort,
        logger: LoggerPort,
        audit: ExternalValidationAuditPort,
      ): CreateFarmUseCase =>
        new CreateFarmUseCase(farms, producers, brazil, config, logger, audit),
      inject: [
        FARM_REPOSITORY,
        PRODUCER_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        APP_CONFIG_PORT,
        LOGGER_PORT,
        EXTERNAL_VALIDATION_AUDIT_PORT,
      ],
    },
    {
      provide: UpdateFarmUseCase,
      useFactory: (
        farms: IFarmRepository,
        brazil: BrazilDataServiceInterface,
        logger: LoggerPort,
        audit: ExternalValidationAuditPort,
      ): UpdateFarmUseCase =>
        new UpdateFarmUseCase(farms, brazil, logger, audit),
      inject: [
        FARM_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        LOGGER_PORT,
        EXTERNAL_VALIDATION_AUDIT_PORT,
      ],
    },
    {
      provide: DeleteFarmUseCase,
      useFactory: (
        farms: IFarmRepository,
        logger: LoggerPort,
      ): DeleteFarmUseCase => new DeleteFarmUseCase(farms, logger),
      inject: [FARM_REPOSITORY, LOGGER_PORT],
    },
    {
      provide: ValidateFarmCarUseCase,
      useFactory: (farms: IFarmRepository): ValidateFarmCarUseCase =>
        new ValidateFarmCarUseCase(farms),
      inject: [FARM_REPOSITORY],
    },
    {
      provide: GetProducerEsgComplianceUseCase,
      useFactory: (
        producers: IProducerRepository,
      ): GetProducerEsgComplianceUseCase =>
        new GetProducerEsgComplianceUseCase(producers),
      inject: [PRODUCER_REPOSITORY],
    },
    {
      provide: GetDashboardStatsUseCase,
      useFactory: (
        dashboard: IDashboardRepository,
      ): GetDashboardStatsUseCase => new GetDashboardStatsUseCase(dashboard),
      inject: [DASHBOARD_REPOSITORY],
    },
    {
      provide: GetDashboardSummaryUseCase,
      useFactory: (
        dashboard: IDashboardRepository,
      ): GetDashboardSummaryUseCase =>
        new GetDashboardSummaryUseCase(dashboard),
      inject: [DASHBOARD_REPOSITORY],
    },
    {
      provide: GetDashboardAnalyticsUseCase,
      useFactory: (
        dashboard: IDashboardRepository,
      ): GetDashboardAnalyticsUseCase =>
        new GetDashboardAnalyticsUseCase(dashboard),
      inject: [DASHBOARD_REPOSITORY],
    },
    {
      provide: ListCitiesByStateUseCase,
      useFactory: (
        brazil: BrazilDataServiceInterface,
      ): ListCitiesByStateUseCase => new ListCitiesByStateUseCase(brazil),
      inject: [BRAZIL_DATA_SERVICE],
    },
    {
      provide: RevalidateProducerDocumentUseCase,
      useFactory: (
        producers: IProducerRepository,
        brazil: BrazilDataServiceInterface,
        audit: ExternalValidationAuditPort,
        logger: LoggerPort,
      ): RevalidateProducerDocumentUseCase =>
        new RevalidateProducerDocumentUseCase(
          producers,
          brazil,
          audit,
          logger,
        ),
      inject: [
        PRODUCER_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        EXTERNAL_VALIDATION_AUDIT_PORT,
        LOGGER_PORT,
      ],
    },
    {
      provide: RevalidateFarmTerritorialUseCase,
      useFactory: (
        farms: IFarmRepository,
        brazil: BrazilDataServiceInterface,
        audit: ExternalValidationAuditPort,
        logger: LoggerPort,
      ): RevalidateFarmTerritorialUseCase =>
        new RevalidateFarmTerritorialUseCase(farms, brazil, audit, logger),
      inject: [
        FARM_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        EXTERNAL_VALIDATION_AUDIT_PORT,
        LOGGER_PORT,
      ],
    },
    {
      provide: PendingExternalValidationJob,
      useFactory: (
        config: ConfigService<Env, true>,
        producers: IProducerRepository,
        farms: IFarmRepository,
        revalidateProducer: RevalidateProducerDocumentUseCase,
        revalidateFarm: RevalidateFarmTerritorialUseCase,
        logger: LoggerPort,
      ): PendingExternalValidationJob =>
        new PendingExternalValidationJob(
          config,
          producers,
          farms,
          revalidateProducer,
          revalidateFarm,
          logger,
        ),
      inject: [
        ConfigService,
        PRODUCER_REPOSITORY,
        FARM_REPOSITORY,
        RevalidateProducerDocumentUseCase,
        RevalidateFarmTerritorialUseCase,
        LOGGER_PORT,
      ],
    },
    {
      provide: PRODUCER_REPOSITORY,
      useClass: DrizzleProducerRepository,
    },
    {
      provide: FARM_REPOSITORY,
      useClass: DrizzleFarmRepository,
    },
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: DrizzleDashboardRepository,
    },
    {
      provide: BRAZIL_DATA_SERVICE,
      useClass: BrasilApiAdapter,
    },
    {
      provide: CRYPTO_SERVICE_PORT,
      useExisting: CRYPTO_SERVICE,
    },
  ],
  exports: [MetricsService],
})
export class PresentationModule {}
