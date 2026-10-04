import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 相対パスでビルドしておくと、サブディレクトリ配下の静的ホスティングでもそのまま動く
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
