import { createZodDto } from 'nestjs-zod';
import { dashboardStatsQuerySchema } from '../schemas/dashboard.schemas.js';

export class DashboardStatsQueryDto extends createZodDto(
  dashboardStatsQuerySchema,
) {}
