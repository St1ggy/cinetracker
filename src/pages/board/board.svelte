<script lang="ts">
  import { page } from '$app/state'
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { untrack } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import { WATCH_STATUSES } from '$shared/config/domain'

  import EpisodicWatchedDialog from './ui/episodic-watched-dialog.svelte'
  import KanbanColumn from './ui/kanban-column.svelte'

  import type { WatchStatus } from '$shared/config/domain'
  import type { KanbanItem } from './board.types'
  import type { PageData } from '../../routes/board/$types'

  const data = $derived(page.data as PageData)
  const queryClient = useQueryClient()

  const boardQuery = createQuery(() => ({
    queryKey: ['board-items', data.list?.id],
    enabled: !!data.list?.id,
    queryFn: async () => {
      const response = await fetch(`/api/lists/${data.list.id}/items?limit=500`)

      if (!response.ok) throw new Error('Failed to fetch board items')

      return response.json() as Promise<{ items: typeof data.items }>
    },
    throwOnError: false,
    meta: { onError: () => toast.error(L.common_error_generic()) },
    initialData: { items: untrack(() => data.items ?? []) },
    staleTime: 0,
  }))

  const allItems = $derived((boardQuery.data?.items ?? []) as KanbanItem[])

  // Columns are derived from query data; each KanbanColumn owns its own local
  // drag state and syncs back from these props after each refetch.
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

  // Dialog: for episodic items dropped into WATCHED we ask the user what to do.
  // A resolve function is stored so the awaiting column can be unblocked when the dialog closes.
  type PendingMove = { itemId: string; item: KanbanItem; resolve: () => void }
  let pendingMove = $state<PendingMove | null>(null)

  const isEpisodic = (item: KanbanItem) => item.media.mediaType === 'TV' || item.media.mediaType === 'ANIME'

  const patchStatus = async (
    itemId: string,
    status: WatchStatus,
    currentSeason?: number | null,
    currentEpisode?: number | null,
  ) => {
    const body: Record<string, unknown> = { status }

    if (currentSeason !== undefined) body.currentSeason = currentSeason

    if (currentEpisode !== undefined) body.currentEpisode = currentEpisode

    const response = await fetch(`/api/lists/${data.list.id}/items/${itemId}`, {
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

    if (!item) return

    if (newStatus === 'WATCHED' && isEpisodic(item)) {
      return new Promise<void>((resolve) => {
        pendingMove = { itemId, item, resolve }
      })
    }

    try {
      await patchStatus(itemId, newStatus)
      toast.success(L.board_status_changed())
    } catch {
      toast.error(L.common_error_generic())
    }

    await queryClient.refetchQueries({ queryKey: ['board-items'] })
  }

  const handleDialogConfirm = async (status: 'WATCHED' | 'IN_PROGRESS', season?: number, episode?: number) => {
    if (!pendingMove) return

    const { itemId, resolve } = pendingMove

    pendingMove = null

    try {
      await (status === 'WATCHED'
        ? patchStatus(itemId, 'WATCHED', null, null)
        : patchStatus(itemId, 'IN_PROGRESS', season ?? null, episode ?? null))

      toast.success(L.board_status_changed())
    } catch {
      toast.error(L.common_error_generic())
    }

    await queryClient.refetchQueries({ queryKey: ['board-items'] })
    resolve()
  }

  const handleDialogCancel = async () => {
    if (!pendingMove) return

    const { resolve } = pendingMove

    pendingMove = null

    await queryClient.refetchQueries({ queryKey: ['board-items'] })
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
  <div class="flex gap-4 overflow-x-auto pb-4" style="height: calc(100vh - 7rem)">
    {#each WATCH_STATUSES.toReversed() as status (status)}
      <KanbanColumn
        {status}
        items={columns[status]}
        ghostItems={status === 'WATCHED' ? ghostItems : []}
        onStatusChange={handleStatusChange}
      />
    {/each}
  </div>
{/if}

{#if pendingMove}
  <EpisodicWatchedDialog item={pendingMove.item} onConfirm={handleDialogConfirm} onCancel={handleDialogCancel} />
{/if}
