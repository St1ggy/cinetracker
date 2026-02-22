<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
  import CirclePlayIcon from '@lucide/svelte/icons/circle-play'
  import ClockIcon from '@lucide/svelte/icons/clock'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import SearchIcon from '@lucide/svelte/icons/search'
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { WATCH_STATUSES, WATCH_STATUS_META } from '$shared/config/domain'
  import { stripHtml } from '$shared/lib/html'
  import { getMediaTypeMeta, getWatchStatusLabels } from '$shared/lib/labels'

  import type { MediaProvider, WatchStatus } from '$shared/config/domain'
  import type { HomeSearchResult } from './home.types'
  import type { PageData } from '../../routes/$types'

  const data: PageData = page.data as PageData
  const watchStatusLabels = getWatchStatusLabels(L)

  let query = $state(data.filters?.q ?? '')
  let yearFrom = $state(data.filters?.yearFrom?.toString() ?? '')
  let yearTo = $state(data.filters?.yearTo?.toString() ?? '')
  let genre = $state(data.filters?.genre ?? '')
  let status = $state<WatchStatus | ''>(data.filters?.status ?? '')
  let showAddModal = $state(false)
  let searchInput = $state('')
  let debouncedSearchInput = $state('')
  let chosenListId = $state(data.list?.id ?? '')
  const queryClient = useQueryClient()

  const applyFilters = async () => {
    const queryPart = query.trim() ? `q=${encodeURIComponent(query.trim())}` : ''
    const genrePart = genre ? `genre=${encodeURIComponent(genre)}` : ''
    const statusPart = status ? `status=${encodeURIComponent(status)}` : ''
    const yearPart =
      yearFrom && yearTo ? `yearFrom=${encodeURIComponent(yearFrom)}&yearTo=${encodeURIComponent(yearTo)}` : ''
    const next = [queryPart, genrePart, statusPart, yearPart].filter(Boolean).join('&')

    await goto(next ? `/?${next}` : '/')
  }

  const searchQuery = createQuery(() => ({
    queryKey: ['external-search', debouncedSearchInput],
    enabled: debouncedSearchInput.trim().length > 0,
    queryFn: async () => {
      const response = await fetch(`/api/external/search?query=${encodeURIComponent(debouncedSearchInput)}`)

      if (!response.ok) {
        throw new Error('External search failed')
      }

      const payload = (await response.json()) as { results: HomeSearchResult[] }

      return payload.results
    },
  }))

  const addProductMutation = createMutation(() => ({
    mutationFn: async (payload: { provider: MediaProvider; externalId: string }) => {
      const response = await fetch(`/api/lists/${chosenListId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to add product')
      }
    },
    onSuccess: async () => {
      showAddModal = false
      searchInput = ''
      debouncedSearchInput = ''
      await queryClient.invalidateQueries({ queryKey: ['external-search'] })
      await invalidateAll()
    },
  }))

  let searchTimeout: ReturnType<typeof setTimeout> | undefined
  const searchExternal = (input: string) => {
    clearTimeout(searchTimeout)
    searchInput = input

    if (!input.trim()) {
      debouncedSearchInput = ''

      return
    }

    searchTimeout = setTimeout(() => {
      debouncedSearchInput = input.trim()
    }, 300)
  }

  const addProduct = async (provider: MediaProvider, externalId: string) => {
    if (!chosenListId) return

    addProductMutation.mutate({ provider, externalId })
  }
</script>

{#if !data.authenticated}
  <section class="rounded-lg border bg-card p-8 text-center">
    <h1 class="text-2xl font-semibold">{L.app_name()}</h1>
    <p class="mt-2 text-muted-foreground">{L.home_guest_description()}</p>
    <a href="/signin" class="mt-4 inline-block rounded-md border px-4 py-2 text-sm font-medium">{L.common_sign_in()}</a>
  </section>
{:else}
  <section class="space-y-4">
    <div class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      <div class="relative min-w-[220px] flex-1">
        <SearchIcon class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <input
          class="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm"
          placeholder={L.home_search_title_placeholder()}
          bind:value={query}
        />
      </div>
      <input
        class="w-28 rounded-md border bg-background px-3 py-2 text-sm"
        placeholder={L.home_year_from_placeholder()}
        bind:value={yearFrom}
      />
      <input
        class="w-28 rounded-md border bg-background px-3 py-2 text-sm"
        placeholder={L.home_year_to_placeholder()}
        bind:value={yearTo}
      />
      <Select.Root type="single" value={genre || '__all__'} onValueChange={(v) => (genre = v === '__all__' ? '' : v)}>
        <Select.Trigger class="h-9 min-w-[130px] text-sm">
          {genre ? (data.genres?.find((g) => g.slug === genre)?.name ?? genre) : L.home_all_genres()}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="__all__" label={L.home_all_genres()} />
          {#each data.genres ?? [] as g (g.id)}
            <Select.Item value={g.slug} label={g.name} />
          {/each}
        </Select.Content>
      </Select.Root>
      <Select.Root
        type="single"
        value={status || '__all__'}
        onValueChange={(v) => (status = v === '__all__' ? '' : (v as WatchStatus))}
      >
        <Select.Trigger class="h-9 min-w-[140px] text-sm">
          {status ? watchStatusLabels[status] : L.home_all_statuses()}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="__all__" label={L.home_all_statuses()} />
          {#each WATCH_STATUSES as st (st)}
            <Select.Item value={st} label={watchStatusLabels[st]} />
          {/each}
        </Select.Content>
      </Select.Root>
      <button
        class="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        onclick={applyFilters}>{L.common_apply()}</button
      >
      <button
        class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        onclick={() => (showAddModal = true)}
      >
        <PlusIcon class="size-4" />
        {L.home_add_product()}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {#each data.items as item (item.id)}
        {@const statusMeta = WATCH_STATUS_META[item.status ?? 'PLAN_TO_WATCH']}
        <a href={`/media/${item.media.id}`} class="group relative block overflow-hidden rounded-lg border bg-card">
          {#if item.media.posterUrl}
            <img
              src={item.media.posterUrl}
              alt={item.media.title}
              class="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          {:else}
            <div class="aspect-[2/3] w-full bg-muted"></div>
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
            class="absolute inset-x-0 bottom-0 translate-y-0 bg-linear-to-t from-black/90 via-black/70 to-transparent p-3 pt-8 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
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
            {#if item.media.overview}
              <p class="mt-1.5 line-clamp-3 text-xs text-white/80">
                {stripHtml(item.media.overview)}
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
          </div>
        </a>
      {/each}
    </div>
  </section>
{/if}

{#if showAddModal}
  <div class="fixed inset-0 z-50 p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/60"
      aria-label={L.home_close_modal_aria()}
      onclick={() => (showAddModal = false)}
    ></button>
    <div
      class="relative mx-auto mt-10 max-w-2xl rounded-lg border bg-card p-4"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <h3 class="text-lg font-semibold">{L.home_add_product_title()}</h3>
      <p class="text-sm text-muted-foreground">{L.home_add_product_description()}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <input
          class="min-w-[260px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder={L.home_add_product_placeholder()}
          bind:value={searchInput}
          oninput={(event_) => searchExternal((event_.currentTarget as HTMLInputElement).value)}
        />
        <Select.Root type="single" value={chosenListId} onValueChange={(v) => (chosenListId = v)}>
          <Select.Trigger class="h-9 text-sm">
            {data.list?.title ?? '—'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={data.list?.id ?? ''} label={data.list?.title ?? '—'} />
          </Select.Content>
        </Select.Root>
      </div>

      {#if searchQuery.isFetching}
        <p class="mt-3 text-sm text-muted-foreground">{L.common_searching()}</p>
      {/if}

      <div class="mt-3 max-h-96 space-y-2 overflow-y-auto">
        {#each searchQuery.data ?? [] as result (`${result.provider}:${result.externalId}`)}
          <div class="flex items-center gap-3 rounded-md border p-2">
            {#if result.posterUrl}
              <img src={result.posterUrl} alt={result.title} class="h-16 w-12 shrink-0 rounded object-cover" />
            {:else}
              <div class="h-16 w-12 shrink-0 rounded bg-muted"></div>
            {/if}
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium">{result.title}</div>
              <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span class="text-xs text-muted-foreground">
                  {result.provider}{result.year ? ` · ${result.year}` : ''}
                </span>
                <span
                  class="rounded-full border px-2 py-0.5 text-[10px] leading-none font-semibold {getMediaTypeMeta(
                    result.mediaType,
                  ).color}"
                >
                  {getMediaTypeMeta(result.mediaType).label}
                </span>
              </div>
              <p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {result.overview ? stripHtml(result.overview) : L.common_no_overview()}
              </p>
            </div>
            <button
              class="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              title={L.home_add_product()}
              disabled={addProductMutation.isPending}
              onclick={() => addProduct(result.provider, result.externalId)}
            >
              <PlusIcon class="size-4" />
            </button>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
