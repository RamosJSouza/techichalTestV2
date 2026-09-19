import { TextEncoder, TextDecoder } from 'node:util';
import '@testing-library/jest-dom';

Object.assign(globalThis, { TextEncoder, TextDecoder });
