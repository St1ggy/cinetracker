import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve(root, 'src/lib'),
      $shared: path.resolve(root, 'src/shared'),
      $features: path.resolve(root, 'src/features'),
      $pages: path.resolve(root, 'src/pages'),
      $widgets: path.resolve(root, 'src/widgets'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['src/lib/server/**'],
  },
})
