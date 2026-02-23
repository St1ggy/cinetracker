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

  // Local mutable columns for dnd optimistic updates.
  let columns = $state<Record<WatchStatus, KanbanItem[]>>({
    PLAN_TO_WATCH: [],
    IN_PROGRESS: [],
    WATCHED: [],
  })

  // Sync from query data whenever it changes (but not during drag).
  let isDragging = $state(false)

  $effect(() => {
    if (isDragging) return

    const items = allItems

    columns = {
      PLAN_TO_WATCH: items.filter((index) => (index.status ?? 'PLAN_TO_WATCH') === 'PLAN_TO_WATCH'),
      IN_PROGRESS: items.filter((index) => index.status === 'IN_PROGRESS'),
      WATCHED: items.filter((index) => index.status === 'WATCHED'),
    }
  })

  // Ghost cards: IN_PROGRESS items with episode progress shown in WATCHED column.
  const ghostItems = $derived(
    allItems.filter(
      (index) =>
        index.status === 'IN_PROGRESS' &&
        (index.currentEpisode != null || index.currentSeason != null) &&
        (index.media.mediaType === 'TV' || index.media.mediaType === 'ANIME'),
    ),
  )

  // Dialog state for episodic → WATCHED drop.
  let pendingMove = $state<{ itemId: string; item: KanbanItem } | null>(null)

  const isEpisodic = (item: KanbanItem) => item.media.mediaType === 'TV' || item.media.mediaType === 'ANIME'

  const patchStatus = async (itemId: string, status: WatchStatus, currentEpisode?: number | null) => {
    const body: Record<string, unknown> = { status }

    if (currentEpisode !== undefined) body.currentEpisode = currentEpisode

    const response = await fetch(`/api/lists/${data.list.id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) throw new Error('Failed to update status')
  }

  const handleStatusChange = async (itemId: string, newStatus: WatchStatus) => {
    const item = allItems.find((index) => index.id === itemId)

    if (!item) return

    if (newStatus === 'WATCHED' && isEpisodic(item)) {
      pendingMove = { itemId, item }

      return
    }

    try {
      await patchStatus(itemId, newStatus)
      toast.success(L.board_status_changed())
      await queryClient.invalidateQueries({ queryKey: ['board-items'] })
    } catch {
      toast.error(L.common_error_generic())
      await queryClient.invalidateQueries({ queryKey: ['board-items'] })
    } finally {
      isDragging = false
    }
  }

  const handleDialogConfirm = async (action: 'complete' | 'update-episode', episode?: number) => {
    if (!pendingMove) return

    const { itemId } = pendingMove

    pendingMove = null

    try {
      await (action === 'complete' ? patchStatus(itemId, 'WATCHED', null) : patchStatus(itemId, 'IN_PROGRESS', episode))
      toast.success(L.board_status_changed())
      await queryClient.invalidateQueries({ queryKey: ['board-items'] })
    } catch {
      toast.error(L.common_error_generic())
      await queryClient.invalidateQueries({ queryKey: ['board-items'] })
    } finally {
      isDragging = false
    }
  }

  const handleDialogCancel = () => {
    pendingMove = null
    isDragging = false
    queryClient.invalidateQueries({ queryKey: ['board-items'] })
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
    {#each WATCH_STATUSES as status (status)}
      <KanbanColumn
        {status}
        items={columns[status]}
        ghostItems={status === 'WATCHED' ? ghostItems : []}
        onItemsChange={(updated) => {
          isDragging = true
          columns[status] = updated
        }}
        onStatusChange={(itemId, newStatus) => {
          handleStatusChange(itemId, newStatus)
        }}
      />
    {/each}
  </div>
{/if}

{#if pendingMove}
  <EpisodicWatchedDialog item={pendingMove.item} onConfirm={handleDialogConfirm} onCancel={handleDialogCancel} />
{/if}
