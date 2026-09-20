import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
import { firstValueFrom } from 'rxjs';
import type {
  BrazilDataServiceInterface,
  CnpjCompanyData,
} from '../../../application/services/brazil-data.service.interface.js';
import type { Env } from '../../../config/env.schema.js';

interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  descricao_situacao_cadastral: string;
}

interface BrasilApiMunicipio {
  nome: string;
}

@Injectable()
export class BrasilApiAdapter implements BrazilDataServiceInterface {
  private readonly logger = new Logger(BrasilApiAdapter.name);
  private readonly baseUrl: string;
  private readonly cnpjBreaker: CircuitBreaker<[string], CnpjCompanyData | null>;
  private readonly cityBreaker: CircuitBreaker<[string, string], boolean | null>;
  private readonly citiesBreaker: CircuitBreaker<[string], string[] | null>;

  public constructor(
    private readonly http: HttpService,
    config: ConfigService<Env, true>,
  ) {
    this.baseUrl = config.get('BRASIL_API_BASE_URL', { infer: true });

    const breakerOptions: CircuitBreaker.Options = {
      timeout: 5000,
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
      async (uf: string) => this.fetchCities(uf),
      breakerOptions,
    );

    this.cnpjBreaker.fallback(() => {
      this.logger.warn(
        'BrasilAPI CNPJ circuit open — graceful degradation (sync pending)',
      );
      return null;
    });
    this.cityBreaker.fallback(() => {
      this.logger.warn(
        'BrasilAPI IBGE circuit open — graceful degradation (sync pending)',
      );
      return null;
    });
    this.citiesBreaker.fallback(() => {
      this.logger.warn(
        'BrasilAPI IBGE cities circuit open — graceful degradation',
      );
      return null;
    });
  }

  public async getCnpjData(cnpj: string): Promise<CnpjCompanyData | null> {
    try {
      return await this.cnpjBreaker.fire(cnpj);
    } catch (error) {
      this.logger.warn(
        `BrasilAPI CNPJ unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  public async isCityInState(
    city: string,
    state: string,
  ): Promise<boolean | null> {
    try {
      return await this.cityBreaker.fire(city, state);
    } catch (error) {
      this.logger.warn(
        `BrasilAPI IBGE unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  public async listCitiesByState(uf: string): Promise<string[] | null> {
    try {
      return await this.citiesBreaker.fire(uf);
    } catch (error) {
      this.logger.warn(
        `BrasilAPI IBGE cities unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
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

  private async fetchCnpj(cnpj: string): Promise<CnpjCompanyData> {
    try {
      const response = await this.withRetry(() =>
        firstValueFrom(
          this.http.get<BrasilApiCnpjResponse>(
            `${this.baseUrl}/cnpj/v1/${cnpj}`,
          ),
        ),
      );

      const situacao = response.data.descricao_situacao_cadastral ?? '';
      return {
        cnpj: response.data.cnpj,
        razaoSocial: response.data.razao_social,
        situacaoCadastral: situacao,
        isActive: situacao.toUpperCase() === 'ATIVA',
      };
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return {
          cnpj,
          razaoSocial: '',
          situacaoCadastral: 'NÃO ENCONTRADO',
          isActive: false,
        };
      }
      throw error;
    }
  }

  private async fetchCities(uf: string): Promise<string[]> {
    const response = await this.withRetry(() =>
      firstValueFrom(
        this.http.get<BrasilApiMunicipio[]>(
          `${this.baseUrl}/ibge/municipios/v1/${uf.toUpperCase()}`,
        ),
      ),
    );
    return response.data.map((municipio) => municipio.nome);
  }

  private async fetchCityInState(
    city: string,
    state: string,
  ): Promise<boolean> {
    const cities = await this.fetchCities(state);
    const normalizedCity = this.normalize(city);
    return cities.some((nome) => this.normalize(nome) === normalizedCity);
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
    attempts = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          const delayMs = 200 * 2 ** (attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError;
  }
}
