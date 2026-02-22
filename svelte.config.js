import adapter from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  // @ts-expect-error: mdsvex is not typed
  preprocess: [vitePreprocess(), mdsvex()],
  kit: {
    adapter: adapter(),
    alias: {
      $pages: 'src/pages',
      $widgets: 'src/widgets',
      $features: 'src/features',
      $entities: 'src/entities',
      $shared: 'src/shared',
      $processes: 'src/processes',
    },
  },
  extensions: ['.svelte', '.svx'],
  vitePlugin: {
    inspector: {
      toggleKeyCombo: 'alt-x',
      showToggleButton: 'always',
      toggleButtonPos: 'bottom-right',
    },
  },
}

export default config
