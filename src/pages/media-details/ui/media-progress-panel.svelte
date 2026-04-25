<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { untrack } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import EpisodicProgressForm from '$lib/components/media/episodic-progress-form.svelte'
  import EpisodicResponsivePanel from '$lib/components/media/episodic-responsive-panel.svelte'
  import * as Sheet from '$lib/components/ui/sheet'
  import { WATCH_STATUSES } from '$shared/config/domain'
  import { type SeasonBreakdownEntry, type SeasonGridSource, parseSeasonBreakdown } from '$shared/lib/episodic-progress'
  import { getWatchStatusLabels } from '$shared/lib/labels'

  import type { WatchStatus } from '$shared/config/domain'

  type Season = { seasonNumber: number; episodes: number }

  type UserItem = {
    id: string
    status: string | null
    currentSeason: number | null
    currentEpisode: number | null
    userSeasonBreakdown: unknown | null
    seasonStructureSource: 'CATALOG' | 'USER' | null
    list: { title: string }
  }

  type Props = {
    mediaId: string
    isEpisodic: boolean
    userItems: UserItem[]
    /** Catalog (media) grid — used by progress form and layout. */
    catalogSeasons: Season[]
  }

  const { mediaId, isEpisodic, userItems, catalogSeasons }: Props = $props()

  const watchStatusLabels = getWatchStatusLabels(L)

  type ProgressState = {
    status: WatchStatus
    currentSeason: number | null
    currentEpisode: number | null
  }

  const itemProgress = $state<Record<string, ProgressState>>(
    untrack(() =>
      Object.fromEntries(
        userItems.map((item) => [
          item.id,
          {
            status: (item.status as WatchStatus) ?? 'PLAN_TO_WATCH',
            currentSeason: item.currentSeason,
            currentEpisode: item.currentEpisode,
          } satisfies ProgressState,
        ]),
      ),
    ),
  )

  type SaveState = 'idle' | 'saving' | 'saved'
  const itemSave = $state<Record<string, SaveState>>(
    untrack(() => Object.fromEntries(userItems.map((index) => [index.id, 'idle' as const]))),
  )

  $effect(() => {
    for (const item of userItems) {
      const current = itemProgress[item.id]

      if (!current) continue

      current.status = (item.status as WatchStatus) ?? 'PLAN_TO_WATCH'
      current.currentSeason = item.currentSeason
      current.currentEpisode = item.currentEpisode
    }
    for (const item of userItems) {
      if (itemSave[item.id] == null) itemSave[item.id] = 'idle'
    }
  })

  let activeSheet = $state<{ itemId: string; mode: 'progress' | 'structure' } | null>(null)

  const openProgressSheet = (itemId: string) => {
    activeSheet = { itemId, mode: 'progress' }
  }

  const openStructureSheet = (itemId: string) => {
    activeSheet = { itemId, mode: 'structure' }
  }

  const patchItem = async (
    itemId: string,
    status: WatchStatus,
    cs: number | null,
    ce: number | null,
    userSeasonBreakdown?: SeasonBreakdownEntry[] | null,
    seasonStructureSource?: SeasonGridSource,
  ): Promise<void> => {
    itemSave[itemId] = 'saving'
    const isInProgress = status === 'IN_PROGRESS'
    const up = itemProgress[itemId]

    if (up) {
      up.status = status
      up.currentSeason = isInProgress ? cs : null
      up.currentEpisode = isInProgress ? ce : null
    }

    try {
      const body: Record<string, unknown> = {
        itemId,
        status,
        currentSeason: isInProgress && cs != null ? cs : null,
        currentEpisode: isInProgress && ce != null ? ce : null,
      }

      if (userSeasonBreakdown !== undefined) {
        body.userSeasonBreakdown = userSeasonBreakdown
      }

      if (seasonStructureSource !== undefined) {
        body.seasonStructureSource = seasonStructureSource
      }

      const response = await fetch(`/api/media/${mediaId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save progress')

      itemSave[itemId] = 'saved'
      toast.success(L.media_progress_saved())
      activeSheet = null
      await invalidateAll()
      setTimeout(() => {
        itemSave[itemId] = 'idle'
      }, 2000)
    } catch {
      itemSave[itemId] = 'idle'
      toast.error(L.common_error_generic())
    }
  }

  const onEpisodicSubmit =
    (itemId: string) =>
    (data: {
      status: WatchStatus
      currentSeason: number | null
      currentEpisode: number | null
      userSeasonBreakdown?: SeasonBreakdownEntry[] | null
      seasonStructureSource?: SeasonGridSource
    }) => {
      void patchItem(
        itemId,
        data.status,
        data.currentSeason,
        data.currentEpisode,
        data.userSeasonBreakdown,
        data.seasonStructureSource,
      )
    }

  const onMovieStatusSegment = (itemId: string, st: WatchStatus) => {
    const up = itemProgress[itemId]

    if (!up) return

    up.status = st

    if (st !== 'IN_PROGRESS') {
      up.currentSeason = null
      up.currentEpisode = null
    }
  }

  const saveMovie = (itemId: string) => {
    const st = itemProgress[itemId]

    if (!st) return

    void patchItem(itemId, st.status, st.currentSeason, st.currentEpisode)
  }
</script>

<section class="rounded-lg border bg-card p-5">
  <h2 class="mb-4 text-base font-semibold">{L.media_progress_title()}</h2>

  {#if userItems.length === 0}
    <p class="text-sm text-muted-foreground">{L.media_progress_not_in_list()}</p>
  {:else}
    <div class="space-y-5">
      {#each userItems as item (item.id)}
        {@const state = itemProgress[item.id]}
        {@const sState = itemSave[item.id] ?? 'idle'}
        {#if state}
          <div class="space-y-3">
            {#if userItems.length > 1}
              <p class="text-xs font-medium text-muted-foreground">
                {L.media_progress_list({ title: item.list.title })}
              </p>
            {/if}

            {#if isEpisodic}
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p class="min-w-0 text-sm text-muted-foreground">
                  {watchStatusLabels[
                    state.status
                  ]}{#if state.status === 'IN_PROGRESS' && state.currentSeason != null && state.currentEpisode != null}
                    <span class="ms-1 font-medium text-foreground"
                      >· {L.media_progress_watching_short({
                        s: String(state.currentSeason),
                        e: String(state.currentEpisode),
                      })}</span
                    >{/if}
                </p>
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    class="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    onclick={() => openProgressSheet(item.id)}
                  >
                    {L.media_progress_set()}
                  </button>
                  <button
                    type="button"
                    class="shrink-0 rounded-md border border-dashed px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    onclick={() => openStructureSheet(item.id)}
                  >
                    {L.media_progress_set_structure()}
                  </button>
                </div>
              </div>
            {:else}
              <div class="grid gap-1 rounded-lg border bg-muted/30 p-1" style="grid-template-columns: repeat(3, 1fr)">
                {#each WATCH_STATUSES.toReversed() as st (st)}
                  <button
                    type="button"
                    class="rounded-md py-1.5 text-center text-xs font-medium transition-all {state.status === st
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'}"
                    onclick={() => onMovieStatusSegment(item.id, st)}
                  >
                    {watchStatusLabels[st]}
                  </button>
                {/each}
              </div>
              <button
                class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                onclick={() => saveMovie(item.id)}
                disabled={sState === 'saving'}
              >
                {#if sState === 'saving'}
                  {L.media_progress_saving()}
                {:else if sState === 'saved'}
                  {L.media_progress_saved()}
                {:else}
                  {L.media_progress_save()}
                {/if}
              </button>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</section>

{#if isEpisodic && activeSheet}
  {@const sh = activeSheet}
  {@const activeItem = userItems.find((index) => index.id === sh.itemId) ?? null}
  {#if activeItem && itemProgress[activeItem.id]}
    <EpisodicResponsivePanel
      onOpenChange={(o) => {
        if (!o) activeSheet = null
      }}
    >
      <Sheet.Header class="space-y-1 px-4 pe-4 pt-1 text-left md:pe-12 md:pt-3">
        <Sheet.Title class="text-lg">
          {#if sh.mode === 'structure'}
            {L.media_structure_sheet_title()}
          {:else}
            {L.media_progress_where_stopped()}
          {/if}
        </Sheet.Title>
        {#if userItems.length > 1}
          <p class="text-sm text-muted-foreground">{L.media_progress_list({ title: activeItem.list.title })}</p>
        {/if}
      </Sheet.Header>
      <div class="px-4 pt-1 pb-6">
        {#key activeItem.id + String(activeItem.currentSeason) + String(activeItem.currentEpisode) + (itemProgress[activeItem.id]?.status ?? '') + JSON.stringify(activeItem.userSeasonBreakdown ?? null) + String(activeItem.seasonStructureSource ?? '') + sh.mode}
          <EpisodicProgressForm
            mode="title"
            pageVariant={sh.mode === 'structure' ? 'structureOnly' : 'full'}
            seasons={catalogSeasons}
            initialUserSeasonBreakdown={parseSeasonBreakdown(activeItem.userSeasonBreakdown)}
            initialSeasonStructureSource={activeItem.seasonStructureSource}
            initialStatus={itemProgress[activeItem.id]!.status}
            initialSeason={itemProgress[activeItem.id]!.currentSeason}
            initialEpisode={itemProgress[activeItem.id]!.currentEpisode}
            watchedColumnLabel={watchStatusLabels.WATCHED}
            inProgressColumnLabel={watchStatusLabels.IN_PROGRESS}
            onSubmit={onEpisodicSubmit(activeItem.id)}
            isSubmitting={(itemSave[activeItem.id] ?? 'idle') === 'saving'}
            idPrefix={`${activeItem.id}-${sh.mode}`}
          />
        {/key}
      </div>
    </EpisodicResponsivePanel>
  {/if}
{/if}
