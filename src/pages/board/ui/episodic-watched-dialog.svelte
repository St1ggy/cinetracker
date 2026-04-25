<script lang="ts">
  import { L } from '$lib'
  import EpisodicProgressForm from '$lib/components/media/episodic-progress-form.svelte'
  import EpisodicResponsivePanel from '$lib/components/media/episodic-responsive-panel.svelte'
  import * as Sheet from '$lib/components/ui/sheet'
  import { displaySeasonGrid, parseSeasonBreakdown } from '$shared/lib/episodic-progress'
  import { getWatchStatusLabels } from '$shared/lib/labels'
  import { getMediaTitlePair } from '$shared/lib/media-title'

  import type { WatchStatus } from '$shared/config/domain'
  import type { KanbanItem } from '../board.types'

  type Status = 'WATCHED' | 'IN_PROGRESS'

  type Props = {
    item: KanbanItem
    onConfirm: (status: Status, season?: number, episode?: number) => void
    onCancel: () => void
  }

  const { item, onConfirm, onCancel }: Props = $props()

  const watchStatusLabels = getWatchStatusLabels(L)
  const displayTitle = $derived(
    getMediaTitlePair({ title: item.media.title, originalTitle: item.media.originalTitle }).primary,
  )

  const catalogRows = $derived(parseSeasonBreakdown(item.media.seasonBreakdown) ?? null)
  const userRows = $derived(parseSeasonBreakdown(item.userSeasonBreakdown) ?? null)
  const seasonGridSource = $derived(item.seasonStructureSource == null ? 'AUTO' : item.seasonStructureSource)
  const seasons = $derived(displaySeasonGrid(catalogRows, userRows, seasonGridSource))

  const structureLength = $derived(seasons.length)

  const onForm = (data: { status: WatchStatus; currentSeason: number | null; currentEpisode: number | null }) => {
    if (data.status === 'WATCHED') {
      onConfirm('WATCHED')
    } else {
      onConfirm(
        'IN_PROGRESS',
        data.currentSeason === null ? undefined : data.currentSeason,
        data.currentEpisode === null ? undefined : data.currentEpisode,
      )
    }
  }

  const initialWatchStatus = $derived((item.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'WATCHED') satisfies WatchStatus)
</script>

<EpisodicResponsivePanel
  onOpenChange={(o) => {
    if (!o) onCancel()
  }}
>
  <Sheet.Header class="space-y-1 px-4 pe-4 pt-1 text-left md:pe-12 md:pt-3">
    <Sheet.Title class="text-lg">{L.board_watched_dialog_title()}</Sheet.Title>
    <p class="text-sm font-medium">{displayTitle}</p>
  </Sheet.Header>
  <div class="px-4 pt-1 pb-6">
    {#key item.id + String(item.currentSeason) + String(item.currentEpisode) + String(structureLength)}
      <EpisodicProgressForm
        mode="kanban-watched"
        {seasons}
        initialStatus={initialWatchStatus}
        initialSeason={item.currentSeason ?? null}
        initialEpisode={item.currentEpisode ?? null}
        watchedColumnLabel={watchStatusLabels.WATCHED}
        inProgressColumnLabel={watchStatusLabels.IN_PROGRESS}
        onSubmit={onForm}
        isSubmitting={false}
        idPrefix="kanban-{item.id}"
      />
    {/key}
  </div>
</EpisodicResponsivePanel>
