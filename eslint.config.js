import { includeIgnoreFile } from '@eslint/compat'
// eslint-disable-next-line import/default
import st1ggyConfig from '@st1ggy/linter-config/eslint-svelte'
import { defineConfig, globalIgnores } from 'eslint/config'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import { parser as tsParser } from 'typescript-eslint'

// eslint-disable-next-line import/extensions
import svelteConfig from './svelte.config.js'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

// typescript-eslint v8.56+ errors when both `project` and `projectService` are set.
// @st1ggy/linter-config v2.42+ sets both, so strip `project` from its parserOptions.
const cleanedSt1ggyConfig = st1ggyConfig.map((c) => {
  /** @type {Record<string, unknown>} */
  const po = /** @type {any} */ (c.languageOptions?.parserOptions)

  if (!po?.project) return c

  const parserOptions = Object.fromEntries(Object.entries(po).filter(([key]) => key !== 'project'))

  return { ...c, languageOptions: { ...c.languageOptions, parserOptions } }
})

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  globalIgnores(['src/lib/components/ui/**/*', 'scripts/**']),
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
  ...cleanedSt1ggyConfig,
  {
    rules: {
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    // sonarjs/no-unused-collection crashes (TypeError: Cannot read properties of null) when
    // parsing Svelte files that use svelte-dnd-action's `use:dndzone` directive — plugin bug.
    files: ['**/*.svelte'],
    rules: {
      'sonarjs/no-unused-collection': 'off',
    },
  },
)
