<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { page } from '$app/state'

  import { L } from '$lib'
  import { WATCH_STATUS_META } from '$shared/config/domain'
  import { getMediaTypeMeta, getWatchStatusLabels } from '$shared/lib/labels'

  import type { PageData } from '../../../routes/$types'

  type MediaItem = {
    id: string
    status: string | null
    currentSeason?: number | null
    currentEpisode?: number | null
    rating?: number | null
    media: {
      id: string
      title: string
      year: number | null
      posterUrl: string | null
      overview: string | null
      mediaType: string
    }
  }

  type Props = { item: MediaItem }
  const { item }: Props = $props()

  const queryClient = useQueryClient()
  const listId = $derived((page.data as PageData).list?.id)

  const watchStatusLabels = getWatchStatusLabels(L)
  const statusMeta = $derived(WATCH_STATUS_META[(item.status as keyof typeof WATCH_STATUS_META) ?? 'PLAN_TO_WATCH'])
  const typeMeta = $derived(getMediaTypeMeta(item.media.mediaType))
  const isEpisodic = $derived(item.media.mediaType === 'TV' || item.media.mediaType === 'ANIME')

  let isDeleting = $state(false)

  const handleDelete = async (event_: MouseEvent) => {
    event_.preventDefault()
    event_.stopPropagation()

    if (!listId || isDeleting) return

    isDeleting = true

    try {
      const response = await fetch(`/api/lists/${listId}/items/${item.id}`, { method: 'DELETE' })

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['list-items'] })
      }
    } finally {
      isDeleting = false
    }
  }
</script>

<a
  href={`/media/${item.media.id}`}
  class="group flex items-center gap-3 rounded-lg border bg-card p-2.5 hover:bg-accent/40 transition-colors"
>
  {#if item.media.posterUrl}
    <img
      src={item.media.posterUrl}
      alt={item.media.title}
      class="h-16 w-11 shrink-0 rounded object-cover"
      loading="lazy"
    />
  {:else}
    <div class="h-16 w-11 shrink-0 rounded bg-muted"></div>
  {/if}

  <div class="min-w-0 flex-1">
    <p class="line-clamp-1 text-sm font-medium">{item.media.title}</p>
    <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
      {#if item.media.year}
        <span class="text-xs text-muted-foreground">{item.media.year}</span>
      {/if}
      <span class="rounded-full border px-2 py-0.5 text-[10px] leading-none font-semibold {typeMeta.color}">
        {typeMeta.label}
      </span>
      {#if isEpisodic && (item.currentSeason || item.currentEpisode)}
        <span class="text-xs text-muted-foreground">
          {#if item.currentSeason}{L.media_season_number({ n: item.currentSeason })}{/if}
          {#if item.currentSeason && item.currentEpisode},{/if}
          {#if item.currentEpisode}{L.media_episode_short({ n: item.currentEpisode })}{/if}
        </span>
      {/if}
    </div>
  </div>

  <div class="flex shrink-0 items-center gap-2">
    <div
      class="rounded-full p-1 text-white shadow"
      style="background-color: {statusMeta.bgColor}"
      title={item.status ? watchStatusLabels[item.status as keyof typeof watchStatusLabels] : L.status_plan_to_watch()}
    >
      {#if statusMeta.icon === 'circle-check'}
        <CircleCheckIcon class="size-3.5" />
      {:else if statusMeta.icon === 'circle-play'}
        <CirclePlayIcon class="size-3.5" />
      {:else}
        <ClockIcon class="size-3.5" />
      {/if}
    </div>

    {#if listId}
      <button
        type="button"
        class="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        title={L.home_remove_from_list()}
        onclick={handleDelete}
        disabled={isDeleting}
      >
        {#if isDeleting}
          <div class="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
        {:else}
          <Trash2Icon class="size-3.5" />
        {/if}
      </button>
    {/if}
  </div>
</a>
