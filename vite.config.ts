import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    options: { typeAware: true, typeCheck: true },
    rules: {
      'typescript/no-explicit-any': 'error',
      'max-lines': ['error', { max: 350, skipBlankLines: true }],
    },
  },
  fmt: { singleQuote: true, ignorePatterns: ['pnpm-lock.yaml'] },
  test: { include: ['tests/**/*.test.ts'] },
});
