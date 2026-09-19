import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CRYPTO_SERVICE_PORT } from '../application/services/crypto.service.interface.js';
import { BRAZIL_DATA_SERVICE } from '../application/services/brazil-data.service.interface.js';
import { CreateFarmUseCase } from '../application/use-cases/create-farm.use-case.js';
import { CreateProducerUseCase } from '../application/use-cases/create-producer.use-case.js';
import { DeleteProducerUseCase } from '../application/use-cases/delete-producer.use-case.js';
import { GetDashboardStatsUseCase } from '../application/use-cases/get-dashboard-stats.use-case.js';
import { GetProducerByIdUseCase } from '../application/use-cases/get-producer-by-id.use-case.js';
import { ListProducersUseCase } from '../application/use-cases/list-producers.use-case.js';
import { SearchProducerByDocumentUseCase } from '../application/use-cases/search-producer-by-document.use-case.js';
import { UpdateProducerUseCase } from '../application/use-cases/update-producer.use-case.js';
import { DASHBOARD_REPOSITORY } from '../domain/repositories/dashboard.repository.js';
import { FARM_REPOSITORY } from '../domain/repositories/farm.repository.js';
import { PRODUCER_REPOSITORY } from '../domain/repositories/producer.repository.js';
import { BrasilApiAdapter } from '../infrastructure/adapters/brasil-api/brasil-api.adapter.js';
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
    CreateProducerUseCase,
    ListProducersUseCase,
    GetProducerByIdUseCase,
    SearchProducerByDocumentUseCase,
    UpdateProducerUseCase,
    DeleteProducerUseCase,
    CreateFarmUseCase,
    GetDashboardStatsUseCase,
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
})
export class PresentationModule {}
