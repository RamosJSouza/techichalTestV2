export type EsgStatus = 'APPROVED' | 'WARNING' | 'BLOCKED';

export interface SocioEnvironmentalCheckResult {
  hasIbamaEmbargo: boolean;
  hasSlaveLaborFlag: boolean;
  details: string[];
}

export interface SocioEnvironmentalDecision {
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
