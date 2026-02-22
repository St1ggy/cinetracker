<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { untrack } from 'svelte'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { WATCH_STATUSES } from '$shared/config/domain'
  import { getWatchStatusLabels } from '$shared/lib/labels'

  import type { WatchStatus } from '$shared/config/domain'

  type Season = { seasonNumber: number; episodes: number }

  type UserItem = {
    id: string
    status: string | null
    currentSeason: number | null
    currentEpisode: number | null
    list: { title: string }
  }

  type Props = {
    mediaId: string
    isEpisodic: boolean
    userItems: UserItem[]
    seasons: Season[]
  }

  const { mediaId, isEpisodic, userItems, seasons }: Props = $props()

  const watchStatusLabels = getWatchStatusLabels(L)

  type ProgressState = {
    status: WatchStatus
    currentSeason: number | ''
    currentEpisode: number | ''
    saveState: 'idle' | 'saving' | 'saved'
  }

  const progressState = $state<Record<string, ProgressState>>(
    untrack(() =>
      Object.fromEntries(
        userItems.map((item) => [
          item.id,
          {
            status: (item.status as WatchStatus) ?? 'PLAN_TO_WATCH',
            currentSeason: item.currentSeason ?? '',
            currentEpisode: item.currentEpisode ?? '',
            saveState: 'idle' as const,
          },
        ]),
      ),
    ),
  )

  const episodesInSeason = (seasonNumber: number | '') => {
    if (!seasonNumber) return null

    return seasons.find((s) => s.seasonNumber === Number(seasonNumber))?.episodes ?? null
  }

  const saveProgress = async (itemId: string) => {
    const state = progressState[itemId]

    if (!state) return

    state.saveState = 'saving'

    try {
      const response = await fetch(`/api/media/${mediaId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          status: state.status,
          currentSeason: state.currentSeason === '' ? null : Number(state.currentSeason),
          currentEpisode: state.currentEpisode === '' ? null : Number(state.currentEpisode),
        }),
      })

      if (!response.ok) throw new Error('Failed to save progress')

      state.saveState = 'saved'
      await invalidateAll()
      setTimeout(() => {
        state.saveState = 'idle'
      }, 2000)
    } catch {
      state.saveState = 'idle'
    }
  }
</script>

<section class="rounded-xl border bg-card p-4">
  <h2 class="mb-4 text-sm font-semibold">{L.media_progress_title()}</h2>

  {#if userItems.length === 0}
    <p class="text-sm text-muted-foreground">{L.media_progress_not_in_list()}</p>
  {:else}
    <div class="space-y-5">
      {#each userItems as item (item.id)}
        {@const state = progressState[item.id]}
        {#if state}
          <div class="space-y-3">
            {#if userItems.length > 1}
              <p class="text-xs font-medium text-muted-foreground">
                {L.media_progress_list({ title: item.list.title })}
              </p>
            {/if}

            <div class="flex flex-wrap gap-3">
              <div class="min-w-[160px] flex-1">
                <p class="mb-1 text-xs font-medium text-muted-foreground">{L.media_progress_status()}</p>
                <Select.Root
                  type="single"
                  value={state.status}
                  onValueChange={(v) => (state.status = v as WatchStatus)}
                >
                  <Select.Trigger class="h-9 w-full text-sm">
                    {watchStatusLabels[state.status]}
                  </Select.Trigger>
                  <Select.Content>
                    {#each WATCH_STATUSES as st (st)}
                      <Select.Item value={st} label={watchStatusLabels[st]} />
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              {#if isEpisodic}
                {#if seasons.length > 0}
                  <div class="w-28">
                    <p class="mb-1 text-xs font-medium text-muted-foreground">{L.media_progress_season()}</p>
                    <Select.Root
                      type="single"
                      value={state.currentSeason === '' ? '__none__' : String(state.currentSeason)}
                      onValueChange={(v) => {
                        state.currentSeason = v === '__none__' ? '' : Number(v)
                        state.currentEpisode = ''
                      }}
                    >
                      <Select.Trigger class="h-9 w-full text-sm">
                        {state.currentSeason === '' ? '—' : state.currentSeason}
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="__none__" label="—" />
                        {#each seasons as season (season.seasonNumber)}
                          <Select.Item value={String(season.seasonNumber)} label={String(season.seasonNumber)} />
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  </div>
                {/if}

                <div class="w-28">
                  <label for="episode-{item.id}" class="mb-1 block text-xs font-medium text-muted-foreground">
                    {L.media_progress_episode()}
                    {#if episodesInSeason(state.currentSeason)}
                      <span class="text-muted-foreground/60">/ {episodesInSeason(state.currentSeason)}</span>
                    {/if}
                  </label>
                  <input
                    id="episode-{item.id}"
                    type="number"
                    min="1"
                    max={episodesInSeason(state.currentSeason) ?? undefined}
                    class="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    bind:value={state.currentEpisode}
                  />
                </div>
              {/if}
            </div>

            <button
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              onclick={() => saveProgress(item.id)}
              disabled={state.saveState === 'saving'}
            >
              {#if state.saveState === 'saving'}
                {L.media_progress_saving()}
              {:else if state.saveState === 'saved'}
                {L.media_progress_saved()}
              {:else}
                {L.media_progress_save()}
              {/if}
            </button>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</section>
