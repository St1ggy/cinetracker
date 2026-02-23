<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import { dndzone } from 'svelte-dnd-action'

  import { L } from '$lib'
  import { WATCH_STATUS_META } from '$shared/config/domain'
  import { getWatchStatusLabels } from '$shared/lib/labels'
  import { scrollFade } from '$shared/lib/scroll-fade'

  import KanbanCard from './kanban-card.svelte'

  import type { WatchStatus } from '$shared/config/domain'
  import type { KanbanItem } from '../board.types'

  type Props = {
    status: WatchStatus
    items: KanbanItem[]
    ghostItems?: KanbanItem[]
    onItemsChange: (items: KanbanItem[]) => void
    onStatusChange: (itemId: string, newStatus: WatchStatus) => void
  }

  const { status, items, ghostItems = [], onItemsChange, onStatusChange }: Props = $props()

  const statusMeta = $derived(WATCH_STATUS_META[status])
  const watchStatusLabels = $derived(getWatchStatusLabels(L))

  const totalDurationMinutes = $derived(
    (() => {
      let total = 0

      for (const item of items) {
        const type = item.media.mediaType

        if (type === 'TV' || type === 'ANIME') {
          const avgRuntime =
            item.media.episodeRuntimeMin != null && item.media.episodeRuntimeMax != null
              ? Math.round((item.media.episodeRuntimeMin + item.media.episodeRuntimeMax) / 2)
              : (item.media.episodeRuntimeMin ?? item.media.episodeRuntimeMax ?? 0)

          total += (item.media.episodesCount ?? 0) * avgRuntime
        } else {
          total += item.media.runtimeMinutes ?? 0
        }
      }

      return total
    })(),
  )

  const hours = $derived(Math.floor(totalDurationMinutes / 60))
  const minutes = $derived(totalDurationMinutes % 60)

  const handleConsider = (event_: CustomEvent<{ items: KanbanItem[] }>) => {
    onItemsChange(event_.detail.items)
  }

  const handleFinalize = (event_: CustomEvent<{ items: KanbanItem[]; info: { id: string; source: string } }>) => {
    const movedItem = items.find((index) => index.id === event_.detail.info.id)

    onItemsChange(event_.detail.items)

    if (movedItem && movedItem.status !== status) {
      onStatusChange(event_.detail.info.id, status)
    }
  }
</script>

<div class="flex min-w-[272px] flex-1 flex-col rounded-xl border bg-muted/30">
  <div class="flex items-center gap-2 border-b px-4 py-3">
    <div class="rounded-full p-1 text-white shadow-sm" style="background-color: {statusMeta.bgColor}">
      {#if statusMeta.icon === 'circle-check'}
        <CircleCheckIcon class="size-3.5" />
      {:else if statusMeta.icon === 'circle-play'}
        <CirclePlayIcon class="size-3.5" />
      {:else}
        <ClockIcon class="size-3.5" />
      {/if}
    </div>

    <h2 class="text-sm font-semibold">{watchStatusLabels[status]}</h2>

    <span class="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {L.board_items_count({ count: items.length })}
    </span>
  </div>

  {#if totalDurationMinutes > 0}
    <div class="border-b px-4 py-2 text-xs text-muted-foreground">
      {L.board_total_duration({ hours, minutes })}
    </div>
  {/if}

  <div
    class="scroll-fade flex-1 overflow-y-auto p-2"
    style="min-height: 80px"
    use:scrollFade
    use:dndzone={{ items, type: 'kanban', dropTargetStyle: {} }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#if items.length === 0}
      <div class="flex items-center justify-center py-8 text-xs text-muted-foreground">
        {L.board_empty_column()}
      </div>
    {:else}
      <div class="space-y-2">
        {#each items as item (item.id)}
          <KanbanCard {item} />
        {/each}
      </div>
    {/if}
  </div>

  {#if ghostItems.length > 0}
    <div class="border-t px-2 py-2">
      <div class="space-y-2">
        {#each ghostItems as item (item.id)}
          <KanbanCard {item} ghost />
        {/each}
      </div>
    </div>
  {/if}
</div>
