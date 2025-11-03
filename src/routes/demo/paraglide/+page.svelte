<script lang="ts">
  import { L } from '$lib'
  import { setLocale } from '$lib/paraglide/runtime'

  const locales = ['en', 'ru', 'jp', 'fr', 'cn'] as const
</script>

<h1>{L.hello_world({ name: 'SvelteKit User' })}</h1>
<div>
  {#each locales as locale (locale)}
    <button onclick={() => setLocale(locale)}>{locale}</button>
  {/each}
</div>
<p>
  If you use VSCode, install the <a
    href="https://marketplace.visualstudio.com/items?itemName=inlang.vs-code-extension"
    target="_blank">Sherlock i18n extension</a
  > for a better i18n experience.
</p>
