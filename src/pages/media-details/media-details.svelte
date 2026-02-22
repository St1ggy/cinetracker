<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
  import CalendarIcon from '@lucide/svelte/icons/calendar'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import FilmIcon from '@lucide/svelte/icons/film'
  import GlobeIcon from '@lucide/svelte/icons/globe'
  import LayersIcon from '@lucide/svelte/icons/layers'
  import TvIcon from '@lucide/svelte/icons/tv'
  import { untrack } from 'svelte'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { WATCH_STATUSES } from '$shared/config/domain'
  import { sanitizeHtml } from '$shared/lib/html'
  import { formatCountry, getMediaTypeMeta, getWatchStatusLabels } from '$shared/lib/labels'

  import type { WatchStatus } from '$shared/config/domain'
  import type { PageData } from '../../routes/media/[mediaId]/$types'

  const data = $derived(page.data as PageData)
  const media = $derived(data.media)
  const userItems = $derived(data.userItems)

  const isEpisodic = $derived(media.mediaType === 'TV' || media.mediaType === 'ANIME')
  const watchStatusLabels = getWatchStatusLabels(L)

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

  const genres = $derived(media.genres.map((mg: { genre: { name: string } }) => mg.genre.name))
  const cast = $derived(
    media.cast.map((mc: { person: { name: string }; role: string }) => ({ name: mc.person.name, role: mc.role })),
  )
  const seasons = $derived(seasonBreakdown())
  const episodeDuration = $derived(formatEpisodeDuration(media.episodeRuntimeMin, media.episodeRuntimeMax))
  const runtime = $derived(formatRuntime(media.runtimeMinutes))
  const typeMeta = $derived(getMediaTypeMeta(media.mediaType))

  // Progress panel state — one entry per userItem
  type ProgressState = {
    status: WatchStatus
    currentSeason: number | ''
    currentEpisode: number | ''
    saveState: 'idle' | 'saving' | 'saved'
  }

  type UserItem = NonNullable<PageData['userItems']>[number]

  const progressState = $state<Record<string, ProgressState>>(
    untrack(() =>
      Object.fromEntries(
        (userItems ?? []).map((item: UserItem) => [
          item.id,
          {
            status: (item.status as WatchStatus) ?? 'PLAN_TO_WATCH',
            currentSeason: item.currentSeason ?? '',
            currentEpisode: item.currentEpisode ?? '',
            saveState: 'idle' as const,
          },
        ]),
      ),
    ),
  )

  const episodesInSeason = (seasonNumber: number | '') => {
    if (!seasonNumber) return null

    return seasons.find((s) => s.seasonNumber === Number(seasonNumber))?.episodes ?? null
  }

  const saveProgress = async (itemId: string) => {
    const state = progressState[itemId]

    if (!state) return

    state.saveState = 'saving'

    try {
      const response = await fetch(`/api/media/${media.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          status: state.status,
          currentSeason: state.currentSeason === '' ? null : Number(state.currentSeason),
          currentEpisode: state.currentEpisode === '' ? null : Number(state.currentEpisode),
        }),
      })

      if (!response.ok) throw new Error('Failed to save progress')

      state.saveState = 'saved'
      await invalidateAll()
      setTimeout(() => {
        state.saveState = 'idle'
      }, 2000)
    } catch {
      state.saveState = 'idle'
    }
  }
</script>

<svelte:head>
  <title>{media.title} — CineTracker</title>
</svelte:head>

<article class="space-y-6">
  <button
    type="button"
    class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    onclick={() => globalThis.history.back()}
  >
    <ArrowLeftIcon class="size-4" />
    {L.common_back()}
  </button>

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
              {#if media.seasonsCount && media.episodesCount}
                ·
              {/if}
              {#if media.episodesCount}{L.list_episodes_count({ count: media.episodesCount })}{/if}
            </span>
          {/if}
          {#if isEpisodic && episodeDuration}
            <span class="inline-flex items-center gap-1">
              <ClockIcon class="size-3.5" />
              {L.media_episode_duration({ value: episodeDuration })}
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

        {#if media.overview}
          <div
            class="prose-sm prose-muted max-w-none text-sm leading-relaxed text-muted-foreground [&_a]:underline [&_br]:block"
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html sanitizeHtml(media.overview)}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if userItems != null}
    <section class="rounded-xl border bg-card p-4">
      <h2 class="mb-4 text-sm font-semibold">{L.media_progress_title()}</h2>

      {#if userItems.length === 0}
        <p class="text-sm text-muted-foreground">{L.media_progress_not_in_list()}</p>
      {:else}
        <div class="space-y-5">
          {#each userItems as item (item.id)}
            {@const state = progressState[item.id]}
            {#if state}
              <div class="space-y-3">
                {#if userItems.length > 1}
                  <p class="text-xs font-medium text-muted-foreground">
                    {L.media_progress_list({ title: item.list.title })}
                  </p>
                {/if}

                <div class="flex flex-wrap gap-3">
                  <div class="min-w-[160px] flex-1">
                    <p class="mb-1 text-xs font-medium text-muted-foreground">
                      {L.media_progress_status()}
                    </p>
                    <Select.Root
                      type="single"
                      value={state.status}
                      onValueChange={(v) => (state.status = v as WatchStatus)}
                    >
                      <Select.Trigger class="h-9 w-full text-sm">
                        {watchStatusLabels[state.status]}
                      </Select.Trigger>
                      <Select.Content>
                        {#each WATCH_STATUSES as st (st)}
                          <Select.Item value={st} label={watchStatusLabels[st]} />
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  </div>

                  {#if isEpisodic}
                    {#if seasons.length > 0}
                      <div class="w-28">
                        <p class="mb-1 text-xs font-medium text-muted-foreground">
                          {L.media_progress_season()}
                        </p>
                        <Select.Root
                          type="single"
                          value={state.currentSeason === '' ? '__none__' : String(state.currentSeason)}
                          onValueChange={(v) => {
                            state.currentSeason = v === '__none__' ? '' : Number(v)
                            state.currentEpisode = ''
                          }}
                        >
                          <Select.Trigger class="h-9 w-full text-sm">
                            {state.currentSeason === '' ? '—' : state.currentSeason}
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="__none__" label="—" />
                            {#each seasons as season (season.seasonNumber)}
                              <Select.Item value={String(season.seasonNumber)} label={String(season.seasonNumber)} />
                            {/each}
                          </Select.Content>
                        </Select.Root>
                      </div>
                    {/if}

                    <div class="w-28">
                      <label for="episode-{item.id}" class="mb-1 block text-xs font-medium text-muted-foreground">
                        {L.media_progress_episode()}
                        {#if episodesInSeason(state.currentSeason)}
                          <span class="text-muted-foreground/60">/ {episodesInSeason(state.currentSeason)}</span>
                        {/if}
                      </label>
                      <input
                        id="episode-{item.id}"
                        type="number"
                        min="1"
                        max={episodesInSeason(state.currentSeason) ?? undefined}
                        class="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        bind:value={state.currentEpisode}
                      />
                    </div>
                  {/if}
                </div>

                <button
                  class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  onclick={() => saveProgress(item.id)}
                  disabled={state.saveState === 'saving'}
                >
                  {#if state.saveState === 'saving'}
                    {L.media_progress_saving()}
                  {:else if state.saveState === 'saved'}
                    {L.media_progress_saved()}
                  {:else}
                    {L.media_progress_save()}
                  {/if}
                </button>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    {#if cast.length > 0}
      <section class="rounded-xl border bg-card p-4">
        <h2 class="mb-3 text-sm font-semibold">{L.media_cast()}</h2>
        <ul class="space-y-1.5">
          {#each cast as member (member.name)}
            <li class="flex items-baseline justify-between gap-2 text-sm">
              <span class="font-medium">{member.name}</span>
              {#if member.role}
                <span class="shrink-0 text-xs text-muted-foreground">{member.role}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if isEpisodic && seasons.length > 0}
      <section class="rounded-xl border bg-card p-4">
        <h2 class="mb-3 text-sm font-semibold">{L.media_seasons()}</h2>
        <ul class="space-y-1.5">
          {#each seasons as season (season.seasonNumber)}
            <li class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">{L.media_season_number({ n: season.seasonNumber })}</span>
              <span class="font-medium">{L.list_episodes_count({ count: season.episodes })}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>

  {#if media.sources.length > 0}
    <section class="rounded-xl border bg-card p-4">
      <h2 class="mb-3 text-sm font-semibold">{L.media_sources()}</h2>
      <div class="flex flex-wrap gap-2">
        {#each media.sources as source (source.provider)}
          {#if source.externalUrl}
            <a
              href={source.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              {source.provider}
            </a>
          {:else}
            <span class="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              {source.provider}
            </span>
          {/if}
        {/each}
      </div>
    </section>
  {/if}
</article>
