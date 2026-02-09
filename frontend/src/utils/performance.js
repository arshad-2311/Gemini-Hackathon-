// ============================================
// PERFORMANCE OPTIMIZATION UTILITIES
// Comprehensive optimization for smooth 60fps
// ============================================

import { useRef, useEffect, useCallback, useMemo } from 'react';

// ============================================
// PERFORMANCE MONITORING
// ============================================

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 60,
            frameTime: 16.67,
            apiCalls: [],
            memoryUsage: 0,
            bundleLoadTime: 0
        };
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.fpsHistory = [];
        this.isMonitoring = false;
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.rafId = requestAnimationFrame(this.measureFrame.bind(this));
    }

    stopMonitoring() {
        this.isMonitoring = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
    }

    measureFrame(timestamp) {
        this.frameCount++;
        const delta = timestamp - this.lastFrameTime;

        if (delta >= 1000) {
            this.metrics.fps = Math.round((this.frameCount * 1000) / delta);
            this.metrics.frameTime = delta / this.frameCount;
            this.fpsHistory.push(this.metrics.fps);

            // Keep last 60 measurements
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
            }

            this.frameCount = 0;
            this.lastFrameTime = timestamp;

            // Log warning if FPS drops
            if (this.metrics.fps < 30) {
                console.warn(`⚠️ Low FPS detected: ${this.metrics.fps}`);
            }
        }

        if (this.isMonitoring) {
            this.rafId = requestAnimationFrame(this.measureFrame.bind(this));
        }
    }

    logApiCall(endpoint, duration, success) {
        this.metrics.apiCalls.push({
            endpoint,
            duration,
            success,
            timestamp: Date.now()
        });

        // Keep last 100 calls
        if (this.metrics.apiCalls.length > 100) {
            this.metrics.apiCalls.shift();
        }

        if (duration > 2000) {
            console.warn(`⚠️ Slow API call: ${endpoint} took ${duration}ms`);
        }
    }

    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 60;
        return Math.round(this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length);
    }

    getMetrics() {
        return {
            ...this.metrics,
            averageFPS: this.getAverageFPS(),
            memoryUsage: this.getMemoryUsage()
        };
    }

    getMemoryUsage() {
        if (performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / 1048576);
        }
        return null;
    }
}

export const performanceMonitor = new PerformanceMonitor();

// ============================================
// THROTTLE & DEBOUNCE
// ============================================

export function throttle(func, limit) {
    let inThrottle;
    let lastFunc;
    let lastRan;

    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            lastRan = Date.now();
            inThrottle = true;
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

export function debounce(func, wait, immediate = false) {
    let timeout;

    return function (...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(this, args);
    };
}

// ============================================
// OPTIMIZED HOOKS
// ============================================

// Throttled callback for frequent events
export function useThrottledCallback(callback, delay, deps = []) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useMemo(
        () => throttle((...args) => callbackRef.current(...args), delay),
        [delay, ...deps]
    );
}

// Debounced callback for user inputs
export function useDebouncedCallback(callback, delay, deps = []) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useMemo(
        () => debounce((...args) => callbackRef.current(...args), delay),
        [delay, ...deps]
    );
}

// Debounced value (for search inputs, etc.)
export function useDebouncedValue(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// ============================================
// OBJECT POOLING
// ============================================

class ObjectPool {
    constructor(factory, reset, initialSize = 10) {
        this.factory = factory;
        this.reset = reset;
        this.pool = [];

        // Pre-create objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    acquire() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.factory();
    }

    release(obj) {
        this.reset(obj);
        this.pool.push(obj);
    }

    clear() {
        this.pool = [];
    }
}

// Vector3 pool for Three.js
export const vector3Pool = new ObjectPool(
    () => ({ x: 0, y: 0, z: 0 }),
    (v) => { v.x = 0; v.y = 0; v.z = 0; },
    20
);

// Animation keyframe pool
export const keyframePool = new ObjectPool(
    () => ({ time: 0, value: 0, easing: 'linear' }),
    (k) => { k.time = 0; k.value = 0; k.easing = 'linear'; },
    50
);

// ============================================
// THREE.JS OPTIMIZATION UTILITIES
// ============================================

export function optimizeThreeRenderer(renderer) {
    if (!renderer) return;

    // Limit pixel ratio for performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable performance mode
    renderer.powerPreference = 'high-performance';

    // Disable unnecessary features
    renderer.shadowMap.enabled = false; // Enable only if needed
    renderer.debug.checkShaderErrors = process.env.NODE_ENV === 'development';

    // Enable sorting for transparency
    renderer.sortObjects = true;

    return renderer;
}

export function disposeThreeObject(object) {
    if (!object) return;

    // Dispose geometry
    if (object.geometry) {
        object.geometry.dispose();
    }

    // Dispose materials
    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(material => disposeMaterial(material));
        } else {
            disposeMaterial(object.material);
        }
    }

    // Recursively dispose children
    if (object.children) {
        [...object.children].forEach(child => disposeThreeObject(child));
    }
}

function disposeMaterial(material) {
    if (!material) return;

    // Dispose textures
    Object.keys(material).forEach(key => {
        if (material[key] && typeof material[key].dispose === 'function') {
            material[key].dispose();
        }
    });

    material.dispose();
}

// Frame limiter for non-critical updates
export function createFrameLimiter(targetFPS = 30) {
    let lastFrameTime = 0;
    const frameInterval = 1000 / targetFPS;

    return function shouldUpdate(timestamp) {
        const elapsed = timestamp - lastFrameTime;

        if (elapsed >= frameInterval) {
            lastFrameTime = timestamp - (elapsed % frameInterval);
            return true;
        }
        return false;
    };
}

// ============================================
// ANIMATION UTILITIES
// ============================================

// Smooth lerp (linear interpolation)
export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// Smooth damp (for camera/following)
export function smoothDamp(current, target, velocity, smoothTime, deltaTime) {
    const omega = 2 / smoothTime;
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

    let change = current - target;
    const maxChange = Infinity;
    change = Math.max(-maxChange, Math.min(maxChange, change));

    const temp = (velocity + omega * change) * deltaTime;
    velocity = (velocity - omega * temp) * exp;

    let result = target + (change + temp) * exp;

    // Prevent overshooting
    if ((target - current > 0) === (result > target)) {
        result = target;
        velocity = 0;
    }

    return { value: result, velocity };
}

// Easing functions
export const easings = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

// ============================================
// CACHING UTILITIES
// ============================================

class LRUCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;

        // Move to end (most recently used)
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);

        return value;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove oldest (first) entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, value);
    }

    has(key) {
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

// Cache for translation results
export const translationCache = new LRUCache(100);

// Cache for teaching feedback
export const feedbackCache = new LRUCache(50);

// ============================================
// LOCAL STORAGE WITH EXPIRY
// ============================================

export function setStorageWithExpiry(key, value, ttlMs) {
    const item = {
        value,
        expiry: Date.now() + ttlMs
    };
    try {
        localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
        console.warn('localStorage full, clearing old items');
        clearExpiredStorage();
        try {
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e2) {
            console.error('Could not save to localStorage');
        }
    }
}

export function getStorageWithExpiry(key) {
    try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }

        return item.value;
    } catch (e) {
        return null;
    }
}

export function clearExpiredStorage() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        try {
            const itemStr = localStorage.getItem(key);
            if (itemStr) {
                const item = JSON.parse(itemStr);
                if (item.expiry && Date.now() > item.expiry) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            // Not our format, skip
        }
    });
}

// ============================================
// BATCH STATE UPDATES
// ============================================

export function batchUpdates(updates) {
    // React 18+ automatically batches, but this is explicit
    return Promise.resolve().then(() => {
        updates.forEach(update => update());
    });
}

// ============================================
// MEMORY MANAGEMENT
// ============================================

// History limiter hook
export function useLimitedHistory(maxSize = 100) {
    const [history, setHistory] = useState([]);

    const addToHistory = useCallback((item) => {
        setHistory(prev => {
            const newHistory = [...prev, item];
            if (newHistory.length > maxSize) {
                return newHistory.slice(-maxSize);
            }
            return newHistory;
        });
    }, [maxSize]);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return { history, addToHistory, clearHistory };
}

// Cleanup utility for useEffect
export function useCleanup() {
    const cleanupFns = useRef([]);

    const addCleanup = useCallback((fn) => {
        cleanupFns.current.push(fn);
    }, []);

    useEffect(() => {
        return () => {
            cleanupFns.current.forEach(fn => {
                try { fn(); } catch (e) { console.warn('Cleanup error:', e); }
            });
            cleanupFns.current = [];
        };
    }, []);

    return addCleanup;
}

// ============================================
// IMAGE OPTIMIZATION
// ============================================

export function supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

export function getOptimizedImageUrl(url, width, format = 'auto') {
    // For CDN-hosted images, add optimization params
    // This is a placeholder - implement based on your CDN
    if (format === 'auto' && supportsWebP()) {
        format = 'webp';
    }
    return url; // Return as-is for now
}

// Lazy load image
export function lazyLoadImage(src, callback) {
    const img = new Image();
    img.onload = () => callback(null, img);
    img.onerror = (err) => callback(err, null);
    img.src = src;
    return img;
}

// ============================================
// SOCKET.IO OPTIMIZATION
// ============================================

export function createOptimizedSocketHandler(socket, options = {}) {
    const {
        throttleMs = 100,
        batchMs = 50,
        maxBatchSize = 10
    } = options;

    let messageQueue = [];
    let batchTimeout = null;

    const flushQueue = () => {
        if (messageQueue.length === 0) return;

        if (messageQueue.length === 1) {
            const { event, data, ack } = messageQueue[0];
            socket.emit(event, data, ack);
        } else {
            // Batch multiple messages
            socket.emit('batch', messageQueue.map(m => ({ event: m.event, data: m.data })));
        }

        messageQueue = [];
        batchTimeout = null;
    };

    const emit = (event, data, ack) => {
        messageQueue.push({ event, data, ack });

        if (messageQueue.length >= maxBatchSize) {
            flushQueue();
        } else if (!batchTimeout) {
            batchTimeout = setTimeout(flushQueue, batchMs);
        }
    };

    const throttledEmit = throttle(emit, throttleMs);

    return {
        emit,
        throttledEmit,
        flush: flushQueue
    };
}

// ============================================
// PRELOAD CRITICAL ASSETS
// ============================================

export function preloadAssets(assets) {
    const promises = assets.map(asset => {
        return new Promise((resolve, reject) => {
            if (asset.type === 'image') {
                const img = new Image();
                img.onload = () => resolve(asset);
                img.onerror = reject;
                img.src = asset.src;
            } else if (asset.type === 'font') {
                const font = new FontFace(asset.family, `url(${asset.src})`);
                font.load().then(resolve).catch(reject);
            } else if (asset.type === 'script') {
                const script = document.createElement('script');
                script.onload = () => resolve(asset);
                script.onerror = reject;
                script.src = asset.src;
                document.head.appendChild(script);
            } else {
                resolve(asset);
            }
        });
    });

    return Promise.allSettled(promises);
}

// ============================================
// PERFORMANCE BUDGET
// ============================================

export const PERFORMANCE_BUDGET = {
    targetFPS: 60,
    minAcceptableFPS: 30,
    maxApiResponseMs: 2000,
    maxInputLatencyMs: 100,
    maxBundleSizeKB: 500,
    maxMemoryMB: 100,
    maxHistoryItems: 100,
    cacheExpiryMs: 3600000, // 1 hour
};

// Check if performance is within budget
export function checkPerformanceBudget() {
    const metrics = performanceMonitor.getMetrics();
    const warnings = [];

    if (metrics.averageFPS < PERFORMANCE_BUDGET.minAcceptableFPS) {
        warnings.push(`FPS below acceptable: ${metrics.averageFPS}`);
    }

    if (metrics.memoryUsage > PERFORMANCE_BUDGET.maxMemoryMB) {
        warnings.push(`Memory usage high: ${metrics.memoryUsage}MB`);
    }

    const slowCalls = metrics.apiCalls.filter(
        c => c.duration > PERFORMANCE_BUDGET.maxApiResponseMs
    );
    if (slowCalls.length > 0) {
        warnings.push(`${slowCalls.length} slow API calls detected`);
    }

    return {
        healthy: warnings.length === 0,
        warnings,
        metrics
    };
}

// Import useState for hooks that use it
import { useState } from 'react';
