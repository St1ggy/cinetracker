<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import { untrack } from 'svelte'
  import { TRIGGERS, dndzone } from 'svelte-dnd-action'

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
    onStatusChange: (itemId: string, newStatus: WatchStatus) => Promise<void>
  }

  const { status, items, ghostItems = [], onStatusChange }: Props = $props()

  const statusMeta = $derived(WATCH_STATUS_META[status])
  const watchStatusLabels = $derived(getWatchStatusLabels(L))

  // Each column owns its local items state for dnd.
  // The parent's `items` prop is the source of truth from the query.
  let localItems = $state(untrack(() => [...items]))
  let isDragging = $state(false)

  // Sync from parent prop when not actively dragging.
  // Always read `items` first so it's tracked as a dependency even when isDragging = true,
  // ensuring the effect re-runs once the refetch completes and isDragging becomes false.
  $effect(() => {
    const incoming = items

    if (!isDragging) localItems = [...incoming]
  })

  const totalDurationMinutes = $derived(
    (() => {
      let total = 0

      for (const item of localItems) {
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

  function handleConsider(event_: CustomEvent<{ items: KanbanItem[] }>) {
    isDragging = true
    localItems = event_.detail.items
  }

  async function handleFinalize(
    event_: CustomEvent<{ items: KanbanItem[]; info: { id: string | number; trigger: string; source: string } }>,
  ) {
    localItems = event_.detail.items

    const { trigger, id } = event_.detail.info
    const movedId = String(id)

    // DROPPED_INTO_ZONE fires when item lands in this column — could be from another column or same.
    // Check the item's original status to confirm it actually moved columns.
    if (trigger === TRIGGERS.DROPPED_INTO_ZONE) {
      const movedItem = localItems.find((item) => String(item.id) === movedId)
      const crossColumn = movedItem && (movedItem.status ?? 'PLAN_TO_WATCH') !== status

      if (crossColumn) {
        // Await so isDragging stays true while PATCH + refetch complete.
        // This prevents the $effect from syncing with stale parent data mid-flight.
        await onStatusChange(movedId, status)
      }
    }

    isDragging = false
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
      {L.board_items_count({ count: localItems.length })}
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
    use:dndzone={{ items: localItems, type: 'kanban', dropTargetStyle: {} }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#if localItems.length === 0}
      <div class="flex items-center justify-center py-8 text-xs text-muted-foreground">
        {L.board_empty_column()}
      </div>
    {:else}
      <div class="space-y-2">
        {#each localItems as item (item.id)}
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
