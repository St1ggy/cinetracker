<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'

  import { L } from '$lib'
  import { WATCH_STATUS_META } from '$shared/config/domain'
  import { stripHtml } from '$shared/lib/html'
  import { getMediaTypeMeta, getWatchStatusLabels } from '$shared/lib/labels'

  type MediaItem = {
    status: string | null
    currentSeason?: number | null
    currentEpisode?: number | null
    media: {
      id: string
      title: string
      year: number | null
      posterUrl: string | null
      overview: string | null
      mediaType: string
    }
  }

  type Props = {
    item: MediaItem
    showStatusLabel?: boolean
  }

  const { item, showStatusLabel = false }: Props = $props()

  const watchStatusLabels = getWatchStatusLabels(L)
  const statusMeta = $derived(WATCH_STATUS_META[(item.status as keyof typeof WATCH_STATUS_META) ?? 'PLAN_TO_WATCH'])
  const typeMeta = $derived(getMediaTypeMeta(item.media.mediaType))

  const isEpisodic = $derived(item.media.mediaType === 'TV' || item.media.mediaType === 'ANIME')
  const hasProgress = $derived(!!item.currentSeason || !!item.currentEpisode)
</script>

<a href={`/media/${item.media.id}`} class="group relative block overflow-hidden rounded-lg border bg-card">
  {#if item.media.posterUrl}
    <img
      src={item.media.posterUrl}
      alt={item.media.title}
      class="aspect-2/3 w-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
  {:else}
    <div class="aspect-2/3 w-full bg-muted"></div>
  {/if}

  <div
    class="absolute top-2 right-2 rounded-full p-1 text-white shadow"
    style="background-color: {statusMeta.bgColor}"
    title={item.status ?? 'PLAN_TO_WATCH'}
  >
    {#if statusMeta.icon === 'circle-check'}
      <CircleCheckIcon class="size-4" />
    {:else if statusMeta.icon === 'circle-play'}
      <CirclePlayIcon class="size-4" />
    {:else}
      <ClockIcon class="size-4" />
    {/if}
  </div>

  <div
    class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/70 to-transparent p-3 pt-8 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
  >
    <h2 class="line-clamp-1 text-sm font-semibold">{item.media.title}</h2>
    <div class="mt-1 flex flex-wrap items-center gap-1.5">
      {#if item.media.year}
        <span class="text-xs text-white/70">{item.media.year}</span>
      {/if}
      <span
        class="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] leading-none font-semibold text-white"
      >
        {typeMeta.label}
      </span>
    </div>
    {#if isEpisodic && hasProgress}
      <p class="mt-1 text-xs text-white/70">
        {#if item.currentSeason}{L.media_season_number({ n: item.currentSeason })}{/if}
        {#if item.currentSeason && item.currentEpisode},{/if}
        {#if item.currentEpisode}{L.media_episode_short({ n: item.currentEpisode })}{/if}
      </p>
    {:else if item.media.overview}
      <p class="mt-1.5 line-clamp-3 text-xs text-white/80">{stripHtml(item.media.overview)}</p>
    {/if}
  </div>

  <div class="p-3 transition-opacity duration-200 group-hover:opacity-0">
    <h2 class="line-clamp-1 text-sm font-medium">{item.media.title}</h2>
    <div class="mt-1 flex flex-wrap items-center gap-1.5">
      {#if item.media.year}
        <span class="text-xs text-muted-foreground">{item.media.year}</span>
      {/if}
      <span class="rounded-full border px-2 py-0.5 text-[10px] leading-none font-semibold {typeMeta.color}">
        {typeMeta.label}
      </span>
    </div>
    {#if showStatusLabel}
      <p class="mt-0.5 text-xs text-muted-foreground">
        {item.status ? watchStatusLabels[item.status as keyof typeof watchStatusLabels] : L.status_plan_to_watch()}
      </p>
    {/if}
  </div>
</a>
