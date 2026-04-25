<script lang="ts">
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
      <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          d="M12 0C5.374 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.807 1.304 3.492.996.108-.778.42-1.305.762-1.605-2.665-.3-5.465-1.335-5.465-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.55-1.52.1-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 2.99-.4 1.01 0 2.04.14 2.99.4 2.29-1.55 3.3-1.23 3.3-1.23.64 1.66.12 2.88.12 3.18.78.85 1.25 1.9 1.25 3.2 0 4.6-2.7 5.6-5.3 5.6.4.3.8 1.1.8 2.2v3.2c0 .3.2.6.7.4C20.6 22.5 24 18 24 12 24 5.373 18.627 0 12 0Z"
        />
      </svg>
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
