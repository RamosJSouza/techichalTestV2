export type EsgStatus = 'APPROVED' | 'WARNING' | 'BLOCKED';

interface SocioEnvironmentalCheckResult {
  hasIbamaEmbargo: boolean;
  hasSlaveLaborFlag: boolean;
  details: string[];
}

interface SocioEnvironmentalDecision {
  status: EsgStatus;
  blocked: boolean;
}

export class SocioEnvironmentalPolicy {
  public static decide(
    check: SocioEnvironmentalCheckResult,
    strictMode: boolean,
  ): SocioEnvironmentalDecision {
    const restricted = check.hasIbamaEmbargo || check.hasSlaveLaborFlag;
    if (!restricted) {
      return { status: 'APPROVED', blocked: false };
    }
    if (strictMode) {
      return { status: 'BLOCKED', blocked: true };
    }
    return { status: 'WARNING', blocked: false };
  }
}

export function localSocioEnvironmentalCheck(
  _documentDigits: string,
): SocioEnvironmentalCheckResult {
  return {
    hasIbamaEmbargo: false,
    hasSlaveLaborFlag: false,
    details: [],
  };
}
