import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                ws: true
            }
        }
    },

    // Build optimization
    build: {
        // Target modern browsers for smaller bundle
        target: 'es2020',

        // Minification settings
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info']
            }
        },

        // Code splitting
        rollupOptions: {
            output: {
                manualChunks: {
                    // Core React bundle
                    'react-vendor': ['react', 'react-dom'],

                    // Three.js bundle (largest)
                    'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],

                    // Socket.IO
                    'socket-vendor': ['socket.io-client']
                }
            }
        },

        // Chunk size warnings
        chunkSizeWarningLimit: 500,

        // Source maps for production debugging (optional)
        sourcemap: false,

        // Output directory
        outDir: 'dist',

        // Asset handling
        assetsInlineLimit: 4096, // Inline assets < 4KB
    },

    // Optimization settings
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            'socket.io-client'
        ]
    },

    // CSS optimization
    css: {
        devSourcemap: true,
        preprocessorOptions: {
            // Add any preprocessor options here
        }
    },

    // Enable faster HMR
    esbuild: {
        jsxInject: undefined,
        target: 'es2020'
    },

    // Preview server settings (for production build testing)
    preview: {
        port: 4173,
        strictPort: true
    }
})
