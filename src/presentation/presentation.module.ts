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
import { CAR_VALIDATION_SERVICE } from '../application/services/car-validation.service.interface.js';
import type { CarValidationServiceInterface } from '../application/services/car-validation.service.interface.js';
import { LOGGER_PORT } from '../application/services/logger.port.js';
import type { LoggerPort } from '../application/services/logger.port.js';
import { PROAGRO_SERVICE } from '../application/services/proagro.service.interface.js';
import type { ProagroServiceInterface } from '../application/services/proagro.service.interface.js';
import { SOCIO_ENVIRONMENTAL_SERVICE } from '../application/services/socio-environmental.service.interface.js';
import type { SocioEnvironmentalServiceInterface } from '../application/services/socio-environmental.service.interface.js';
import { CreateFarmUseCase } from '../application/use-cases/create-farm.use-case.js';
import { CreateProducerUseCase } from '../application/use-cases/create-producer.use-case.js';
import { DeleteFarmUseCase } from '../application/use-cases/delete-farm.use-case.js';
import { DeleteProducerUseCase } from '../application/use-cases/delete-producer.use-case.js';
import { GetDashboardStatsUseCase } from '../application/use-cases/get-dashboard-stats.use-case.js';
import { GetProducerByIdUseCase } from '../application/use-cases/get-producer-by-id.use-case.js';
import { GetProducerEsgComplianceUseCase } from '../application/use-cases/get-producer-esg-compliance.use-case.js';
import { ListProducersUseCase } from '../application/use-cases/list-producers.use-case.js';
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
import { BcbProagroAdapter } from '../infrastructure/adapters/bcb/bcb-proagro.adapter.js';
import { MockProagroAdapter } from '../infrastructure/adapters/bcb/mock-proagro.adapter.js';
import { NestAppConfigAdapter } from '../infrastructure/adapters/config/nest-app-config.adapter.js';
import { NestLoggerAdapter } from '../infrastructure/adapters/logging/nest-logger.adapter.js';
import { MockSocioEnvironmentalAdapter } from '../infrastructure/adapters/serpro/mock-socio-environmental.adapter.js';
import { SerproRaizTechAdapter } from '../infrastructure/adapters/serpro/serpro-raiztech.adapter.js';
import { MockCarValidationAdapter } from '../infrastructure/adapters/sicar/mock-car-validation.adapter.js';
import { SicarAdapter } from '../infrastructure/adapters/sicar/sicar.adapter.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { CRYPTO_SERVICE } from '../infrastructure/database/database.tokens.js';
import { DrizzleDashboardRepository } from '../infrastructure/repositories/drizzle-dashboard.repository.js';
import { DrizzleFarmRepository } from '../infrastructure/repositories/drizzle-farm.repository.js';
import { DrizzleProducerRepository } from '../infrastructure/repositories/drizzle-producer.repository.js';
import { DashboardController } from './controllers/dashboard.controller.js';
import { FarmController } from './controllers/farm.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { ProducerController } from './controllers/producer.controller.js';

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [
    HealthController,
    ProducerController,
    FarmController,
    DashboardController,
  ],
  providers: [
    NestLoggerAdapter,
    NestAppConfigAdapter,
    {
      provide: LOGGER_PORT,
      useExisting: NestLoggerAdapter,
    },
    {
      provide: APP_CONFIG_PORT,
      useExisting: NestAppConfigAdapter,
    },
    {
      provide: CreateProducerUseCase,
      useFactory: (
        producers: IProducerRepository,
        brazil: BrazilDataServiceInterface,
        crypto: CryptoServiceInterface,
        socio: SocioEnvironmentalServiceInterface,
        car: CarValidationServiceInterface,
        proagro: ProagroServiceInterface,
        config: AppConfigPort,
        logger: LoggerPort,
      ): CreateProducerUseCase =>
        new CreateProducerUseCase(
          producers,
          brazil,
          crypto,
          socio,
          car,
          proagro,
          config,
          logger,
        ),
      inject: [
        PRODUCER_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        CRYPTO_SERVICE_PORT,
        SOCIO_ENVIRONMENTAL_SERVICE,
        CAR_VALIDATION_SERVICE,
        PROAGRO_SERVICE,
        APP_CONFIG_PORT,
        LOGGER_PORT,
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
      ): UpdateProducerUseCase => new UpdateProducerUseCase(producers, crypto),
      inject: [PRODUCER_REPOSITORY, CRYPTO_SERVICE_PORT],
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
        socio: SocioEnvironmentalServiceInterface,
        car: CarValidationServiceInterface,
        proagro: ProagroServiceInterface,
        config: AppConfigPort,
        logger: LoggerPort,
      ): CreateFarmUseCase =>
        new CreateFarmUseCase(
          farms,
          producers,
          brazil,
          socio,
          car,
          proagro,
          config,
          logger,
        ),
      inject: [
        FARM_REPOSITORY,
        PRODUCER_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        SOCIO_ENVIRONMENTAL_SERVICE,
        CAR_VALIDATION_SERVICE,
        PROAGRO_SERVICE,
        APP_CONFIG_PORT,
        LOGGER_PORT,
      ],
    },
    {
      provide: UpdateFarmUseCase,
      useFactory: (
        farms: IFarmRepository,
        brazil: BrazilDataServiceInterface,
        car: CarValidationServiceInterface,
        proagro: ProagroServiceInterface,
        logger: LoggerPort,
      ): UpdateFarmUseCase =>
        new UpdateFarmUseCase(farms, brazil, car, proagro, logger),
      inject: [
        FARM_REPOSITORY,
        BRAZIL_DATA_SERVICE,
        CAR_VALIDATION_SERVICE,
        PROAGRO_SERVICE,
        LOGGER_PORT,
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
      useFactory: (
        farms: IFarmRepository,
        car: CarValidationServiceInterface,
      ): ValidateFarmCarUseCase => new ValidateFarmCarUseCase(farms, car),
      inject: [FARM_REPOSITORY, CAR_VALIDATION_SERVICE],
    },
    {
      provide: GetProducerEsgComplianceUseCase,
      useFactory: (
        producers: IProducerRepository,
        socio: SocioEnvironmentalServiceInterface,
      ): GetProducerEsgComplianceUseCase =>
        new GetProducerEsgComplianceUseCase(producers, socio),
      inject: [PRODUCER_REPOSITORY, SOCIO_ENVIRONMENTAL_SERVICE],
    },
    {
      provide: GetDashboardStatsUseCase,
      useFactory: (
        dashboard: IDashboardRepository,
      ): GetDashboardStatsUseCase => new GetDashboardStatsUseCase(dashboard),
      inject: [DASHBOARD_REPOSITORY],
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
      provide: CAR_VALIDATION_SERVICE,
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('ENABLE_CAR_VALIDATION', { infer: true })
          ? new SicarAdapter()
          : new MockCarValidationAdapter(),
      inject: [ConfigService],
    },
    {
      provide: SOCIO_ENVIRONMENTAL_SERVICE,
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('ENABLE_ESG_COMPLIANCE', { infer: true })
          ? new SerproRaizTechAdapter()
          : new MockSocioEnvironmentalAdapter(),
      inject: [ConfigService],
    },
    {
      provide: PROAGRO_SERVICE,
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('ENABLE_PROAGRO_RISK', { infer: true })
          ? new BcbProagroAdapter()
          : new MockProagroAdapter(),
      inject: [ConfigService],
    },
    {
      provide: CRYPTO_SERVICE_PORT,
      useExisting: CRYPTO_SERVICE,
    },
  ],
})
export class PresentationModule {}
