export const APP_CONFIG_PORT = Symbol('APP_CONFIG_PORT');

export interface AppConfigPort {
  isEsgStrictMode(): boolean;
}
