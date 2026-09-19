import { SocioEnvironmentalPolicy } from './socio-environmental.policy.js';

describe('SocioEnvironmentalPolicy', () => {
  it('aprova sem restrições', () => {
    const decision = SocioEnvironmentalPolicy.decide(
      { hasIbamaEmbargo: false, hasSlaveLaborFlag: false, details: [] },
      true,
    );
    expect(decision).toEqual({ status: 'APPROVED', blocked: false });
  });

  it('bloqueia em modo estrito', () => {
    const decision = SocioEnvironmentalPolicy.decide(
      { hasIbamaEmbargo: true, hasSlaveLaborFlag: false, details: ['embargo'] },
      true,
    );
    expect(decision.blocked).toBe(true);
    expect(decision.status).toBe('BLOCKED');
  });

  it('marca WARNING sem bloquear fora do modo estrito', () => {
    const decision = SocioEnvironmentalPolicy.decide(
      { hasIbamaEmbargo: false, hasSlaveLaborFlag: true, details: ['slave'] },
      false,
    );
    expect(decision).toEqual({ status: 'WARNING', blocked: false });
  });
});
