<script lang="ts">
  import { untrack } from 'svelte'

  import { L } from '$lib'

  import type { KanbanItem } from '../board.types'

  type Action = 'complete' | 'update-episode'

  type Props = {
    item: KanbanItem
    onConfirm: (action: Action, episode?: number) => void
    onCancel: () => void
  }

  const { item, onConfirm, onCancel }: Props = $props()

  let selectedAction = $state<Action>('complete')
  let episodeInput = $state(untrack(() => item.currentEpisode ?? 1))
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
    <p class="mt-1 text-sm text-muted-foreground">
      <span class="font-medium text-foreground">{item.media.title}</span>
      &mdash;
      {L.board_watched_dialog_description()}
    </p>

    <div class="mt-4 space-y-2">
      <label
        class="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
      >
        <input
          type="radio"
          name="watched-action"
          value="complete"
          bind:group={selectedAction}
          class="mt-0.5 accent-primary"
        />
        <span class="text-sm">{L.board_watched_mark_complete()}</span>
      </label>

      <label
        class="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
      >
        <input
          type="radio"
          name="watched-action"
          value="update-episode"
          bind:group={selectedAction}
          class="mt-0.5 accent-primary"
        />
        <div class="min-w-0 flex-1">
          <span class="text-sm">{L.board_watched_update_episode()}</span>
          {#if selectedAction === 'update-episode'}
            <div class="mt-2 flex items-center gap-2">
              <label for="episode-input" class="shrink-0 text-xs text-muted-foreground">
                {L.board_watched_episode_label()}
              </label>
              <input
                id="episode-input"
                type="number"
                min="1"
                bind:value={episodeInput}
                class="w-20 rounded-md border bg-background px-2 py-1 text-sm"
              />
            </div>
          {/if}
        </div>
      </label>
    </div>

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
        onclick={() => onConfirm(selectedAction, selectedAction === 'update-episode' ? episodeInput : undefined)}
      >
        {L.common_apply()}
      </button>
    </div>
  </div>
</div>
