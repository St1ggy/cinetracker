<script lang="ts">
  import GithubIcon from '@lucide/svelte/icons/github'

  import { L } from '$lib'
  import { MEDIA_PROVIDERS, PROVIDER_META } from '$shared/config/domain'
  import { AUTH_LEGAL, DATA_PROVIDER_LEGAL } from '$shared/config/legal'
</script>

<div class="space-y-6">
  <div class="rounded-xl border bg-card p-6 shadow-sm">
    <h1 class="text-2xl font-bold tracking-tight">{L.about_title()}</h1>
    <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
      {L.about_description()}
    </p>
  </div>

  <div class="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-6">
    <span class="text-sm font-semibold text-muted-foreground tabular-nums">v{__APP_VERSION__}</span>
    <a
      href="https://github.com/St1ggy/cinetracker"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
    >
      <GithubIcon class="size-4" />
      {L.about_github()}
    </a>
  </div>

  <div class="rounded-xl border bg-card p-6 shadow-sm">
    <h2 class="text-lg font-semibold tracking-tight">{L.about_legal_title()}</h2>
    <p class="mt-2 text-sm text-muted-foreground">
      {L.about_legal_intro()}
    </p>

    <div class="mt-6">
      <h3 class="text-sm font-medium text-foreground">{L.about_auth_section_title()}</h3>
      <ul class="mt-2 space-y-2">
        {#each AUTH_LEGAL as item (item.id)}
          <li class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span class="font-medium">{L[item.labelKey]()}</span>
            <span class="text-muted-foreground">
              <a href={item.termsUrl} target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">
                {L.about_terms()}
              </a>
              ·
              <a
                href={item.privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:text-foreground"
              >
                {L.about_privacy()}
              </a>
            </span>
          </li>
        {/each}
      </ul>
    </div>

    <div class="mt-6">
      <h3 class="text-sm font-medium text-foreground">{L.about_data_section_title()}</h3>
      <ul class="mt-2 space-y-2">
        {#each MEDIA_PROVIDERS as provider (provider)}
          {@const legal = DATA_PROVIDER_LEGAL[provider]}
          {@const meta = PROVIDER_META[provider]}
          <li class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span class="font-medium">{meta.label}</span>
            <span class="text-muted-foreground">
              <a
                href={legal.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:text-foreground"
              >
                {L.about_terms()}
              </a>
              {#if legal.privacyUrl}
                ·
                <a
                  href={legal.privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-foreground"
                >
                  {L.about_privacy()}
                </a>
              {/if}
              {#if legal.attributionUrl}
                ·
                <a
                  href={legal.attributionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-foreground"
                >
                  {L.about_attribution()}
                </a>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</div>
