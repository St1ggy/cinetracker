<script lang="ts">
  import { page } from '$app/state'
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'

  import { L } from '$lib'

  import MediaHero from './ui/media-hero.svelte'
  import MediaProgressPanel from './ui/media-progress-panel.svelte'

  import type { WatchProviders } from '$lib/server/providers/types'
  import type { PageData } from '../../routes/media/[mediaId]/$types'

  const data = $derived(page.data as PageData)

  let enrichedMedia = $state<typeof data.media | null>(null)
  let isEnriching = $state((page.data as PageData).willEnrich ?? false)

  $effect(() => {
    const enrichedPromise = data.enriched

    if (!enrichedPromise) return

    data.enriched
      .then((result) => {
        if (result) {
          enrichedMedia = result
        }
      })
      .catch(() => {
        // Enrichment failed silently
      })
      .finally(() => {
        isEnriching = false
      })
  })

  const media = $derived(enrichedMedia ?? data.media)
  const userItems = $derived(data.userItems)
  const isEpisodic = $derived(media.mediaType === 'TV' || media.mediaType === 'ANIME')

  const seasonBreakdown = (): { seasonNumber: number; episodes: number }[] => {
    const raw = media.seasonBreakdown

    if (!Array.isArray(raw)) return []

    return raw
      .map((entry) => {
        if (typeof entry !== 'object' || entry === null) return null

        const seasonNumber = Number((entry as Record<string, unknown>).seasonNumber)
        const episodes = Number((entry as Record<string, unknown>).episodes)

        if (!Number.isFinite(seasonNumber) || !Number.isFinite(episodes)) return null

        return { seasonNumber, episodes }
      })
      .filter((entry): entry is { seasonNumber: number; episodes: number } => entry !== null)
  }

  const seasons = $derived(seasonBreakdown())
  const cast = $derived(
    media.cast.map((mc: { person: { name: string }; role: string | null; profileUrl?: string | null }) => ({
      name: mc.person.name,
      role: mc.role,
      profileUrl: mc.profileUrl,
    })),
  )

  const watchProviders = $derived.by<WatchProviders | null>(() => {
    const tmdbSource = media.sources.find((s: { provider: string; normalizedJson?: unknown }) => s.provider === 'TMDB')

    if (!tmdbSource) return null

    const normalized = tmdbSource.normalizedJson as Record<string, unknown> | null | undefined

    if (!normalized?.watchProviders) return null

    return normalized.watchProviders as WatchProviders
  })
</script>

<svelte:head>
  <title>{media.title} — CineTracker</title>
</svelte:head>

<article class="space-y-6">
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
    onclick={() => globalThis.history.back()}
  >
    <ArrowLeftIcon class="size-4" />
    {L.common_back()}
  </button>

  <MediaHero {media} {isEnriching} />

  {#if watchProviders && (watchProviders.stream.length > 0 || watchProviders.rent.length > 0 || watchProviders.buy.length > 0)}
    <section class="rounded-xl border bg-card p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">{L.media_where_to_watch()}</h2>
        {#if watchProviders.link}
          <a
            href={watchProviders.link}
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-muted-foreground hover:text-foreground"
          >
            {L.media_watch_providers_attribution()}
          </a>
        {/if}
      </div>
      <div class="space-y-3">
        {#if watchProviders.stream.length > 0}
          <div>
            <p class="mb-1.5 text-xs font-medium text-muted-foreground">{L.media_stream()}</p>
            <div class="flex flex-wrap gap-2">
              {#each watchProviders.stream as entry (entry.name)}
                <div class="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                  {#if entry.logoUrl}
                    <img src={entry.logoUrl} alt={entry.name} class="size-4 rounded-sm object-contain" />
                  {/if}
                  {entry.name}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if watchProviders.rent.length > 0}
          <div>
            <p class="mb-1.5 text-xs font-medium text-muted-foreground">{L.media_rent()}</p>
            <div class="flex flex-wrap gap-2">
              {#each watchProviders.rent as entry (entry.name)}
                <div class="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                  {#if entry.logoUrl}
                    <img src={entry.logoUrl} alt={entry.name} class="size-4 rounded-sm object-contain" />
                  {/if}
                  {entry.name}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if watchProviders.buy.length > 0}
          <div>
            <p class="mb-1.5 text-xs font-medium text-muted-foreground">{L.media_buy()}</p>
            <div class="flex flex-wrap gap-2">
              {#each watchProviders.buy as entry (entry.name)}
                <div class="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                  {#if entry.logoUrl}
                    <img src={entry.logoUrl} alt={entry.name} class="size-4 rounded-sm object-contain" />
                  {/if}
                  {entry.name}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  {#if userItems != null}
    <MediaProgressPanel mediaId={media.id} {isEpisodic} {userItems} {seasons} />
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    {#if cast.length > 0}
      <section class="rounded-lg border bg-card p-5">
        <h2 class="mb-4 text-base font-semibold">{L.media_cast()}</h2>
        <ul class="space-y-3">
          {#each cast as member (member.name)}
            <li class="flex items-center gap-3">
              {#if member.profileUrl}
                <img
                  src={member.profileUrl}
                  alt={member.name}
                  class="size-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                  loading="lazy"
                />
              {:else}
                <div class="size-9 shrink-0 rounded-full bg-muted ring-1 ring-border"></div>
              {/if}
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{member.name}</p>
                {#if member.role}
                  <p class="truncate text-xs text-muted-foreground">{member.role}</p>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {:else if isEnriching}
      <section class="rounded-lg border bg-card p-5">
        <div class="mb-4 h-4 w-16 animate-pulse rounded bg-muted"></div>
        <ul class="space-y-3">
          {#each [1, 2, 3, 4, 5] as index (index)}
            <li class="flex items-center gap-3">
              <div class="size-9 shrink-0 animate-pulse rounded-full bg-muted"></div>
              <div class="flex-1 space-y-1.5">
                <div class="h-3.5 w-32 animate-pulse rounded bg-muted"></div>
                <div class="h-3 w-24 animate-pulse rounded bg-muted"></div>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if isEpisodic && seasons.length > 0}
      <section class="rounded-lg border bg-card p-5">
        <h2 class="mb-4 text-base font-semibold">{L.media_seasons()}</h2>
        <ul class="space-y-2">
          {#each seasons as season (season.seasonNumber)}
            <li class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm odd:bg-muted/30">
              <span class="text-muted-foreground">{L.media_season_number({ n: season.seasonNumber })}</span>
              <span class="font-medium">{L.list_episodes_count({ count: season.episodes })}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</article>
