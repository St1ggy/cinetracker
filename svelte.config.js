import adapter from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: [vitePreprocess(), mdsvex()],
  kit: {
    // Pin serverless Node so `bun run build` works when local Node is not 20/22/24 (e.g. v25).
    adapter: adapter({ runtime: 'nodejs24.x' }),
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
