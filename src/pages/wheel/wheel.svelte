<script lang="ts">
  import { page } from '$app/state'
  import DicesIcon from '@lucide/svelte/icons/dices'
  import { createQuery } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import { getMediaTitlePair } from '$shared/lib/media-title'

  import WheelCanvas from './ui/wheel-canvas.svelte'
  import WheelFilters from './ui/wheel-filters.svelte'

  import type { MediaType, WatchStatus } from '$shared/config/domain'
  import type { WheelGenre, WheelItem } from './wheel.types'
  import type { PageData } from '../../routes/wheel/$types'

  const MAX_RENDERED_SECTORS = 14
  const MAX_WHEEL_CANDIDATES = 300
  const WHEEL_DEFAULT_STATUSES: WatchStatus[] = ['PLAN_TO_WATCH']
  type GenreMatchMode = 'or' | 'and'
  const areSameStatuses = (a: WatchStatus[], b: WatchStatus[]) =>
    a.length === b.length && a.every((status) => b.includes(status))

  const getAdaptiveDefaultStatuses = (items: WheelItem[]): WatchStatus[] => {
    let planToWatchCount = 0

    for (const item of items) {
      if ((item.status ?? 'PLAN_TO_WATCH') === 'PLAN_TO_WATCH') planToWatchCount += 1
    }

    return planToWatchCount >= 2 ? [...WHEEL_DEFAULT_STATUSES] : []
  }

  const data = $derived(page.data as PageData)

  const lists = $derived((data.lists ?? []) as { id: string; title: string; _count?: { items: number } }[])
  const allGenres = $derived((data.genres ?? []) as WheelGenre[])

  const randomInt = (maxExclusive: number) => {
    if (maxExclusive <= 1) return 0

    const bytes = new Uint32Array(1)

    crypto.getRandomValues(bytes)

    return bytes[0] % maxExclusive
  }

  const defaultListId = $derived(lists.find((list) => list.title.toLowerCase() === 'main')?.id ?? data.list?.id ?? '')

  let currentListId = $state('')
  let genreMatchMode = $state<GenreMatchMode>('or')

  $effect(() => {
    if (!currentListId && defaultListId) currentListId = defaultListId
  })

  const listItemsQuery = createQuery(() => ({
    queryKey: ['wheel-list-items', currentListId],
    enabled: !!currentListId,
    queryFn: async () => {
      const response = await fetch(`/api/lists/${currentListId}/items?limit=${MAX_WHEEL_CANDIDATES}&sort=added_desc`)

      if (!response.ok) throw new Error('Failed to fetch wheel list items')

      return response.json() as Promise<{ items: WheelItem[] }>
    },
    throwOnError: false,
    meta: { onError: () => toast.error(L.common_error_generic()) },
    initialData: currentListId === data.list?.id ? { items: (data.items ?? []) as WheelItem[] } : undefined,
    staleTime: 0,
  }))

  const allItems = $derived((listItemsQuery.data?.items ?? []) as WheelItem[])

  let selectedTypes = $state<MediaType[]>([])
  let selectedStatuses = $state<WatchStatus[]>([...WHEEL_DEFAULT_STATUSES])
  let selectedGenreSlugs = $state<string[]>([])
  let defaultStatuses = $state<WatchStatus[]>([...WHEEL_DEFAULT_STATUSES])
  let autoStatusDefaultsEnabled = $state(true)
  let autoStatusDefaultsListId = $state('')

  const availableGenres = $derived(
    allGenres.filter((genre) =>
      allItems.some((item) => (item.media.genres ?? []).some((g) => g.genre.slug === genre.slug)),
    ),
  )

  const filteredItems = $derived(
    allItems.filter((item) => {
      const itemStatus = (item.status ?? 'PLAN_TO_WATCH') as WatchStatus

      if (selectedTypes.length > 0 && !selectedTypes.includes(item.media.mediaType)) return false

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(itemStatus)) return false

      if (selectedGenreSlugs.length > 0) {
        const itemGenres = new Set((item.media.genres ?? []).map((genre) => genre.genre.slug))

        if (genreMatchMode === 'and') {
          if (!selectedGenreSlugs.every((slug) => itemGenres.has(slug))) return false
        } else if (!selectedGenreSlugs.some((slug) => itemGenres.has(slug))) {
          return false
        }
      }

      return true
    }),
  )

  const sampledItems = $derived(
    (() => {
      const pool = [...filteredItems]

      for (let index = pool.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInt(index + 1)
        const current = pool[index]

        pool[index] = pool[swapIndex]
        pool[swapIndex] = current
      }

      return pool.slice(0, MAX_RENDERED_SECTORS)
    })(),
  )

  const entries = $derived(
    sampledItems.map((item) => ({
      id: item.id,
      mediaId: item.mediaId,
      title: getMediaTitlePair({ title: item.media.title, originalTitle: item.media.originalTitle }).primary,
      posterUrl: item.media.posterUrl,
    })),
  )

  const hasFilters = $derived(
    selectedTypes.length > 0 || selectedGenreSlugs.length > 0 || !areSameStatuses(selectedStatuses, defaultStatuses),
  )
  const currentListTitle = $derived(lists.find((list) => list.id === currentListId)?.title ?? data.list?.title ?? '—')

  $effect(() => {
    if (!currentListId) return

    if (autoStatusDefaultsListId !== currentListId) {
      autoStatusDefaultsListId = currentListId
      autoStatusDefaultsEnabled = true
    }
  })

  $effect(() => {
    if (!autoStatusDefaultsEnabled) return

    const adaptiveDefault = getAdaptiveDefaultStatuses(allItems)

    defaultStatuses = adaptiveDefault
    selectedStatuses = adaptiveDefault
  })

  const toggleType = (type: MediaType) => {
    selectedTypes = selectedTypes.includes(type) ? selectedTypes.filter((v) => v !== type) : [...selectedTypes, type]
  }

  const toggleStatus = (status: WatchStatus) => {
    autoStatusDefaultsEnabled = false
    selectedStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((v) => v !== status)
      : [...selectedStatuses, status]
  }

  const toggleGenre = (slug: string) => {
    selectedGenreSlugs = selectedGenreSlugs.includes(slug)
      ? selectedGenreSlugs.filter((v) => v !== slug)
      : [...selectedGenreSlugs, slug]
  }

  const resetFilters = () => {
    selectedTypes = []
    selectedGenreSlugs = []
    autoStatusDefaultsEnabled = true

    const adaptiveDefault = getAdaptiveDefaultStatuses(allItems)

    defaultStatuses = adaptiveDefault
    selectedStatuses = adaptiveDefault
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

  <WheelFilters
    {lists}
    {currentListId}
    {currentListTitle}
    onListChange={(listId) => (currentListId = listId)}
    {genreMatchMode}
    onGenreMatchModeChange={(value) => (genreMatchMode = value)}
    genres={availableGenres}
    {selectedTypes}
    {selectedStatuses}
    {selectedGenreSlugs}
    canResetFilters={hasFilters}
    onToggleType={toggleType}
    onToggleStatus={toggleStatus}
    onToggleGenre={toggleGenre}
    onReset={resetFilters}
  />

  {#if filteredItems.length === 1}
    <div class="rounded-xl border border-dashed bg-card p-10 text-center">
      <p class="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{L.wheel_single_match_empty()}</p>
    </div>
  {:else}
    <WheelCanvas {entries} />
  {/if}

  <div class="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
    {#if filteredItems.length === 0}
      {L.wheel_candidates_count({ filtered: 0, rendered: 0 })}
    {:else if filteredItems.length === 1}
      {L.wheel_candidates_count({ filtered: 1, rendered: 0 })}
    {:else}
      {L.wheel_candidates_count({ filtered: filteredItems.length, rendered: entries.length })}
    {/if}
    {#if hasFilters}
      <span class="ml-1">{L.wheel_filters_active()}</span>
    {/if}
  </div>
</section>
