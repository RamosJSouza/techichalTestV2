export const APP_CONFIG_PORT = Symbol('APP_CONFIG_PORT');

/** Configuração de aplicação consumida pelos use cases (sem Nest). */
export interface AppConfigPort {
  isEsgStrictMode(): boolean;
}
