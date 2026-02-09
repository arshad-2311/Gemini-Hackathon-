// ============================================
// LAZY LOADED COMPONENTS
// Code splitting for optimal bundle size
// ============================================

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './components/ErrorHandling';

// ============================================
// LAZY COMPONENT WRAPPERS
// ============================================

// Create lazy component with fallback
function createLazyComponent(importFn, fallbackMessage = 'Loading...') {
    const LazyComponent = lazy(importFn);

    return function LazyWrapper(props) {
        return (
            <Suspense fallback={<LoadingSpinner message={fallbackMessage} />}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
}

// ============================================
// LAZY LOADED COMPONENTS
// ============================================

// Teaching Panel - Loaded on demand
export const LazyTeachingPanel = createLazyComponent(
    () => import('./components/TeachingPanel'),
    'Loading teaching tools...'
);

// Document Upload - Loaded on demand
export const LazyDocumentUpload = createLazyComponent(
    () => import('./components/DocumentUpload'),
    'Loading document processor...'
);

// Demo Controller - Loaded on demand
export const LazyDemoController = createLazyComponent(
    () => import('./components/DemoController'),
    'Loading demo mode...'
);

// Dialect Switcher - Can be loaded immediately or lazily
export const LazyDialectSwitcher = createLazyComponent(
    () => import('./components/DialectSwitcher'),
    'Loading dialects...'
);

// Spatial Indicator - Loaded on demand
export const LazySpatialIndicator = createLazyComponent(
    () => import('./components/SpatialIndicator'),
    'Loading spatial awareness...'
);

// ============================================
// PRELOAD FUNCTIONS
// Call these to start loading before user needs them
// ============================================

export function preloadTeachingPanel() {
    import('./components/TeachingPanel');
}

export function preloadDocumentUpload() {
    import('./components/DocumentUpload');
}

export function preloadDemoController() {
    import('./components/DemoController');
}

export function preloadAllOptionalComponents() {
    preloadTeachingPanel();
    preloadDocumentUpload();
    preloadDemoController();
}

// ============================================
// CRITICAL PATH PRELOADING
// Preload on idle to improve subsequent loads
// ============================================

export function setupIdlePreloading() {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            preloadTeachingPanel();
        }, { timeout: 2000 });

        requestIdleCallback(() => {
            preloadDocumentUpload();
        }, { timeout: 4000 });

        requestIdleCallback(() => {
            preloadDemoController();
        }, { timeout: 6000 });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(preloadTeachingPanel, 2000);
        setTimeout(preloadDocumentUpload, 4000);
        setTimeout(preloadDemoController, 6000);
    }
}
