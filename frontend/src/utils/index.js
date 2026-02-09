// ============================================
// UTILS INDEX
// Export all performance utilities
// ============================================

// Performance monitoring and optimization
export {
    performanceMonitor,
    throttle,
    debounce,
    useThrottledCallback,
    useDebouncedCallback,
    vector3Pool,
    keyframePool,
    optimizeThreeRenderer,
    disposeThreeObject,
    createFrameLimiter,
    lerp,
    smoothDamp,
    easings,
    translationCache,
    feedbackCache,
    setStorageWithExpiry,
    getStorageWithExpiry,
    clearExpiredStorage,
    batchUpdates,
    createOptimizedSocketHandler,
    preloadAssets,
    PERFORMANCE_BUDGET,
    checkPerformanceBudget
} from './performance';

// Optimized React hooks
export {
    usePrevious,
    useStableCallback,
    useAnimationFrame,
    useThrottledState,
    useDebouncedState,
    useIntersectionObserver,
    useMediaQuery,
    useIdleCallback,
    useWindowSize,
    useMountedState,
    useSafeState,
    useEventListener,
    usePrefersReducedMotion,
    usePerformanceMetrics
} from './hooks';
