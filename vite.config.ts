import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'

const package_ = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(package_.version),
  },
  ssr: {
    // Prevent Node from trying to load .svelte files directly from this package.
    noExternal: ['@tanstack/svelte-query'],
  },
  plugins: [
    tailwindcss(),
    sveltekit(),
    devtoolsJson(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
    }),
  ],
})
