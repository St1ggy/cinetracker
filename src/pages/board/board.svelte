<script lang="ts">
  import { page } from '$app/state'
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { tick } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import { MEDIA_TYPES, WATCH_STATUSES } from '$shared/config/domain'
  import { getMediaTypeMeta } from '$shared/lib/labels'

  import EpisodicWatchedDialog from './ui/episodic-watched-dialog.svelte'
  import KanbanColumn from './ui/kanban-column.svelte'

  import type { MediaType, WatchStatus } from '$shared/config/domain'
  import type { KanbanItem } from './board.types'
  import type { PageData } from '../../routes/board/$types'

  const data = $derived(page.data as PageData)
  const queryClient = useQueryClient()

  let selectedListIds = $state<string[]>([])

  // No lists selected = show from all owned lists (merged by media). Otherwise from selected only.
  const effectiveListIds = $derived(selectedListIds.length > 0 ? selectedListIds : (data.lists ?? []).map((l) => l.id))

  const boardQuery = createQuery(() => ({
    queryKey: ['board-items', [...effectiveListIds].toSorted((a, b) => a.localeCompare(b)).join(',')],
    enabled: effectiveListIds.length > 0,
    queryFn: async () => {
      const response = await fetch(`/api/board/items?listIds=${encodeURIComponent(effectiveListIds.join(','))}`)

      if (!response.ok) throw new Error('Failed to fetch board items')

      return response.json() as Promise<{ items: KanbanItem[] }>
    },
    throwOnError: false,
    meta: { onError: () => toast.error(L.common_error_generic()) },
    staleTime: 0,
  }))

  const allItems = $derived((boardQuery.data?.items ?? []) as KanbanItem[])

  // Filter chips: type (OR within types) AND genre (ALL selected genres must be on item).
  let selectedTypes = $state<MediaType[]>([])
  let selectedGenreSlugs = $state<string[]>([])

  const availableGenres = $derived(
    (() => {
      const list: { slug: string; name: string }[] = []

      for (const item of allItems) {
        for (const g of item.media.genres ?? []) {
          const slug = g.genre.slug

          if (!list.some((x) => x.slug === slug)) list.push({ slug, name: g.genre.name })
        }
      }

      return list.toSorted((a, b) => a.name.localeCompare(b.name))
    })(),
  )

  const filteredItems = $derived(
    (() => {
      let list = allItems

      if (selectedTypes.length > 0) {
        const set = new Set(selectedTypes)

        list = list.filter((item) => set.has(item.media.mediaType as MediaType))
      }

      if (selectedGenreSlugs.length > 0) {
        list = list.filter((item) => {
          const itemSlugs = new Set((item.media.genres ?? []).map((g) => g.genre.slug))

          return selectedGenreSlugs.every((slug) => itemSlugs.has(slug))
        })
      }

      return list
    })(),
  )

  const hasActiveFilters = $derived(selectedTypes.length > 0 || selectedGenreSlugs.length > 0)

  function toggleType(type: MediaType) {
    const index = selectedTypes.indexOf(type)

    selectedTypes = index === -1 ? [...selectedTypes, type] : selectedTypes.toSpliced(index, 1)
  }

  function toggleGenre(slug: string) {
    const index = selectedGenreSlugs.indexOf(slug)

    selectedGenreSlugs = index === -1 ? [...selectedGenreSlugs, slug] : selectedGenreSlugs.toSpliced(index, 1)
  }

  function clearFilters() {
    selectedTypes = []
    selectedGenreSlugs = []
  }

  function toggleList(listId: string) {
    const next = selectedListIds.includes(listId)
      ? selectedListIds.filter((id) => id !== listId)
      : [...selectedListIds, listId]

    selectedListIds = next
  }

  const isListSelected = (listId: string) => selectedListIds.length > 0 && selectedListIds.includes(listId)

  // Columns are derived from filtered items.
  const columns = $derived<Record<WatchStatus, KanbanItem[]>>({
    PLAN_TO_WATCH: filteredItems.filter((index) => (index.status ?? 'PLAN_TO_WATCH') === 'PLAN_TO_WATCH'),
    IN_PROGRESS: filteredItems.filter((index) => index.status === 'IN_PROGRESS'),
    WATCHED: filteredItems.filter((index) => index.status === 'WATCHED'),
  })

  const ghostItems = $derived(
    filteredItems.filter(
      (index) =>
        index.status === 'IN_PROGRESS' &&
        (index.currentEpisode != null || index.currentSeason != null) &&
        (index.media.mediaType === 'TV' || index.media.mediaType === 'ANIME'),
    ),
  )

  // Dialog: for episodic items dropped into WATCHED we ask the user what to do.
  // A resolve function is stored so the awaiting column can be unblocked when the dialog closes.
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

  // Returns a Promise that resolves only after the DB is updated and the query has refetched.
  // The column awaits this before resetting its isDragging flag, preventing stale-data flickers.
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
  <div class="flex flex-col gap-3" style="height: calc(100vh - 7rem)">
    <!-- Lists, type and genre filters -->
    <div class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
      {#if (data.lists?.length ?? 0) > 0}
        <span class="shrink-0 text-xs font-medium text-muted-foreground">{L.board_filter_lists()}</span>
        {#each data.lists as list (list.id)}
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {isListSelected(list.id)
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}"
            onclick={() => toggleList(list.id)}
          >
            {list.title}
            {#if list._count?.items != null}
              <span class="opacity-70">({list._count.items})</span>
            {/if}
          </button>
        {/each}
        <span class="shrink-0 text-border">|</span>
      {/if}
      <span class="shrink-0 text-xs font-medium text-muted-foreground">{L.board_filter_types()}</span>
      {#each MEDIA_TYPES as type (type)}
        {@const meta = getMediaTypeMeta(type)}
        <button
          type="button"
          class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedTypes.includes(type)
            ? 'border-transparent bg-primary text-primary-foreground'
            : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'} {meta.color}"
          onclick={() => toggleType(type)}
        >
          {meta.label}
        </button>
      {/each}
      {#if availableGenres.length > 0}
        <span class="ml-2 shrink-0 text-xs font-medium text-muted-foreground">{L.board_filter_genres()}</span>
        {#each availableGenres as g (g.slug)}
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedGenreSlugs.includes(
              g.slug,
            )
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}"
            onclick={() => toggleGenre(g.slug)}
          >
            {g.name}
          </button>
        {/each}
      {/if}
      {#if hasActiveFilters}
        <button
          type="button"
          class="rounded-full border border-dashed border-muted-foreground/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          onclick={clearFilters}
        >
          {L.board_filter_clear()}
        </button>
      {/if}
    </div>

    <div class="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
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
