<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import { createMutation } from '@tanstack/svelte-query'

  import { L } from '$lib'
  import { WATCH_STATUS_META } from '$shared/config/domain'
  import { getMediaTypeMeta, getVisibilityLabel, getWatchStatusLabels } from '$shared/lib/labels'

  import type { ListVisibility } from '$shared/config/domain'
  import type { PageData } from '../../routes/lists/[listId]/$types'

  const data = $derived(page.data as PageData)

  const watchStatusLabels = getWatchStatusLabels(L)

  const isEpisodic = (mediaType: string) => mediaType === 'TV' || mediaType === 'ANIME'
  const visibilityLabel = (value: ListVisibility) => getVisibilityLabel(L, value)

  const toggleSavedMutation = createMutation(() => ({
    mutationFn: async (variables: { method: 'DELETE' | 'POST'; tokenParameter: string }) => {
      const response = await fetch(`/api/lists/${data.list.id}/save${variables.tokenParameter}`, {
        method: variables.method,
      })

      if (!response.ok) {
        throw new Error('Failed to toggle saved list')
      }
    },
    onSuccess: async () => {
      await invalidateAll()
    },
  }))

  const toggleSaved = () => {
    const method = data.isSaved ? 'DELETE' : 'POST'
    const tokenParameter = data.token ? `?token=${encodeURIComponent(data.token)}` : ''

    toggleSavedMutation.mutate({ method, tokenParameter })
  }
</script>

<section class="space-y-4">
  <header class="rounded-lg border bg-card p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">{data.list.title}</h1>
        <p class="text-sm text-muted-foreground">{data.list.description ?? L.common_no_description()}</p>
        <p class="mt-1 text-xs text-muted-foreground">
          {L.common_owner({ name: data.list.owner.handle ?? data.list.owner.name ?? data.list.owner.email ?? '—' })}
        </p>
      </div>
      <div class="flex gap-2">
        <span class="rounded border px-2 py-1 text-xs">{visibilityLabel(data.list.visibility)}</span>
        {#if !data.isOwner}
          <button
            class="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            onclick={toggleSaved}
          >
            {data.isSaved ? L.list_unsave() : L.list_save()}
          </button>
        {/if}
      </div>
    </div>
  </header>

  <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
    {#each data.items as item (item.id)}
      {@const statusMeta = WATCH_STATUS_META[(item.status as keyof typeof WATCH_STATUS_META) ?? 'PLAN_TO_WATCH']}
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
              {getMediaTypeMeta(item.media.mediaType).label}
            </span>
          </div>
          {#if isEpisodic(item.media.mediaType) && (item.currentSeason || item.currentEpisode)}
            <p class="mt-1 text-xs text-white/70">
              {#if item.currentSeason}{L.media_season_number({ n: item.currentSeason })}{/if}
              {#if item.currentSeason && item.currentEpisode},
              {/if}
              {#if item.currentEpisode}{L.media_episode_short({ n: item.currentEpisode })}{/if}
            </p>
          {/if}
        </div>

        <div class="p-3 transition-opacity duration-200 group-hover:opacity-0">
          <h2 class="line-clamp-1 text-sm font-medium">{item.media.title}</h2>
          <div class="mt-1 flex flex-wrap items-center gap-1.5">
            {#if item.media.year}
              <span class="text-xs text-muted-foreground">{item.media.year}</span>
            {/if}
            <span
              class="rounded-full border px-2 py-0.5 text-[10px] leading-none font-semibold {getMediaTypeMeta(
                item.media.mediaType,
              ).color}"
            >
              {getMediaTypeMeta(item.media.mediaType).label}
            </span>
          </div>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {item.status ? watchStatusLabels[item.status as keyof typeof watchStatusLabels] : L.status_plan_to_watch()}
          </p>
        </div>
      </a>
    {/each}
  </div>
</section>
