<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import DicesIcon from '@lucide/svelte/icons/dices'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'
  import { createQuery } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'

  import { MediaFiltersBar } from '$features/media-filters'
  import { L } from '$lib'
  import { DEFAULT_GENRE_ALIAS_CONFIG, expandGenreSlugsForQuery } from '$shared/lib/genre-alias'
  import { type MediaFiltersState, mediaFiltersHasAny } from '$shared/lib/media-filters'
  import {
    buildResetMediaFiltersState,
    mediaFilterDefaultSortForSurface,
    mergeNavigateMediaFilters,
    parseFiltersForSurface,
  } from '$shared/lib/media-filters-surface'
  import { buildListItemsApiUrl, writeMediaFiltersToSearchParams } from '$shared/lib/media-filters-url'
  import { getMediaTitlePair } from '$shared/lib/media-title'
  import { buildWheelSpinSectors, sampleWheelPreview } from '$shared/lib/wheel-sample'

  import WheelCanvas from './ui/wheel-canvas.svelte'
  import WheelStrip from './ui/wheel-strip.svelte'

  import type { WheelEntry, WheelGenre, WheelItem } from './wheel.types'
  import type { PageData } from '../../routes/wheel/$types'

  const MAX_SECTORS_CAP = 48
  const MIN_SECTORS_FLOOR = 12
  const DEFAULT_SECTOR_COUNT = 14
  const MAX_WHEEL_CANDIDATES = 300

  type ViewMode = 'wheel' | 'strip'

  const WHEEL_VIEW_MODE_STORAGE_KEY = 'cinetracker:wheel:viewMode'

  const readStoredViewMode = (): ViewMode => {
    if (!browser) {
      return 'wheel'
    }

    try {
      const s = localStorage.getItem(WHEEL_VIEW_MODE_STORAGE_KEY)

      if (s === 'wheel' || s === 'strip') {
        return s
      }
    } catch {
      /* private mode, quota, … */
    }

    return 'wheel'
  }

  const data = $derived(page.data as PageData)
  const genreAliasConfig = $derived(data.genreAliasConfig ?? DEFAULT_GENRE_ALIAS_CONFIG)

  const lists = $derived((data.lists ?? []) as { id: string; title: string; _count?: { items: number } }[])
  const allGenres = $derived((data.genres ?? []) as WheelGenre[])

  const filtersFromUrl = $derived(parseFiltersForSurface(page.url.searchParams, 'wheel'))

  const defaultListId = $derived(lists.find((list) => list.title.toLowerCase() === 'main')?.id ?? data.list?.id ?? '')

  const effectiveListId = $derived(
    filtersFromUrl.listId && lists.some((l) => l.id === filtersFromUrl.listId)
      ? filtersFromUrl.listId
      : defaultListId,
  )

  const wheelNavigate = async (patch: Partial<MediaFiltersState>) => {
    const url = mergeNavigateMediaFilters(page.url, patch, 'wheel')

    await goto(url.toString())
  }

  const randomInt = (maxExclusive: number) => {
    if (maxExclusive <= 1) return 0

    const bytes = new Uint32Array(1)

    crypto.getRandomValues(bytes)

    return bytes[0] % maxExclusive
  }

  const listItemsQuery = createQuery(() => ({
    queryKey: ['wheel-list-items', page.url.search],
    enabled: !!effectiveListId,
    queryFn: async () => {
      const f = parseFiltersForSurface(page.url.searchParams, 'wheel')

      const response = await fetch(buildListItemsApiUrl(effectiveListId, f, { limit: MAX_WHEEL_CANDIDATES }))

      if (!response.ok) throw new Error('Failed to fetch wheel list items')

      return response.json() as Promise<{ items: WheelItem[] }>
    },
    throwOnError: false,
    meta: { onError: () => toast.error(L.common_error_generic()) },
    initialData:
      page.url.search === '' && effectiveListId === data.list?.id
        ? { items: (data.items ?? []) as WheelItem[] }
        : undefined,
    staleTime: 0,
  }))

  const allItems = $derived((listItemsQuery.data?.items ?? []) as WheelItem[])

  let viewMode = $state<ViewMode>(readStoredViewMode())

  $effect(() => {
    if (!browser) {
      return
    }

    const mode = viewMode

    try {
      localStorage.setItem(WHEEL_VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  })
  let sectorCount = $state(DEFAULT_SECTOR_COUNT)
  let wheelDisplayEntries = $state<WheelEntry[]>([])
  let wheelSpinSerial = $state(0)
  let wheelSpinTargetIndex = $state(0)
  let stripSpinSerial = $state(0)
  let stripWinnerId = $state<string | null>(null)
  let winnerEntry = $state<WheelEntry | null>(null)
  let pickerBusy = $state(false)

  const availableGenres = $derived(
    allGenres.filter((genre) => {
      const variantSlugs = new Set(expandGenreSlugsForQuery([genre.slug], genreAliasConfig))

      
return allItems.some((item) =>
        (item.media.genres ?? []).some((g) => variantSlugs.has(g.genre.slug)),
      )
    }),
  )

  const filterSig = $derived(allItems.map((item) => item.id).join('|'))

  const maxSectors = $derived(allItems.length < 2 ? 2 : Math.min(MAX_SECTORS_CAP, allItems.length))

  const minSectors = $derived(allItems.length < 2 ? 2 : Math.min(allItems.length, MIN_SECTORS_FLOOR))

  const showSectorRangeSlider = $derived(maxSectors > minSectors)

  $effect(() => {
    if (sectorCount > maxSectors) sectorCount = maxSectors
    else if (sectorCount < minSectors) sectorCount = minSectors
  })

  const mapToEntry = (item: WheelItem): WheelEntry => ({
    id: item.id,
    mediaId: item.mediaId,
    title: getMediaTitlePair({ title: item.media.title, originalTitle: item.media.originalTitle }).primary,
    posterUrl: item.media.posterUrl,
  })

  const stripEntries = $derived(allItems.map((item) => mapToEntry(item)))

  const wheelPoolSig = $derived(`${viewMode}|${sectorCount}|${filterSig}`)

  $effect(() => {
    const poolSig = wheelPoolSig

    if (!poolSig.startsWith('wheel|')) return

    if (allItems.length < 2) return

    const k = Math.min(sectorCount, allItems.length)

    wheelDisplayEntries = sampleWheelPreview(allItems, k, randomInt).map((item) => mapToEntry(item))
  })

  const winnerResetKey = $derived(`${filterSig}|${viewMode}|${effectiveListId}|${sectorCount}`)

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- reactive dependency
    winnerResetKey

    winnerEntry = null
  })

  const hasFilters = $derived(mediaFiltersHasAny(filtersFromUrl))

  const currentListTitle = $derived(lists.find((list) => list.id === effectiveListId)?.title ?? data.list?.title ?? '—')

  const resetFilters = async () => {
    const base = parseFiltersForSurface(page.url.searchParams, 'wheel')
    const next = buildResetMediaFiltersState(base, 'wheel', { wheelPreserveListId: effectiveListId })
    const url = new URL(page.url)

    writeMediaFiltersToSearchParams(url.searchParams, next, {
      defaultSort: mediaFilterDefaultSortForSurface('wheel'),
    })
    await goto(url.toString())
  }

  const spinWheel = () => {
    if (pickerBusy || allItems.length < 2) return

    const pool = allItems
    const k = Math.min(sectorCount, pool.length)
    const winIndex = randomInt(pool.length)
    const { sectors, winnerSectorIndex } = buildWheelSpinSectors(pool, winIndex, k, randomInt)

    wheelDisplayEntries = sectors.map((item) => mapToEntry(item))
    wheelSpinTargetIndex = winnerSectorIndex
    wheelSpinSerial += 1
  }

  const spinStrip = () => {
    if (pickerBusy || allItems.length < 2) return

    const winIndex = randomInt(allItems.length)
    const winner = allItems[winIndex]

    if (!winner) return

    stripWinnerId = winner.id
    stripSpinSerial += 1
  }

  const onPickerSpinning = (busy: boolean) => {
    pickerBusy = busy
  }

  const onSpinWinner = (entry: WheelEntry) => {
    winnerEntry = entry
  }
</script>

<section class="space-y-4">
  <header class="rounded-xl border bg-card p-4">
    <div class="flex items-start gap-3">
      <div class="rounded-full border bg-muted p-2.5">
        <DicesIcon class="size-5 text-muted-foreground" />
      </div>
      <div class="space-y-1">
        <h1 class="text-xl font-semibold tracking-tight">{L.wheel_page_title()}</h1>
        <p class="text-sm text-muted-foreground">
          {L.wheel_page_description({ list: currentListTitle })}
        </p>
      </div>
    </div>
  </header>

  <MediaFiltersBar
    mode="wheel"
    filters={filtersFromUrl}
    onPatch={(p) => wheelNavigate(p)}
    countryCodes={data.listCountryCodes ?? []}
    canReset={hasFilters}
    onReset={resetFilters}
    catalogGenres={availableGenres}
    boardLists={lists}
    wheelSelectedListId={effectiveListId}
    wheelListTitleText={currentListTitle}
  />

  {#if allItems.length === 1}
    <div class="rounded-xl border border-dashed bg-card p-10 text-center">
      <p class="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{L.wheel_single_match_empty()}</p>
    </div>
  {:else if allItems.length >= 2}
    <div class="space-y-3 rounded-xl border bg-card p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div class="inline-flex rounded-lg border p-0.5" role="group" aria-label={L.wheel_view_mode_group_label()}>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {viewMode === 'wheel'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
            aria-pressed={viewMode === 'wheel'}
            disabled={pickerBusy}
            onclick={() => (viewMode = 'wheel')}
          >
            {L.wheel_view_mode_wheel()}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {viewMode === 'strip'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
            aria-pressed={viewMode === 'strip'}
            disabled={pickerBusy}
            onclick={() => (viewMode = 'strip')}
          >
            {L.wheel_view_mode_strip()}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          {#if viewMode === 'wheel' && showSectorRangeSlider}
            <label class="flex max-w-md min-w-48 flex-1 flex-col gap-1 text-xs text-muted-foreground">
              <span>{L.wheel_sectors_label({ n: sectorCount })}</span>
              <input
                type="range"
                class="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                min={minSectors}
                max={maxSectors}
                bind:value={sectorCount}
                disabled={pickerBusy}
              />
            </label>
          {/if}
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            onclick={() => (viewMode === 'wheel' ? spinWheel() : spinStrip())}
            disabled={pickerBusy}
          >
            <SparklesIcon class="size-4" />
            {pickerBusy ? L.wheel_spinning() : L.wheel_spin_button()}
          </button>
        </div>
      </div>

      <p class="text-xs text-muted-foreground">
        {viewMode === 'wheel' ? L.wheel_fairness_wheel_hint() : L.wheel_fairness_strip_hint()}
      </p>

      {#if viewMode === 'wheel'}
        <WheelCanvas
          entries={wheelDisplayEntries}
          spinSerial={wheelSpinSerial}
          spinTargetSectorIndex={wheelSpinTargetIndex}
          onSpinningChange={onPickerSpinning}
          onSpinComplete={onSpinWinner}
        />
      {:else}
        <WheelStrip
          entries={stripEntries}
          spinSerial={stripSpinSerial}
          winnerId={stripWinnerId}
          onSpinningChange={onPickerSpinning}
          onSpinComplete={onSpinWinner}
        />
      {/if}

      <div class="sr-only" aria-live="polite">
        {#if winnerEntry}
          {L.wheel_winner_live({ title: winnerEntry.title })}
        {/if}
      </div>

      {#if winnerEntry}
        <div class="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
          <div class="flex min-w-0 items-center gap-3">
            {#if winnerEntry.posterUrl}
              <img
                src={winnerEntry.posterUrl}
                alt={winnerEntry.title}
                class="h-14 w-10 shrink-0 rounded-md object-cover"
                loading="lazy"
              />
            {:else}
              <div
                class="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
              >
                ?
              </div>
            {/if}
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">{L.wheel_winner_label()}</p>
              <p class="truncate text-sm font-semibold">{winnerEntry.title}</p>
            </div>
          </div>
          <a
            href={`/media/${winnerEntry.mediaId}`}
            class="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            {L.wheel_open_media()}
          </a>
        </div>
      {/if}
    </div>
  {/if}

  <div class="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
    {#if allItems.length === 0}
      {L.wheel_candidates_count({ filtered: 0, rendered: 0 })}
    {:else if allItems.length === 1}
      {L.wheel_candidates_count({ filtered: 1, rendered: 0 })}
    {:else if viewMode === 'strip'}
      {L.wheel_candidates_strip({ filtered: allItems.length })}
    {:else}
      {L.wheel_candidates_wheel({
        filtered: allItems.length,
        sectors: Math.min(sectorCount, allItems.length),
      })}
    {/if}
    {#if hasFilters}
      <span class="ml-1">{L.wheel_filters_active()}</span>
    {/if}
  </div>
</section>
