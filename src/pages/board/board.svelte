<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { tick } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { MediaFiltersBar } from '$features/media-filters'
  import { L } from '$lib'
  import { WATCH_STATUSES } from '$shared/config/domain'
  import { DEFAULT_GENRE_ALIAS_CONFIG, dedupeGenreNameRows } from '$shared/lib/genre-alias'
  import { type MediaFiltersState, mediaFiltersHasAny } from '$shared/lib/media-filters'
  import {
    buildResetMediaFiltersState,
    mediaFilterDefaultSortForSurface,
    mergeNavigateMediaFilters,
    parseFiltersForSurface,
  } from '$shared/lib/media-filters-surface'
  import { buildBoardItemsApiUrl, writeMediaFiltersToSearchParams } from '$shared/lib/media-filters-url'

  import EpisodicWatchedDialog from './ui/episodic-watched-dialog.svelte'
  import KanbanColumn from './ui/kanban-column.svelte'

  import type { WatchStatus } from '$shared/config/domain'
  import type { KanbanItem } from './board.types'
  import type { PageData } from '../../routes/board/$types'

  const data = $derived(page.data as PageData)
  const genreAliasConfig = $derived(data.genreAliasConfig ?? DEFAULT_GENRE_ALIAS_CONFIG)
  const queryClient = useQueryClient()

  const filtersFromUrl = $derived(parseFiltersForSurface(page.url.searchParams, 'board'))

  const effectiveListIds = $derived(
    filtersFromUrl.listIds.length > 0
      ? filtersFromUrl.listIds
      : (data.lists ?? []).map((l) => l.id),
  )

  const boardNavigate = async (patch: Partial<MediaFiltersState>) => {
    const url = mergeNavigateMediaFilters(page.url, patch, 'board')

    await goto(url.toString())
  }

  const boardQuery = createQuery(() => ({
    queryKey: ['board-items', page.url.search],
    enabled: effectiveListIds.length > 0,
    queryFn: async () => {
      const response = await fetch(buildBoardItemsApiUrl(effectiveListIds, filtersFromUrl))

      if (!response.ok) throw new Error('Failed to fetch board items')

      return response.json() as Promise<{ items: KanbanItem[] }>
    },
    throwOnError: false,
    meta: { onError: () => toast.error(L.common_error_generic()) },
    staleTime: 0,
  }))

  const allItems = $derived((boardQuery.data?.items ?? []) as KanbanItem[])

  const availableGenres = $derived(
    (() => {
      const list: { slug: string; name: string }[] = []

      for (const item of allItems) {
        for (const g of item.media.genres ?? []) {
          const slug = g.genre.slug

          if (!list.some((x) => x.slug === slug)) list.push({ slug, name: g.genre.name })
        }
      }

      return dedupeGenreNameRows(list, genreAliasConfig)
    })(),
  )

  const hasActiveFilters = $derived(mediaFiltersHasAny(filtersFromUrl))

  async function clearFilters() {
    const base = parseFiltersForSurface(page.url.searchParams, 'board')
    const next = buildResetMediaFiltersState(base, 'board')
    const url = new URL(page.url)

    writeMediaFiltersToSearchParams(url.searchParams, next, {
      defaultSort: mediaFilterDefaultSortForSurface('board'),
    })
    await goto(url.toString())
  }

  function toggleList(listId: string) {
    let nextIds = [...filtersFromUrl.listIds]
    const all = (data.lists ?? []).map((l) => l.id)

    if (nextIds.length === 0) nextIds = [...all]

    nextIds = nextIds.includes(listId) ? nextIds.filter((id) => id !== listId) : [...nextIds, listId]

    if (nextIds.length >= all.length) nextIds = []

    boardNavigate({ listIds: nextIds })
  }

  const columns = $derived<Record<WatchStatus, KanbanItem[]>>({
    PLAN_TO_WATCH: allItems.filter((index) => (index.status ?? 'PLAN_TO_WATCH') === 'PLAN_TO_WATCH'),
    IN_PROGRESS: allItems.filter((index) => index.status === 'IN_PROGRESS'),
    WATCHED: allItems.filter((index) => index.status === 'WATCHED'),
  })

  const ghostItems = $derived(
    allItems.filter(
      (index) =>
        index.status === 'IN_PROGRESS' &&
        (index.currentEpisode != null || index.currentSeason != null) &&
        (index.media.mediaType === 'TV' || index.media.mediaType === 'ANIME'),
    ),
  )

  type PendingMove = { itemId: string; item: KanbanItem; resolve: () => void }
  let pendingMove = $state<PendingMove | null>(null)

  const isEpisodic = (item: KanbanItem) => item.media.mediaType === 'TV' || item.media.mediaType === 'ANIME'

  const patchStatus = async (
    mediaId: string,
    status: WatchStatus,
    currentSeason?: number | null,
    currentEpisode?: number | null,
  ) => {
    const body: Record<string, unknown> = { mediaId, listIds: effectiveListIds, status }

    if (currentSeason !== undefined) body.currentSeason = currentSeason

    if (currentEpisode !== undefined) body.currentEpisode = currentEpisode

    const response = await fetch('/api/board/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) throw new Error('Failed to update status')
  }

  const handleStatusChange = async (itemId: string, newStatus: WatchStatus): Promise<void> => {
    const item = allItems.find((index) => index.id === itemId)

    if (!item?.mediaId) return

    if (newStatus === 'WATCHED' && isEpisodic(item)) {
      return new Promise<void>((resolve) => {
        pendingMove = { itemId, item, resolve }
      })
    }

    try {
      await patchStatus(item.mediaId, newStatus)
      toast.success(L.board_status_changed())
    } catch {
      toast.error(L.common_error_generic())
    }

    await queryClient.refetchQueries({ queryKey: ['board-items'] })
  }

  const handleDialogConfirm = async (status: 'WATCHED' | 'IN_PROGRESS', season?: number, episode?: number) => {
    if (!pendingMove) return

    const { item, resolve } = pendingMove

    pendingMove = null

    try {
      await (status === 'WATCHED'
        ? patchStatus(item.mediaId, 'WATCHED', null, null)
        : patchStatus(item.mediaId, 'IN_PROGRESS', season ?? null, episode ?? null))

      toast.success(L.board_status_changed())
    } catch {
      toast.error(L.common_error_generic())
    }

    await queryClient.refetchQueries({ queryKey: ['board-items'] })
    await tick()
    resolve()
  }

  const handleDialogCancel = async () => {
    if (!pendingMove) return

    const { resolve } = pendingMove

    pendingMove = null

    await queryClient.refetchQueries({ queryKey: ['board-items'] })
    await tick()
    resolve()
  }

</script>

{#if !data.list}
  <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 py-16 text-center">
    <div class="rounded-full border bg-muted p-4">
      <LayoutDashboardIcon class="size-7 text-muted-foreground" />
    </div>
    <p class="text-sm font-medium">{L.board_no_list()}</p>
  </div>
{:else}
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="space-y-2">
      <MediaFiltersBar
        mode="board"
        filters={filtersFromUrl}
        onPatch={(p) => boardNavigate(p)}
        countryCodes={data.boardCountryCodes ?? []}
        canReset={hasActiveFilters}
        onReset={clearFilters}
        boardLists={data.lists ?? []}
        boardGenres={availableGenres}
        onBoardListToggle={toggleList}
      />
    </div>

    <div class="flex min-h-0 flex-1 items-stretch gap-4 overflow-x-auto pb-4">
      {#each WATCH_STATUSES.toReversed() as status (status)}
        <KanbanColumn
          {status}
          items={columns[status]}
          ghostItems={status === 'WATCHED' ? ghostItems : []}
          onStatusChange={handleStatusChange}
        />
      {/each}
    </div>
  </div>
{/if}

{#if pendingMove}
  <EpisodicWatchedDialog item={pendingMove.item} onConfirm={handleDialogConfirm} onCancel={handleDialogCancel} />
{/if}
