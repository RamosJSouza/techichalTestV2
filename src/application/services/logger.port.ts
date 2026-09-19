export const LOGGER_PORT = Symbol('LOGGER_PORT');

export interface LoggerPort {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
