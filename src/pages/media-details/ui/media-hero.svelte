<script lang="ts">
  import CalendarIcon from '@lucide/svelte/icons/calendar'
  import ClapperboardIcon from '@lucide/svelte/icons/clapperboard'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import FilmIcon from '@lucide/svelte/icons/film'
  import GlobeIcon from '@lucide/svelte/icons/globe'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import LoaderIcon from '@lucide/svelte/icons/loader'
  import StarIcon from '@lucide/svelte/icons/star'
  import TvIcon from '@lucide/svelte/icons/tv'

  import { L } from '$lib'
  import { sanitizeHtml } from '$shared/lib/html'
  import { formatCountry, getMediaTypeMeta } from '$shared/lib/labels'

  type Rating = {
    provider: string
    source: string
    value: number
    maxValue: number
    votes: number | null
  }

  type Source = {
    provider: string
    externalUrl: string | null
  }

  type Media = {
    title: string
    originalTitle: string | null
    tagline?: string | null
    status?: string | null
    director?: string | null
    year: number | null
    mediaType: string
    runtimeMinutes: number | null
    episodeRuntimeMin: number | null
    episodeRuntimeMax: number | null
    seasonsCount: number | null
    episodesCount: number | null
    countries: string[]
    posterUrl: string | null
    backdropUrl: string | null
    overview: string | null
    genres: { genre: { name: string } }[]
    ratings?: Rating[]
    sources: Source[]
  }

  type Props = { media: Media; isEnriching?: boolean }
  const { media, isEnriching = false }: Props = $props()

  const isEpisodic = $derived(media.mediaType === 'TV' || media.mediaType === 'ANIME')
  const typeMeta = $derived(getMediaTypeMeta(media.mediaType))
  const genres = $derived(media.genres.map((mg) => mg.genre.name))
  const ratings = $derived((media.ratings ?? []) as Rating[])
  const sourceCount = $derived(media.sources.length)

  const formatRuntime = (minutes: number | null | undefined) => {
    if (!minutes) return null

    const h = Math.floor(minutes / 60)
    const m = minutes % 60

    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const formatEpisodeDuration = (min: number | null | undefined, max: number | null | undefined) => {
    if (!min && !max) return null

    if (min && max && min !== max) return `${min}–${max} min`

    return `${min ?? max} min`
  }

  const formatRatingValue = (value: number, maxValue: number, source: string): string => {
    if (source === 'Rotten Tomatoes') return `${Math.round(value)}%`

    if (source === 'AniList' || source === 'Kitsu' || source === 'Metacritic') {
      return `${Math.round(value)}/${Math.round(maxValue)}`
    }

    return `${value.toFixed(1)}/${maxValue.toFixed(0)}`
  }

  const runtime = $derived(formatRuntime(media.runtimeMinutes))
  const episodeDuration = $derived(formatEpisodeDuration(media.episodeRuntimeMin, media.episodeRuntimeMax))
</script>

<div class="overflow-hidden rounded-xl border bg-card">
  {#if media.backdropUrl}
    <div class="relative h-48 overflow-hidden md:h-72">
      <img src={media.backdropUrl} alt={media.title} class="h-full w-full object-cover" />
      <div class="absolute inset-0 bg-linear-to-t from-card/90 to-transparent"></div>
    </div>
  {/if}

  <div class="flex flex-col gap-6 p-5 md:flex-row">
    {#if media.posterUrl}
      <div class="shrink-0">
        <img src={media.posterUrl} alt={media.title} class="w-36 rounded-lg border object-cover shadow-md md:w-44" />
      </div>
    {/if}

    <div class="min-w-0 flex-1 space-y-3">
      <div>
        <h1 class="text-2xl leading-tight font-bold">{media.title}</h1>
        {#if media.originalTitle && media.originalTitle !== media.title}
          <p class="text-sm text-muted-foreground">{media.originalTitle}</p>
        {/if}
        {#if media.tagline}
          <p class="mt-1 text-sm italic text-muted-foreground">{media.tagline}</p>
        {/if}
      </div>

      <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {#if media.year}
          <span class="inline-flex items-center gap-1">
            <CalendarIcon class="size-3.5" />
            {media.year}
          </span>
        {/if}
        <span
          class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold {typeMeta.color}"
        >
          {#if isEpisodic}
            <TvIcon class="size-3" />
          {:else}
            <FilmIcon class="size-3" />
          {/if}
          {typeMeta.label}
        </span>
        {#if runtime && !isEpisodic}
          <span class="inline-flex items-center gap-1">
            <ClockIcon class="size-3.5" />
            {runtime}
          </span>
        {/if}
        {#if media.countries.length > 0}
          <span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            {#each media.countries as code (code)}
              <span class="inline-flex items-center gap-1">
                <GlobeIcon class="size-3.5 shrink-0" />
                {formatCountry(code)}
              </span>
            {/each}
          </span>
        {/if}
        {#if isEpisodic && (media.seasonsCount || media.episodesCount)}
          <span class="inline-flex items-center gap-1">
            <LayersIcon class="size-3.5" />
            {#if media.seasonsCount}{L.list_seasons_count({ count: media.seasonsCount })}{/if}
            {#if media.seasonsCount && media.episodesCount}·{/if}
            {#if media.episodesCount}{L.list_episodes_count({ count: media.episodesCount })}{/if}
          </span>
        {/if}
        {#if isEpisodic && episodeDuration}
          <span class="inline-flex items-center gap-1">
            <ClockIcon class="size-3.5" />
            {L.media_episode_duration({ value: episodeDuration })}
          </span>
        {/if}
        {#if media.director}
          <span class="inline-flex items-center gap-1">
            <ClapperboardIcon class="size-3.5 shrink-0" />
            <span class="font-medium">{L.media_director()}:</span>
            {media.director}
          </span>
        {/if}
      </div>

      {#if genres.length > 0}
        <div class="flex flex-wrap gap-1.5">
          {#each genres as genre (genre)}
            <span class="rounded-full border px-2.5 py-0.5 text-xs font-medium">{genre}</span>
          {/each}
        </div>
      {/if}

      {#if ratings.length > 0}
        <div class="flex flex-wrap items-center gap-2">
          {#each ratings as rating (rating.provider)}
            <span
              class="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium"
              title={rating.votes ? L.media_votes({ count: rating.votes }) : undefined}
            >
              <StarIcon class="size-3 fill-amber-400 text-amber-400" />
              <span class="text-muted-foreground">{rating.source}</span>
              <span class="font-semibold">{formatRatingValue(rating.value, rating.maxValue, rating.source)}</span>
            </span>
          {/each}
        </div>
      {:else if isEnriching}
        <div class="flex gap-2">
          {#each [1, 2] as i (i)}
            <div class="h-7 w-28 animate-pulse rounded-full bg-muted"></div>
          {/each}
        </div>
      {/if}

      {#if media.overview}
        <div
          class="prose-sm prose-muted max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:underline [&_br]:block"
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html sanitizeHtml(media.overview)}
        </div>
      {/if}

      {#if sourceCount > 0}
        <div class="flex flex-wrap items-center gap-2 pt-1">
          {#if isEnriching}
            <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderIcon class="size-3 animate-spin" />
              {L.media_enriching()}
            </span>
          {:else}
            <span class="text-xs text-muted-foreground">
              {L.media_enriched_from_sources({ count: sourceCount })}:
            </span>
          {/if}
          {#each media.sources as source (source.provider)}
            {#if source.externalUrl}
              <a
                href={source.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-full border px-2.5 py-0.5 text-xs font-medium hover:bg-accent"
              >
                {source.provider}
              </a>
            {:else}
              <span class="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {source.provider}
              </span>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
