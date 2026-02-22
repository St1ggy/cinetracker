// eslint-disable-next-line import/default
import prettierConfig from '@st1ggy/linter-config/prettier-svelte'

export default {
  ...prettierConfig,
  plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/app.css',
}
