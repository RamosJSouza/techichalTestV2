import { CityStateMismatchException } from '../../domain/exceptions/city-state-mismatch.exception.js';
import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';
import type { BrazilDataServiceInterface } from './brazil-data.service.interface.js';
import type { LoggerPort } from './logger.port.js';

interface TerritorialValidationOutcome {
  status: ExternalValidationStatus;
  pendingReason: string | null;
}

export async function assertCityBelongsToState(
  brazilData: BrazilDataServiceInterface,
  city: string,
  state: string,
  logger?: LoggerPort,
): Promise<TerritorialValidationOutcome> {
  const result = await brazilData.isCityInState(city, state);

  switch (result.outcome) {
    case 'PENDING_EXTERNAL_VALIDATION':
      logger?.warn(
        `Territorial validation pending for ${city}/${state} (BrasilAPI unavailable): ${result.reason}`,
      );
      return {
        status: 'PENDING_EXTERNAL_VALIDATION',
        pendingReason: result.reason,
      };
    case 'REJECTED':
      throw new CityStateMismatchException(
        result.reason ||
          `A cidade '${city}' não pertence ao estado '${state}'.`,
      );
    case 'VALIDATED':
      if (!result.data) {
        throw new CityStateMismatchException(
          `A cidade '${city}' não pertence ao estado '${state}'.`,
        );
      }
      return { status: 'VALIDATED', pendingReason: null };
    default: {
      const _exhaustive: never = result;
      throw new Error(`Unexpected BrazilLookupResult: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
