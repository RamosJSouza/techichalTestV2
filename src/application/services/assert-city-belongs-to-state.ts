import { Logger } from '@nestjs/common';
import { CityStateMismatchException } from '../../domain/exceptions/city-state-mismatch.exception.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';

export async function assertCityBelongsToState(
  brazilData: BrazilDataServiceInterface,
  city: string,
  state: string,
  logger?: Logger,
): Promise<void> {
  const matches = await brazilData.isCityInState(city, state);
  if (matches === null) {
    logger?.warn(
      `Territorial validation skipped for ${city}/${state} (BrasilAPI degraded)`,
    );
    return;
  }
  if (!matches) {
    throw new CityStateMismatchException(
      `A cidade '${city}' não pertence ao estado '${state}'.`,
    );
  }
}
