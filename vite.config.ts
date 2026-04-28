import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isUserOrOrgPage = repositoryName?.endsWith('.github.io') ?? false;

export default defineConfig({
  base:
    process.env.GITHUB_ACTIONS === 'true' && repositoryName && !isUserOrOrgPage
      ? `/${repositoryName}/`
      : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
