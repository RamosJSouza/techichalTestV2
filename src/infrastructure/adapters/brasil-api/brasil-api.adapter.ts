import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
import { firstValueFrom } from 'rxjs';
import type {
  BrazilDataServiceInterface,
  BrazilLookupResult,
  CnpjCompanyData,
} from '../../../application/services/brazil-data.service.interface.js';
import type { MetricsPort } from '../../../application/services/metrics.port.js';
import type { Env } from '../../../config/env.schema.js';
import {
  MetricsService,
  type BrasilApiOperation,
  type BrasilApiResultLabel,
} from '../../observability/metrics.service.js';

interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  descricao_situacao_cadastral: string;
}

interface BrasilApiMunicipio {
  nome: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const HTTP_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

@Injectable()
export class BrasilApiAdapter implements BrazilDataServiceInterface {
  private readonly logger = new Logger(BrasilApiAdapter.name);
  private readonly baseUrl: string;
  private readonly cnpjBreaker: CircuitBreaker<
    [string],
    BrazilLookupResult<CnpjCompanyData>
  >;
  private readonly cityBreaker: CircuitBreaker<
    [string, string],
    BrazilLookupResult<boolean>
  >;
  private readonly citiesBreaker: CircuitBreaker<
    [string],
    BrazilLookupResult<string[]>
  >;
  private readonly cnpjCache = new Map<string, CacheEntry<CnpjCompanyData>>();
  private readonly citiesCache = new Map<string, CacheEntry<string[]>>();
  private cacheTtlMs = CACHE_TTL_MS;

  public constructor(
    private readonly http: HttpService,
    config: ConfigService<Env, true>,
    @Inject(MetricsService) private readonly metrics: MetricsPort,
  ) {
    this.baseUrl = config
      .get('BRASIL_API_BASE_URL', { infer: true })
      .replace(/\/+$/, '');

    const breakerOptions: CircuitBreaker.Options = {
      timeout: HTTP_TIMEOUT_MS,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 3,
    };

    this.cnpjBreaker = new CircuitBreaker(
      async (cnpj: string) => this.fetchCnpj(cnpj),
      breakerOptions,
    );
    this.cityBreaker = new CircuitBreaker(
      async (city: string, state: string) => this.fetchCityInState(city, state),
      breakerOptions,
    );
    this.citiesBreaker = new CircuitBreaker(
      async (uf: string) => this.fetchCitiesResult(uf),
      breakerOptions,
    );

    this.cnpjBreaker.fallback(() => {
      this.logger.warn(
        'BrasilAPI CNPJ circuit open — PENDING_EXTERNAL_VALIDATION',
      );
      return {
        outcome: 'PENDING_EXTERNAL_VALIDATION' as const,
        reason: 'circuit_open',
      };
    });
    this.cityBreaker.fallback(() => {
      this.logger.warn(
        'BrasilAPI IBGE circuit open — PENDING_EXTERNAL_VALIDATION',
      );
      return {
        outcome: 'PENDING_EXTERNAL_VALIDATION' as const,
        reason: 'circuit_open',
      };
    });
    this.citiesBreaker.fallback(() => {
      this.logger.warn(
        'BrasilAPI IBGE cities circuit open — PENDING_EXTERNAL_VALIDATION',
      );
      return {
        outcome: 'PENDING_EXTERNAL_VALIDATION' as const,
        reason: 'circuit_open',
      };
    });
  }

  public async getCnpjData(
    cnpj: string,
  ): Promise<BrazilLookupResult<CnpjCompanyData>> {
    return this.instrumented('cnpj', async () => {
      const digits = cnpj.replace(/\D/g, '');
      const cached = this.getCache(this.cnpjCache, digits, 'cnpj');
      if (cached !== undefined) {
        return { outcome: 'VALIDATED', data: cached };
      }

      try {
        const result = await this.cnpjBreaker.fire(digits);
        if (result.outcome === 'VALIDATED') {
          this.setCache(this.cnpjCache, digits, result.data);
        }
        this.syncCircuitGauge('cnpj', this.cnpjBreaker.opened);
        return result;
      } catch (error) {
        this.logger.warn(
          `BrasilAPI CNPJ unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        this.syncCircuitGauge('cnpj', this.cnpjBreaker.opened);
        return {
          outcome: 'PENDING_EXTERNAL_VALIDATION',
          reason: 'timeout_or_network',
        };
      }
    });
  }

  public async isCityInState(
    city: string,
    state: string,
  ): Promise<BrazilLookupResult<boolean>> {
    return this.instrumented('city', async () => {
      try {
        const result = await this.cityBreaker.fire(city, state);
        this.syncCircuitGauge('city', this.cityBreaker.opened);
        return result;
      } catch (error) {
        this.logger.warn(
          `BrasilAPI IBGE unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        this.syncCircuitGauge('city', this.cityBreaker.opened);
        return {
          outcome: 'PENDING_EXTERNAL_VALIDATION',
          reason: 'timeout_or_network',
        };
      }
    });
  }

  public async listCitiesByState(
    uf: string,
  ): Promise<BrazilLookupResult<string[]>> {
    return this.instrumented('cities', async () => {
      const key = this.assertUf(uf);
      const cached = this.getCache(this.citiesCache, key, 'cities');
      if (cached !== undefined) {
        return { outcome: 'VALIDATED', data: cached };
      }

      try {
        const result = await this.citiesBreaker.fire(key);
        if (result.outcome === 'VALIDATED') {
          this.setCache(this.citiesCache, key, result.data);
        }
        this.syncCircuitGauge('cities', this.citiesBreaker.opened);
        return result;
      } catch (error) {
        this.logger.warn(
          `BrasilAPI IBGE cities unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        this.syncCircuitGauge('cities', this.citiesBreaker.opened);
        return {
          outcome: 'PENDING_EXTERNAL_VALIDATION',
          reason: 'timeout_or_network',
        };
      }
    });
  }

  public getCircuitStats(): {
    cnpjOpen: boolean;
    cityOpen: boolean;
    citiesOpen: boolean;
  } {
    return {
      cnpjOpen: this.cnpjBreaker.opened,
      cityOpen: this.cityBreaker.opened,
      citiesOpen: this.citiesBreaker.opened,
    };
  }

  /** Expõe reset dos breakers para testes de recovery. */
  public resetCircuitsForTests(): void {
    this.cnpjBreaker.close();
    this.cityBreaker.close();
    this.citiesBreaker.close();
  }

  /** TTL curto para testes de expiração de cache. */
  public setCacheTtlForTests(ttlMs: number): void {
    this.cacheTtlMs = ttlMs;
  }

  private async fetchCnpj(
    cnpj: string,
  ): Promise<BrazilLookupResult<CnpjCompanyData>> {
    try {
      const response = await this.withRetry(() =>
        firstValueFrom(
          this.http.get<BrasilApiCnpjResponse>(
            this.buildUrl('cnpj', 'v1', cnpj),
            { timeout: HTTP_TIMEOUT_MS },
          ),
        ),
      );

      const situacao = response.data.descricao_situacao_cadastral ?? '';
      return {
        outcome: 'VALIDATED',
        data: {
          cnpj: response.data.cnpj,
          razaoSocial: response.data.razao_social,
          situacaoCadastral: situacao,
          isActive: situacao.toUpperCase() === 'ATIVA',
        },
      };
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return {
          outcome: 'REJECTED',
          reason: 'CNPJ não encontrado na Receita Federal.',
        };
      }
      throw error;
    }
  }

  private async fetchCitiesResult(
    uf: string,
  ): Promise<BrazilLookupResult<string[]>> {
    const cities = await this.loadCities(uf);
    return { outcome: 'VALIDATED', data: cities };
  }

  private async fetchCityInState(
    city: string,
    state: string,
  ): Promise<BrazilLookupResult<boolean>> {
    const uf = this.assertUf(state);
    const cached = this.getCache(this.citiesCache, uf, 'city');
    const cities =
      cached !== undefined ? cached : await this.loadCities(uf);
    if (cached === undefined) {
      this.setCache(this.citiesCache, uf, cities);
    }
    const normalizedCity = this.normalize(city);
    const matches = cities.some(
      (nome) => this.normalize(nome) === normalizedCity,
    );
    return { outcome: 'VALIDATED', data: matches };
  }

  private async loadCities(uf: string): Promise<string[]> {
    const safeUf = this.assertUf(uf);
    const response = await this.withRetry(() =>
      firstValueFrom(
        this.http.get<BrasilApiMunicipio[]>(
          this.buildUrl('ibge', 'municipios', 'v1', safeUf),
          { timeout: HTTP_TIMEOUT_MS },
        ),
      ),
    );
    return response.data.map((municipio) => municipio.nome);
  }

  private buildUrl(...segments: string[]): string {
    const path = segments.map((s) => encodeURIComponent(s)).join('/');
    return `${this.baseUrl}/${path}`;
  }

  private assertUf(state: string): string {
    const uf = state.toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(uf)) {
      throw new Error('Invalid UF for BrasilAPI lookup');
    }
    return uf;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    attempts = MAX_ATTEMPTS,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isTransientError(error) || attempt >= attempts) {
          throw error;
        }
        const delayMs = 200 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }

  private isTransientError(error: unknown): boolean {
    if (!(error instanceof AxiosError)) {
      return true;
    }
    const status = error.response?.status;
    if (status === 404) {
      return false;
    }
    if (status !== undefined && status >= 400 && status < 500) {
      return false;
    }
    return true;
  }

  private getCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    operation: BrasilApiOperation,
  ): T | undefined {
    const entry = cache.get(key);
    if (!entry) {
      this.metrics.recordBrasilApiCache(operation, 'miss');
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      this.metrics.recordBrasilApiCache(operation, 'expired');
      return undefined;
    }
    this.metrics.recordBrasilApiCache(operation, 'hit');
    return entry.value;
  }

  private setCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T,
  ): void {
    cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  private async instrumented<T>(
    operation: BrasilApiOperation,
    fn: () => Promise<BrazilLookupResult<T>>,
  ): Promise<BrazilLookupResult<T>> {
    const started = process.hrtime.bigint();
    try {
      const result = await fn();
      this.recordMetrics(operation, this.resultLabel(result), started);
      return result;
    } catch (error) {
      this.recordMetrics(operation, 'error', started);
      throw error;
    }
  }

  private resultLabel<T>(
    result: BrazilLookupResult<T>,
  ): BrasilApiResultLabel {
    switch (result.outcome) {
      case 'VALIDATED':
        return 'success';
      case 'PENDING_EXTERNAL_VALIDATION':
        return 'fallback';
      case 'REJECTED':
        return 'rejected';
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  private recordMetrics(
    operation: BrasilApiOperation,
    result: BrasilApiResultLabel,
    started: bigint,
  ): void {
    const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
    this.metrics.recordBrasilApiRequest(operation, result, durationSeconds);
  }

  private syncCircuitGauge(
    name: 'cnpj' | 'city' | 'cities',
    open: boolean,
  ): void {
    this.metrics.setCircuitOpen(name, open);
  }
}
