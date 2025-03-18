import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.spec.ts'],
        testTimeout: 45000,
    },
    resolve: {
        alias: {
            '@/lib': path.resolve(__dirname, './lib'),
            '@/db': path.resolve(__dirname, './db'),
            '@/types': path.resolve(__dirname, './types'),
        },
    },
})