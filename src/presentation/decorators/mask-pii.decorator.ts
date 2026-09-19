import { SetMetadata } from '@nestjs/common';

export const MASK_PII_KEY = 'maskPii';

/** Opt-in: o MaskPiiInterceptor só mascara quando este decorator está presente. */
export const MaskPII = (): MethodDecorator & ClassDecorator =>
  SetMetadata(MASK_PII_KEY, true);
