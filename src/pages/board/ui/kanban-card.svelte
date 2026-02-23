<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'

  import { L } from '$lib'
  import { WATCH_STATUS_META } from '$shared/config/domain'
  import { getMediaTypeMeta } from '$shared/lib/labels'

  import type { KanbanItem } from '../board.types'

  type Props = {
    item: KanbanItem
    ghost?: boolean
  }

  const { item, ghost = false }: Props = $props()

  const statusMeta = $derived(WATCH_STATUS_META[(item.status as keyof typeof WATCH_STATUS_META) ?? 'PLAN_TO_WATCH'])
  const typeMeta = $derived(getMediaTypeMeta(item.media.mediaType))
  const isEpisodic = $derived(item.media.mediaType === 'TV' || item.media.mediaType === 'ANIME')
  const hasProgress = $derived(!!item.currentSeason || !!item.currentEpisode)

  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes <= 0) return ''

    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60

    if (h === 0) return `${m}m`

    if (m === 0) return `${h}h`

    return `${h}h ${m}m`
  }

  const remainingDuration = $derived(
    (() => {
      const { media, currentEpisode } = item

      if (isEpisodic) {
        const avgRuntime =
          media.episodeRuntimeMin != null && media.episodeRuntimeMax != null
            ? Math.round((media.episodeRuntimeMin + media.episodeRuntimeMax) / 2)
            : (media.episodeRuntimeMin ?? media.episodeRuntimeMax ?? 0)
        const watched = currentEpisode ?? 0
        const remaining = Math.max(0, (media.episodesCount ?? 0) - watched)

        return formatDuration(remaining * avgRuntime)
      }

      return formatDuration(media.runtimeMinutes ?? 0)
    })(),
  )
</script>

<a
  href={`/media/${item.media.id}`}
  class={`flex gap-3 rounded-lg border bg-card p-2 shadow-sm transition-shadow hover:shadow-md ${ghost ? 'border-dashed opacity-60' : ''}`}
  draggable={ghost ? 'false' : undefined}
  onclick={ghost ? (event_) => event_.preventDefault() : undefined}
  tabindex={ghost ? -1 : 0}
>
  <div class="shrink-0">
    {#if item.media.posterUrl}
      <img src={item.media.posterUrl} alt={item.media.title} class="h-16 w-11 rounded object-cover" loading="lazy" />
    {:else}
      <div class="flex h-16 w-11 items-center justify-center rounded bg-muted">
        <span class="text-lg text-muted-foreground/30">?</span>
      </div>
    {/if}
  </div>

  <div class="min-w-0 flex-1">
    <div class="flex items-start justify-between gap-1">
      <h3 class="line-clamp-2 text-sm leading-snug font-medium">{item.media.title}</h3>
      {#if ghost}
        <span
          class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style="background-color: {WATCH_STATUS_META.IN_PROGRESS.bgColor}"
        >
          {L.board_ghost_label()}
        </span>
      {:else}
        <div
          class="shrink-0 rounded-full p-0.5 text-white"
          style="background-color: {statusMeta.bgColor}"
          title={item.status ?? 'PLAN_TO_WATCH'}
        >
          {#if statusMeta.icon === 'circle-check'}
            <CircleCheckIcon class="size-3" />
          {:else if statusMeta.icon === 'circle-play'}
            <CirclePlayIcon class="size-3" />
          {:else}
            <ClockIcon class="size-3" />
          {/if}
        </div>
      {/if}
    </div>

    <div class="mt-1 flex flex-wrap items-center gap-1">
      {#if item.media.year}
        <span class="text-xs text-muted-foreground">{item.media.year}</span>
      {/if}
      <span class="rounded-full border px-1.5 py-px text-[10px] leading-none font-semibold {typeMeta.color}">
        {typeMeta.label}
      </span>
    </div>

    {#if isEpisodic && hasProgress}
      <p class="mt-1 text-xs text-muted-foreground">
        {#if item.currentSeason}{L.media_season_number({
            n: item.currentSeason,
          })}{/if}{#if item.currentSeason && item.currentEpisode},{/if}{#if item.currentEpisode}
          {L.media_episode_short({ n: item.currentEpisode })}{/if}
      </p>
    {/if}

    {#if remainingDuration}
      <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground/80">
        <ClockIcon class="size-3 shrink-0" />
        {remainingDuration}
      </p>
    {/if}
  </div>
</a>
