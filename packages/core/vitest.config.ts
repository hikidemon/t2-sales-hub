import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    // Core has no calculation logic yet (planned for Stage 4).
    // Remove this flag once the first real test file appears.
    passWithNoTests: true,
  },
});
