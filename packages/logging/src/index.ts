export { createError, EvlogError, parseError, createLogger, initLogger, log } from 'evlog';
export type { RequestLogger } from 'evlog';
export {
    loggingOptions,
    redactEvent,
    sanitizeFailure,
    type Failure,
    initProcessLogger,
} from './privacy';
