<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import { untrack } from 'svelte'
  import { flip } from 'svelte/animate'
  import { SHADOW_ITEM_MARKER_PROPERTY_NAME, TRIGGERS, dndzone } from 'svelte-dnd-action'

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

  function itemDurationMinutes(it: KanbanItem, kind: 'watched' | 'remaining' | 'total'): number {
    const type = it.media.mediaType
    const avgRuntime =
      it.media.episodeRuntimeMin != null && it.media.episodeRuntimeMax != null
        ? Math.round((it.media.episodeRuntimeMin + it.media.episodeRuntimeMax) / 2)
        : (it.media.episodeRuntimeMin ?? it.media.episodeRuntimeMax ?? 0)

    if (type === 'TV' || type === 'ANIME') {
      if (kind === 'watched') {
        const watched = it.currentEpisode ?? 0

        return watched * avgRuntime
      }

      if (kind === 'remaining') {
        const watched = it.currentEpisode ?? 0
        const remaining = Math.max(0, (it.media.episodesCount ?? 0) - watched)

        return remaining * avgRuntime
      }

      return (it.media.episodesCount ?? 0) * avgRuntime
    }

    return it.media.runtimeMinutes ?? 0
  }

  const totalDurationMinutes = $derived(
    (() => {
      let kind: 'watched' | 'remaining' | 'total' = 'total'

      if (status === 'WATCHED') kind = 'watched'
      else if (status === 'IN_PROGRESS') kind = 'remaining'

      let total = 0

      for (const it of localItems) total += itemDurationMinutes(it, kind)

      // Watched column header: include ghost items' watched time (already watched portion).
      if (status === 'WATCHED' && ghostItems.length > 0) {
        for (const it of ghostItems) total += itemDurationMinutes(it, 'watched')
      }

      return total
    })(),
  )

  const hours = $derived(Math.floor(totalDurationMinutes / 60))
  const minutes = $derived(totalDurationMinutes % 60)

  const flipDurationMs = 200

  function handleConsider(event_: CustomEvent<{ items: KanbanItem[] }>) {
    isDragging = true
    localItems = event_.detail.items
  }

  async function handleFinalize(
    event_: CustomEvent<{ items: KanbanItem[]; info: { id: string | number; trigger: string; source: string } }>,
  ) {
    const { trigger, id } = event_.detail.info
    const movedId = String(id)

    // DROPPED_INTO_ZONE fires when item lands in this column — could be from another column or same.
    // Check the item's original status to confirm it actually moved columns.
    if (trigger === TRIGGERS.DROPPED_INTO_ZONE) {
      const movedItem = event_.detail.items.find((item) => String(item.id) === movedId)
      const crossColumn = movedItem && (movedItem.status ?? 'PLAN_TO_WATCH') !== status

      if (crossColumn) {
        // Optimistically update the dropped item's status so the icon reflects the new
        // column immediately — without waiting for the PATCH + refetch to complete.
        localItems = event_.detail.items.map((item) => (String(item.id) === movedId ? { ...item, status } : item))

        // Await so isDragging stays true while PATCH + refetch complete.
        // This prevents the $effect from syncing with stale parent data mid-flight.
        await onStatusChange(movedId, status)
      } else {
        localItems = event_.detail.items
      }
    } else {
      localItems = event_.detail.items
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

    <h2 class="min-w-0 flex-1 text-sm font-semibold">
      {watchStatusLabels[status]}
      {#if totalDurationMinutes > 0}
        <span class="font-normal text-muted-foreground">
          ({L.board_total_duration({ hours, minutes })})
        </span>
      {/if}
    </h2>

    <span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {L.board_items_count({ count: localItems.length })}
    </span>
  </div>

  {#if ghostItems.length > 0}
    <div class="border-b px-2 py-2">
      <div class="flex flex-col gap-2">
        {#each ghostItems as item (item.id)}
          <KanbanCard {item} ghost />
        {/each}
      </div>
    </div>
  {/if}

  <!-- Wrap dndzone in a scroll container so the action receives a fixed-height
       scrollable element. dndzone must only have KanbanCards as direct children —
       any wrapper div inside makes the library treat the wrapper as the single
       draggable unit (causing all cards to move together). -->
  <div class="scroll-fade relative flex-1 overflow-y-auto" use:scrollFade>
    <div
      class="kanban-drop-zone flex min-h-full flex-col gap-2 p-2"
      use:dndzone={{
        items: localItems,
        type: 'kanban',
        flipDurationMs,
        morphDisabled: true,
        dropTargetStyle: {},
        dropTargetClasses: ['board-column-drop-target'],
      }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each localItems as item (item.id)}
        <!-- animate:flip must be on a DOM element, not a component, so we wrap.
             This div is the direct child that dndzone drags; the card renders inside it. -->
        <div class="kanban-dnd-item" animate:flip={{ duration: flipDurationMs }}>
          {#if (item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
            <!-- Visible drop placeholder: dashed slot so user sees where the item will land -->
            <div class="board-drop-slot flex items-center justify-center text-xs text-muted-foreground">
              {L.board_drop_placeholder()}
            </div>
          {:else}
            <KanbanCard {item} />
          {/if}
        </div>
      {/each}
    </div>

    {#if localItems.length === 0}
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
        {L.board_empty_column()}
      </div>
    {/if}
  </div>
</div>
