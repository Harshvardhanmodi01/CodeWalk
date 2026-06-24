import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/lib/fileExclusion.ts', 'app/lib/importGraph.ts', 'app/lib/fileScoring.ts'],
    },
  },
});
