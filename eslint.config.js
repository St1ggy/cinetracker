import { includeIgnoreFile } from '@eslint/compat'
// @ts-expect-error: no types for this package
import st1ggyConfig from '@st1ggy/linter-config/eslint-svelte'
import { defineConfig } from 'eslint/config'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import { parser as tsParser } from 'typescript-eslint'

// eslint-disable-next-line import/extensions
import svelteConfig from './svelte.config.js'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: tsParser,
        svelteConfig,
      },
    },
  },
  ...svelte.configs['flat/prettier'],
  ...st1ggyConfig,
  {
    rules: {
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
)
