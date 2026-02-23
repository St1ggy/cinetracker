<script lang="ts">
  import { untrack } from 'svelte'

  import { L } from '$lib'
  import { getWatchStatusLabels } from '$shared/lib/labels'

  import type { KanbanItem } from '../board.types'

  type Status = 'WATCHED' | 'IN_PROGRESS'

  type Props = {
    item: KanbanItem
    onConfirm: (status: Status, season?: number, episode?: number) => void
    onCancel: () => void
  }

  const { item, onConfirm, onCancel }: Props = $props()

  const watchStatusLabels = getWatchStatusLabels(L)
  const statuses: Status[] = ['WATCHED', 'IN_PROGRESS']

  let selectedStatus = $state<Status>('WATCHED')
  let seasonInput = $state<number | ''>(untrack(() => item.currentSeason ?? ''))
  let episodeInput = $state<number | ''>(untrack(() => item.currentEpisode ?? ''))

  const isEpisodic = $derived(item.media.mediaType === 'TV' || item.media.mediaType === 'ANIME')

  const handleConfirm = () => {
    if (selectedStatus === 'WATCHED') {
      onConfirm('WATCHED')
    } else {
      onConfirm(
        'IN_PROGRESS',
        seasonInput === '' ? undefined : Number(seasonInput),
        episodeInput === '' ? undefined : Number(episodeInput),
      )
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <button type="button" class="absolute inset-0 bg-black/60" aria-label={L.board_watched_cancel()} onclick={onCancel}
  ></button>

  <div
    class="relative w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
    role="dialog"
    aria-modal="true"
    aria-labelledby="watched-dialog-title"
  >
    <h3 id="watched-dialog-title" class="text-base font-semibold">
      {L.board_watched_dialog_title()}
    </h3>
    <p class="mt-1 text-sm font-medium">{item.media.title}</p>

    <!-- Segmented control: Watched / In Progress -->
    <div class="mt-4 grid grid-cols-2 gap-1 rounded-lg border bg-muted/30 p-1">
      {#each statuses as st (st)}
        <button
          type="button"
          class="rounded-md py-2 text-center text-sm font-medium transition-all {selectedStatus === st
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            selectedStatus = st
          }}
        >
          {watchStatusLabels[st]}
        </button>
      {/each}
    </div>

    <!-- Season + episode — only when In Progress and episodic -->
    {#if selectedStatus === 'IN_PROGRESS' && isEpisodic}
      <div class="mt-4 flex gap-3">
        <div class="flex-1">
          <label for="dialog-season" class="mb-1 block text-xs font-medium text-muted-foreground">
            {L.media_progress_season()}
          </label>
          <input
            id="dialog-season"
            type="number"
            min="1"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            bind:value={seasonInput}
          />
        </div>
        <div class="flex-1">
          <label for="dialog-episode" class="mb-1 block text-xs font-medium text-muted-foreground">
            {L.media_progress_episode()}
          </label>
          <input
            id="dialog-episode"
            type="number"
            min="1"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            bind:value={episodeInput}
          />
        </div>
      </div>
    {/if}

    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        onclick={onCancel}
      >
        {L.board_watched_cancel()}
      </button>
      <button
        type="button"
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        onclick={handleConfirm}
      >
        {L.common_apply()}
      </button>
    </div>
  </div>
</div>
