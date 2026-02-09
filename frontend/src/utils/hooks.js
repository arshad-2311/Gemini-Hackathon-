// ============================================
// OPTIMIZED REACT HOOKS
// Performance-focused custom hooks
// ============================================

import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    useLayoutEffect
} from 'react';

// ============================================
// PREVIOUS VALUE HOOK
// ============================================
export function usePrevious(value) {
    const ref = useRef();

    useEffect(() => {
        ref.current = value;
    });

    return ref.current;
}

// ============================================
// STABLE CALLBACK
// Similar to useCallback but with stable reference
// ============================================
export function useStableCallback(callback) {
    const ref = useRef(callback);

    useLayoutEffect(() => {
        ref.current = callback;
    });

    return useCallback((...args) => ref.current(...args), []);
}

// ============================================
// ANIMATION FRAME LOOP
// Optimized for smooth animations
// ============================================
export function useAnimationFrame(callback, deps = []) {
    const callbackRef = useRef(callback);
    const frameRef = useRef();
    const previousTimeRef = useRef();

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const animate = (time) => {
            if (previousTimeRef.current !== undefined) {
                const deltaTime = time - previousTimeRef.current;
                callbackRef.current(deltaTime, time);
            }
            previousTimeRef.current = time;
            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, deps);
}

// ============================================
// THROTTLED STATE
// State that only updates at max frequency
// ============================================
export function useThrottledState(initialValue, delay = 100) {
    const [state, setState] = useState(initialValue);
    const [throttledState, setThrottledState] = useState(initialValue);
    const lastUpdateRef = useRef(Date.now());
    const pendingRef = useRef(null);

    const setThrottled = useCallback((value) => {
        setState(value);

        const now = Date.now();

        if (now - lastUpdateRef.current >= delay) {
            setThrottledState(value);
            lastUpdateRef.current = now;
        } else {
            if (pendingRef.current) {
                clearTimeout(pendingRef.current);
            }

            pendingRef.current = setTimeout(() => {
                setThrottledState(value);
                lastUpdateRef.current = Date.now();
            }, delay - (now - lastUpdateRef.current));
        }
    }, [delay]);

    useEffect(() => {
        return () => {
            if (pendingRef.current) {
                clearTimeout(pendingRef.current);
            }
        };
    }, []);

    return [throttledState, setThrottled, state];
}

// ============================================
// DEBOUNCED STATE
// State that waits for pause in updates
// ============================================
export function useDebouncedState(initialValue, delay = 300) {
    const [state, setState] = useState(initialValue);
    const [debouncedState, setDebouncedState] = useState(initialValue);
    const timeoutRef = useRef(null);

    const setDebounced = useCallback((value) => {
        setState(value);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setDebouncedState(value);
        }, delay);
    }, [delay]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return [debouncedState, setDebounced, state];
}

// ============================================
// INTERSECTION OBSERVER
// For lazy loading and visibility detection
// ============================================
export function useIntersectionObserver(options = {}) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [entry, setEntry] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
            setEntry(entry);
        }, {
            threshold: 0.1,
            ...options
        });

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [options.threshold, options.root, options.rootMargin]);

    return { ref, isIntersecting, entry };
}

// ============================================
// MEDIA QUERY HOOK
// Responsive design without CSS
// ============================================
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);

        const handler = (event) => {
            setMatches(event.matches);
        };

        mediaQuery.addEventListener('change', handler);

        return () => {
            mediaQuery.removeEventListener('change', handler);
        };
    }, [query]);

    return matches;
}

// ============================================
// IDLE CALLBACK HOOK
// Execute work when browser is idle
// ============================================
export function useIdleCallback(callback, deps = []) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        let handle;

        if ('requestIdleCallback' in window) {
            handle = requestIdleCallback(() => {
                callbackRef.current();
            });
        } else {
            handle = setTimeout(() => {
                callbackRef.current();
            }, 1);
        }

        return () => {
            if ('cancelIdleCallback' in window) {
                cancelIdleCallback(handle);
            } else {
                clearTimeout(handle);
            }
        };
    }, deps);
}

// ============================================
// WINDOW SIZE HOOK (Throttled)
// ============================================
export function useWindowSize(throttleMs = 100) {
    const [size, setSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0
    });

    useEffect(() => {
        let timeoutId = null;

        const handleResize = () => {
            if (timeoutId) return;

            timeoutId = setTimeout(() => {
                setSize({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
                timeoutId = null;
            }, throttleMs);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [throttleMs]);

    return size;
}

// ============================================
// MOUNTED STATE HOOK
// Prevent state updates on unmounted components
// ============================================
export function useMountedState() {
    const mountedRef = useRef(false);
    const isMounted = useCallback(() => mountedRef.current, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return isMounted;
}

// Safe setState that checks if mounted
export function useSafeState(initialValue) {
    const [state, setState] = useState(initialValue);
    const isMounted = useMountedState();

    const setSafeState = useCallback((value) => {
        if (isMounted()) {
            setState(value);
        }
    }, [isMounted]);

    return [state, setSafeState];
}

// ============================================
// EVENT LISTENER HOOK (Optimized)
// ============================================
export function useEventListener(eventName, handler, element = window, options = {}) {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const targetElement = element?.current ?? element;
        if (!(targetElement && targetElement.addEventListener)) return;

        const eventListener = (event) => handlerRef.current(event);

        targetElement.addEventListener(eventName, eventListener, options);

        return () => {
            targetElement.removeEventListener(eventName, eventListener, options);
        };
    }, [eventName, element, options.capture, options.once, options.passive]);
}

// ============================================
// REDUCED MOTION PREFERENCE
// ============================================
export function usePrefersReducedMotion() {
    return useMediaQuery('(prefers-reduced-motion: reduce)');
}

// ============================================
// PERFORMANCE METRICS HOOK
// ============================================
export function usePerformanceMetrics() {
    const [metrics, setMetrics] = useState({
        fps: 60,
        memory: null,
        timing: null
    });

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationId;

        const measureFPS = (time) => {
            frameCount++;

            if (time - lastTime >= 1000) {
                setMetrics(prev => ({
                    ...prev,
                    fps: Math.round((frameCount * 1000) / (time - lastTime)),
                    memory: performance.memory
                        ? Math.round(performance.memory.usedJSHeapSize / 1048576)
                        : null
                }));

                frameCount = 0;
                lastTime = time;
            }

            animationId = requestAnimationFrame(measureFPS);
        };

        animationId = requestAnimationFrame(measureFPS);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, []);

    return metrics;
}
