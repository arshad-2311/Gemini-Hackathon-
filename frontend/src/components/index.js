// ============================================
// Components Index - Export all components
// ============================================

// Avatar
export { default as Avatar3D } from './Avatar3D';

// Video Avatar (hybrid video + 3D)
export { default as VideoAvatar } from './VideoAvatar';

// Dialect Switcher
export { default as DialectSwitcher } from './DialectSwitcher';

// Teaching Panel
export { default as TeachingPanel } from './TeachingPanel';

// Document Upload
export { default as DocumentUpload } from './DocumentUpload';

// Spatial Indicator
export { default as SpatialIndicator } from './SpatialIndicator';

// Camera Input
export { default as CameraInput } from './CameraInput';

// Error Handling & Loading States
export {
    ToastProvider,
    useToast,
    LoadingSpinner,
    ConnectionStatus,
    ErrorBoundary,
    useNetworkStatus,
    useSocketConnection,
    useAsyncOperation,
    useInputValidation,
    validateFile,
    getFallbackTranslation,
    requestCameraPermission,
    requestMicrophonePermission
} from './ErrorHandling';
