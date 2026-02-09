// ============================================
// LOGGING UTILITY
// Structured logging for debugging and monitoring
// ============================================

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const currentLevel = process.env.LOG_LEVEL
    ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
    : LOG_LEVELS.INFO;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Format timestamp
function getTimestamp() {
    return new Date().toISOString();
}

// Format log message
function formatMessage(level, category, message, data = null) {
    const timestamp = getTimestamp();
    const prefix = `[${timestamp}] [${level}] [${category}]`;

    if (data) {
        return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
}

// Logger class
class Logger {
    constructor(category = 'APP') {
        this.category = category;
    }

    debug(message, data = null) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            console.log(
                `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
                `${colors.cyan}[DEBUG]${colors.reset} ` +
                `${colors.magenta}[${this.category}]${colors.reset} ` +
                message,
                data ? data : ''
            );
        }
    }

    info(message, data = null) {
        if (currentLevel <= LOG_LEVELS.INFO) {
            console.log(
                `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
                `${colors.green}[INFO]${colors.reset} ` +
                `${colors.magenta}[${this.category}]${colors.reset} ` +
                message,
                data ? data : ''
            );
        }
    }

    warn(message, data = null) {
        if (currentLevel <= LOG_LEVELS.WARN) {
            console.warn(
                `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
                `${colors.yellow}[WARN]${colors.reset} ` +
                `${colors.magenta}[${this.category}]${colors.reset} ` +
                message,
                data ? data : ''
            );
        }
    }

    error(message, error = null) {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            console.error(
                `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
                `${colors.red}[ERROR]${colors.reset} ` +
                `${colors.magenta}[${this.category}]${colors.reset} ` +
                message,
                error ? (error.stack || error) : ''
            );
        }
    }

    // Log API request/response
    api(method, endpoint, status, duration) {
        const statusColor = status >= 400 ? colors.red : colors.green;
        console.log(
            `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
            `${colors.blue}[API]${colors.reset} ` +
            `${method} ${endpoint} ` +
            `${statusColor}${status}${colors.reset} ` +
            `${colors.dim}${duration}ms${colors.reset}`
        );
    }

    // Log Socket.IO event
    socket(event, direction, socketId, data = null) {
        const arrow = direction === 'in' ? '→' : '←';
        const dirColor = direction === 'in' ? colors.cyan : colors.green;
        console.log(
            `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
            `${colors.magenta}[SOCKET]${colors.reset} ` +
            `${dirColor}${arrow}${colors.reset} ` +
            `${event} ` +
            `${colors.dim}[${socketId.slice(0, 8)}]${colors.reset}`,
            data ? (typeof data === 'object' ? JSON.stringify(data).slice(0, 100) : data) : ''
        );
    }

    // Log Gemini API call
    gemini(method, duration, success, tokens = null) {
        const status = success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
        console.log(
            `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
            `${colors.blue}[GEMINI]${colors.reset} ` +
            `${status} ${method} ` +
            `${colors.dim}${duration}ms${colors.reset}` +
            (tokens ? ` ${colors.dim}(${tokens} tokens)${colors.reset}` : '')
        );
    }
}

// Create default loggers
export const serverLogger = new Logger('SERVER');
export const socketLogger = new Logger('SOCKET');
export const geminiLogger = new Logger('GEMINI');
export const apiLogger = new Logger('API');

// Default export
export default Logger;

// Helper for request timing
export function measureTime(fn) {
    const start = Date.now();
    return async (...args) => {
        try {
            const result = await fn(...args);
            return { result, duration: Date.now() - start };
        } catch (error) {
            throw { error, duration: Date.now() - start };
        }
    };
}
