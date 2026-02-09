import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import './ErrorHandling.css';

// ============================================
// TOAST CONTEXT
// ============================================
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);

    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = ++toastIdRef.current;

        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t =>
            t.id === id ? { ...t, exiting: true } : t
        ));

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    const showError = useCallback((message, duration = 5000) =>
        addToast(message, 'error', duration), [addToast]);

    const showWarning = useCallback((message, duration = 5000) =>
        addToast(message, 'warning', duration), [addToast]);

    const showSuccess = useCallback((message, duration = 3000) =>
        addToast(message, 'success', duration), [addToast]);

    const showInfo = useCallback((message, duration = 4000) =>
        addToast(message, 'info', duration), [addToast]);

    return (
        <ToastContext.Provider value={{
            addToast,
            removeToast,
            showError,
            showWarning,
            showSuccess,
            showInfo
        }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// ============================================
// TOAST CONTAINER
// ============================================
function ToastContainer({ toasts, onDismiss }) {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onDismiss={() => onDismiss(toast.id)}
                />
            ))}
        </div>
    );
}

// ============================================
// TOAST COMPONENT
// ============================================
function Toast({ toast, onDismiss }) {
    const icons = {
        error: '❌',
        warning: '⚠️',
        success: '✅',
        info: 'ℹ️'
    };

    return (
        <div className={`toast toast-${toast.type} ${toast.exiting ? 'exiting' : ''}`}>
            <span className="toast-icon">{icons[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-dismiss" onClick={onDismiss}>×</button>
        </div>
    );
}

// ============================================
// LOADING SPINNER
// ============================================
export function LoadingSpinner({
    message,
    overlay = false,
    size = 'medium',
    progress = null
}) {
    const sizeClass = `spinner-${size}`;

    const spinner = (
        <div className={`loading-spinner ${sizeClass}`}>
            <div className="spinner-circle">
                <svg viewBox="0 0 50 50">
                    <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        strokeWidth="4"
                        className="spinner-track"
                    />
                    <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        strokeWidth="4"
                        className="spinner-progress"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
            {message && <p className="spinner-message">{message}</p>}
            {progress !== null && (
                <div className="spinner-progress-bar">
                    <div
                        className="spinner-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                    <span className="spinner-progress-text">{Math.round(progress)}%</span>
                </div>
            )}
        </div>
    );

    if (overlay) {
        return (
            <div className="loading-overlay">
                {spinner}
            </div>
        );
    }

    return spinner;
}

// ============================================
// CONNECTION STATUS INDICATOR
// ============================================
export function ConnectionStatus({ status, onRetry }) {
    const statusConfig = {
        connected: {
            color: 'green',
            text: 'Connected',
            icon: '●',
            pulse: true
        },
        connecting: {
            color: 'yellow',
            text: 'Connecting...',
            icon: '◐',
            pulse: true
        },
        reconnecting: {
            color: 'yellow',
            text: 'Reconnecting...',
            icon: '◑',
            pulse: true
        },
        disconnected: {
            color: 'red',
            text: 'Disconnected',
            icon: '○',
            pulse: false
        },
        offline: {
            color: 'red',
            text: 'Offline',
            icon: '⊘',
            pulse: false
        }
    };

    const config = statusConfig[status] || statusConfig.disconnected;

    return (
        <div className={`connection-status status-${config.color}`}>
            <span className={`status-indicator ${config.pulse ? 'pulse' : ''}`}>
                {config.icon}
            </span>
            <span className="status-text">{config.text}</span>
            {(status === 'disconnected' || status === 'offline') && onRetry && (
                <button className="retry-btn" onClick={onRetry}>
                    Retry
                </button>
            )}
        </div>
    );
}

// ============================================
// ERROR BOUNDARY
// ============================================
import { Component } from 'react';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });

        // Log to external service if needed
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleRetry);
            }

            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-icon">😵</div>
                        <h2>Oops! Something went wrong</h2>
                        <p className="error-message">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button className="btn btn-primary" onClick={this.handleRetry}>
                            🔄 Try Again
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="error-details">
                                <summary>Error Details</summary>
                                <pre>{this.state.errorInfo.componentStack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// ============================================
// NETWORK STATUS HOOK
// ============================================
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (wasOffline) {
                // Trigger reconnection logic
                window.dispatchEvent(new CustomEvent('network-restored'));
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            setWasOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [wasOffline]);

    return { isOnline, wasOffline };
}

// ============================================
// SOCKET CONNECTION MANAGER
// ============================================
export function useSocketConnection(socket, options = {}) {
    const {
        maxRetries = 5,
        baseDelay = 1000,
        onConnect,
        onDisconnect,
        onError
    } = options;

    const [status, setStatus] = useState('connecting');
    const [retryCount, setRetryCount] = useState(0);
    const retryTimeoutRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => {
            setStatus('connected');
            setRetryCount(0);
            if (onConnect) onConnect();
        };

        const handleDisconnect = (reason) => {
            console.log('Socket disconnected:', reason);
            setStatus('disconnected');
            if (onDisconnect) onDisconnect(reason);

            // Auto-retry on disconnect
            if (reason === 'io server disconnect') {
                // Server disconnected, don't auto-retry
                return;
            }
            attemptReconnect();
        };

        const handleError = (err) => {
            console.error('Socket error:', err);
            setStatus('disconnected');
            if (onError) onError(err);
        };

        const handleConnecting = () => {
            setStatus(retryCount > 0 ? 'reconnecting' : 'connecting');
        };

        const attemptReconnect = () => {
            if (retryCount >= maxRetries) {
                console.error('Max reconnection attempts reached');
                return;
            }

            const delay = baseDelay * Math.pow(2, retryCount);
            console.log(`Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

            retryTimeoutRef.current = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                socket.connect();
            }, delay);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleError);
        socket.io.on('reconnect_attempt', handleConnecting);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleError);
            socket.io.off('reconnect_attempt', handleConnecting);
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [socket, retryCount, maxRetries, baseDelay, onConnect, onDisconnect, onError]);

    const manualRetry = useCallback(() => {
        setRetryCount(0);
        socket?.connect();
    }, [socket]);

    return { status, retryCount, manualRetry };
}

// ============================================
// ASYNC OPERATION WRAPPER
// ============================================
export function useAsyncOperation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(null);

    const execute = useCallback(async (asyncFn, options = {}) => {
        const {
            onSuccess,
            onError: handleError,
            loadingMessage,
            successMessage
        } = options;

        setLoading(true);
        setError(null);
        setProgress(0);

        try {
            const result = await asyncFn((p) => setProgress(p));
            setProgress(100);

            if (onSuccess) onSuccess(result);
            return { success: true, data: result };
        } catch (err) {
            console.error('Async operation failed:', err);
            setError(err.message || 'Operation failed');

            if (handleError) handleError(err);
            return { success: false, error: err };
        } finally {
            setLoading(false);
            setTimeout(() => setProgress(null), 500);
        }
    }, []);

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setProgress(null);
    }, []);

    return { loading, error, progress, execute, reset };
}

// ============================================
// INPUT VALIDATION
// ============================================
export function useInputValidation(rules = {}) {
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validate = useCallback((name, value) => {
        const fieldRules = rules[name];
        if (!fieldRules) return null;

        let error = null;

        if (fieldRules.required && !value) {
            error = fieldRules.requiredMessage || 'This field is required';
        } else if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            error = `Maximum ${fieldRules.maxLength} characters allowed`;
        } else if (fieldRules.minLength && value.length < fieldRules.minLength) {
            error = `Minimum ${fieldRules.minLength} characters required`;
        } else if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
            error = fieldRules.patternMessage || 'Invalid format';
        } else if (fieldRules.custom) {
            error = fieldRules.custom(value);
        }

        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    }, [rules]);

    const touch = useCallback((name) => {
        setTouched(prev => ({ ...prev, [name]: true }));
    }, []);

    const reset = useCallback(() => {
        setErrors({});
        setTouched({});
    }, []);

    return { errors, touched, validate, touch, reset };
}

// ============================================
// FILE VALIDATION
// ============================================
export function validateFile(file, options = {}) {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB
        allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        allowedExtensions = ['.pdf', '.txt', '.docx']
    } = options;

    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    if (file.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
        return {
            valid: false,
            error: `File too large. Maximum size is ${sizeMB}MB`,
            suggestion: 'Try compressing the file or splitting it into smaller parts'
        };
    }

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type: ${file.type || 'unknown'}`,
            suggestion: `Allowed formats: ${allowedExtensions.join(', ')}`
        };
    }

    return { valid: true };
}

// ============================================
// FALLBACK TRANSLATION (when Gemini fails)
// ============================================
export function getFallbackTranslation(text) {
    // Simple word-to-sign mapping for common words
    const wordMap = {
        'hello': { gloss: 'HELLO', expression: 'happy' },
        'hi': { gloss: 'HELLO', expression: 'happy' },
        'goodbye': { gloss: 'GOODBYE', expression: 'neutral' },
        'bye': { gloss: 'GOODBYE', expression: 'neutral' },
        'thank': { gloss: 'THANK-YOU', expression: 'grateful' },
        'thanks': { gloss: 'THANK-YOU', expression: 'grateful' },
        'please': { gloss: 'PLEASE', expression: 'neutral' },
        'sorry': { gloss: 'SORRY', expression: 'sad' },
        'yes': { gloss: 'YES', expression: 'neutral' },
        'no': { gloss: 'NO', expression: 'neutral' },
        'help': { gloss: 'HELP', expression: 'questioning' },
        'what': { gloss: 'WHAT', expression: 'questioning' },
        'where': { gloss: 'WHERE', expression: 'questioning' },
        'when': { gloss: 'WHEN', expression: 'questioning' },
        'how': { gloss: 'HOW', expression: 'questioning' },
        'why': { gloss: 'WHY', expression: 'questioning' },
        'who': { gloss: 'WHO', expression: 'questioning' },
        'i': { gloss: 'I/ME', expression: 'neutral' },
        'me': { gloss: 'I/ME', expression: 'neutral' },
        'you': { gloss: 'YOU', expression: 'neutral' },
        'love': { gloss: 'LOVE', expression: 'happy' },
        'good': { gloss: 'GOOD', expression: 'happy' },
        'bad': { gloss: 'BAD', expression: 'sad' },
        'understand': { gloss: 'UNDERSTAND', expression: 'neutral' },
        'know': { gloss: 'KNOW', expression: 'neutral' },
        'want': { gloss: 'WANT', expression: 'neutral' },
        'need': { gloss: 'NEED', expression: 'neutral' },
        'name': { gloss: 'NAME', expression: 'questioning' },
        'nice': { gloss: 'NICE', expression: 'happy' },
        'meet': { gloss: 'MEET', expression: 'happy' }
    };

    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const signs = [];

    for (const word of words) {
        if (wordMap[word]) {
            signs.push({
                gloss: wordMap[word].gloss,
                expression: wordMap[word].expression,
                duration: 1.5
            });
        } else if (word.length > 0) {
            // Fingerspell unknown words
            signs.push({
                gloss: `FS-${word.toUpperCase()}`,
                expression: 'neutral',
                duration: word.length * 0.3
            });
        }
    }

    return {
        signs,
        isFallback: true,
        warning: 'Using simplified translation mode'
    };
}

// ============================================
// PERMISSION REQUEST HELPERS
// ============================================
export async function requestCameraPermission(showToast) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return { granted: true };
    } catch (err) {
        console.error('Camera permission denied:', err);

        if (showToast) {
            showToast(
                'Camera access required for spatial awareness features. You can continue without the camera.',
                'warning',
                8000
            );
        }

        return {
            granted: false,
            error: err.name === 'NotAllowedError'
                ? 'Camera access was denied'
                : 'Could not access camera',
            limitedFeatures: ['Object detection', 'Spatial pointing', 'Sign analysis']
        };
    }
}

export async function requestMicrophonePermission(showToast) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return { granted: true };
    } catch (err) {
        console.error('Microphone permission denied:', err);

        if (showToast) {
            showToast(
                'Microphone access required for voice input. You can still use text input.',
                'warning',
                8000
            );
        }

        return {
            granted: false,
            error: err.name === 'NotAllowedError'
                ? 'Microphone access was denied'
                : 'Could not access microphone',
            alternative: 'Use the text input field to type your messages'
        };
    }
}
