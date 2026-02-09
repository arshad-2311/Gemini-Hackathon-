// ============================================
// FRONTEND LOGGING UTILITY
// Client-side logging for debugging
// ============================================

const isDev = import.meta.env.DEV;

// Log levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Current log level (show all in dev, only errors in prod)
const currentLevel = isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

// Styles for console
const styles = {
    timestamp: 'color: #888; font-size: 10px;',
    debug: 'color: #888;',
    info: 'color: #4ade80;',
    warn: 'color: #fbbf24;',
    error: 'color: #f87171; font-weight: bold;',
    socket: 'color: #a78bfa;',
    avatar: 'color: #60a5fa;',
    speech: 'color: #f472b6;'
};

// Format timestamp
function getTimestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// Logger class
class ClientLogger {
    constructor(category = 'App') {
        this.category = category;
    }

    debug(message, data = null) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            console.log(
                `%c[${getTimestamp()}] %c[${this.category}] %c${message}`,
                styles.timestamp,
                styles.debug,
                'color: inherit;',
                data || ''
            );
        }
    }

    info(message, data = null) {
        if (currentLevel <= LOG_LEVELS.INFO) {
            console.log(
                `%c[${getTimestamp()}] %c[${this.category}] %c${message}`,
                styles.timestamp,
                styles.info,
                'color: inherit;',
                data || ''
            );
        }
    }

    warn(message, data = null) {
        if (currentLevel <= LOG_LEVELS.WARN) {
            console.warn(
                `%c[${getTimestamp()}] %c[${this.category}] %c${message}`,
                styles.timestamp,
                styles.warn,
                'color: inherit;',
                data || ''
            );
        }
    }

    error(message, error = null) {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            console.error(
                `%c[${getTimestamp()}] %c[${this.category}] %c${message}`,
                styles.timestamp,
                styles.error,
                'color: inherit;',
                error || ''
            );
        }
    }

    // Log socket events
    socket(event, direction, data = null) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            const arrow = direction === 'emit' ? '→' : '←';
            console.log(
                `%c[${getTimestamp()}] %c[Socket] %c${arrow} ${event}`,
                styles.timestamp,
                styles.socket,
                'color: inherit;',
                data ? (typeof data === 'object' ? JSON.stringify(data).slice(0, 50) + '...' : data) : ''
            );
        }
    }

    // Log avatar actions
    avatar(action, data = null) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            console.log(
                `%c[${getTimestamp()}] %c[Avatar] %c${action}`,
                styles.timestamp,
                styles.avatar,
                'color: inherit;',
                data || ''
            );
        }
    }

    // Log speech events
    speech(action, text = null) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            console.log(
                `%c[${getTimestamp()}] %c[Speech] %c${action}`,
                styles.timestamp,
                styles.speech,
                'color: inherit;',
                text || ''
            );
        }
    }

    // Performance timing
    time(label) {
        if (isDev) {
            console.time(`[${this.category}] ${label}`);
        }
    }

    timeEnd(label) {
        if (isDev) {
            console.timeEnd(`[${this.category}] ${label}`);
        }
    }

    // Group logs
    group(label) {
        if (isDev) {
            console.group(`[${this.category}] ${label}`);
        }
    }

    groupEnd() {
        if (isDev) {
            console.groupEnd();
        }
    }
}

// Create category loggers
export const appLogger = new ClientLogger('App');
export const socketLog = new ClientLogger('Socket');
export const avatarLog = new ClientLogger('Avatar');
export const speechLog = new ClientLogger('Speech');
export const teachingLog = new ClientLogger('Teaching');

// Default export
export default ClientLogger;

// Performance measurement
export function measureRender(componentName) {
    const start = performance.now();
    return () => {
        const duration = performance.now() - start;
        if (duration > 16.67) { // Longer than one frame at 60fps
            appLogger.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
        }
    };
}
