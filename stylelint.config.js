// eslint-disable-next-line import/default
import stylelintConfig from '@st1ggy/linter-config/stylelint-scss'

/** @type {Record<string, unknown>} */
const baseRules = /** @type {any} */ (stylelintConfig).rules ?? {}

export default {
  ...stylelintConfig,
  rules: {
    ...baseRules,
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'layer', 'screen', 'variants', 'responsive', 'plugin'],
      },
    ],
    'max-nesting-depth': null,
  },
}
