<script lang="ts">
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { untrack } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { stripHtml } from '$shared/lib/html'
  import { getMediaTypeMeta } from '$shared/lib/labels'
  import { scrollFade } from '$shared/lib/scroll-fade'

  import type { MediaProvider } from '$shared/config/domain'
  import type { HomeSearchResult } from '../home.types'

  type ListOption = { id: string; title: string }

  type Props = {
    listId: string
    listTitle: string
    onclose: () => void
    onAdded: () => void
  }

  const { listId, listTitle, onclose, onAdded }: Props = $props()

  const queryClient = useQueryClient()

  let searchInput = $state('')
  let debouncedSearchInput = $state('')
  let chosenListId = $state(untrack(() => listId))

  const listsQuery = createQuery(() => ({
    queryKey: ['user-lists'],
    queryFn: async () => {
      const response = await fetch('/api/lists')

      if (!response.ok) throw new Error('Failed to load lists')

      return response.json() as Promise<{ ownedLists: ListOption[]; savedLists: ListOption[] }>
    },
  }))

  const allLists = $derived<ListOption[]>([
    ...(listsQuery.data?.ownedLists ?? []),
    ...(listsQuery.data?.savedLists ?? []),
  ])

  const chosenListTitle = $derived(allLists.find((l) => l.id === chosenListId)?.title ?? listTitle)

  let searchTimeout: ReturnType<typeof setTimeout> | undefined

  const onSearchInput = (value: string) => {
    clearTimeout(searchTimeout)
    searchInput = value

    if (!value.trim()) {
      debouncedSearchInput = ''

      return
    }

    searchTimeout = setTimeout(() => {
      debouncedSearchInput = value.trim()
    }, 300)
  }

  const searchQuery = createQuery(() => ({
    queryKey: ['external-search', debouncedSearchInput],
    enabled: debouncedSearchInput.trim().length > 0,
    queryFn: async () => {
      const response = await fetch(`/api/external/search?query=${encodeURIComponent(debouncedSearchInput)}`)

      if (!response.ok) throw new Error('External search failed')

      const payload = (await response.json()) as { results: HomeSearchResult[] }

      return payload.results
    },
  }))

  const addMutation = createMutation(() => ({
    mutationFn: async (payload: { provider: MediaProvider; externalId: string }) => {
      const response = await fetch(`/api/lists/${chosenListId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to add product')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['external-search'] })
      await queryClient.invalidateQueries({ queryKey: ['list-items'] })
      toast.success(L.home_added_success())
      onAdded()
      onclose()
    },
    onError: () => {
      toast.error(L.common_error_generic())
    },
  }))

  let pendingItemKey = $state<string | null>(null)

  const addProduct = async (provider: MediaProvider, externalId: string) => {
    if (!chosenListId || pendingItemKey) return

    const key = `${provider}:${externalId}`

    pendingItemKey = key
    try {
      await addMutation.mutateAsync({ provider, externalId })
    } finally {
      pendingItemKey = null
    }
  }
</script>

<div class="fixed inset-0 z-50 p-4">
  <button type="button" class="absolute inset-0 bg-black/60" aria-label={L.home_close_modal_aria()} onclick={onclose}
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
        value={searchInput}
        oninput={(event_) => onSearchInput((event_.currentTarget as HTMLInputElement).value)}
      />
      <Select.Root type="single" value={chosenListId} onValueChange={(v) => (chosenListId = v)}>
        <Select.Trigger class="h-9 max-w-48 text-sm">{chosenListTitle}</Select.Trigger>
        <Select.Content>
          {#each allLists as list (list.id)}
            <Select.Item value={list.id} label={list.title} />
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    {#if searchQuery.isFetching}
      <p class="mt-3 text-sm text-muted-foreground">{L.common_searching()}</p>
    {/if}

    <div class="relative mt-3">
      <div class="scroll-fade max-h-96 space-y-2 overflow-y-auto" use:scrollFade>
        {#each searchQuery.data ?? [] as result (`${result.provider}:${result.externalId}`)}
          {@const itemKey = `${result.provider}:${result.externalId}`}
          {@const isThisPending = pendingItemKey === itemKey}
          {@const typeMeta = getMediaTypeMeta(result.mediaType)}
          <div class="flex items-stretch overflow-hidden rounded-md border">
            {#if result.posterUrl}
              <img src={result.posterUrl} alt={result.title} class="h-20 w-14 shrink-0 object-cover" />
            {:else}
              <div class="h-20 w-14 shrink-0 bg-muted"></div>
            {/if}
            <div class="min-w-0 flex-1 px-3 py-2">
              <div class="text-sm leading-snug font-medium">{result.title}</div>
              <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span class="text-xs text-muted-foreground">
                  {result.provider}{result.year ? ` · ${result.year}` : ''}
                </span>
                <span class="rounded-full border px-2 py-0.5 text-[10px] leading-none font-semibold {typeMeta.color}">
                  {typeMeta.label}
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {result.overview ? stripHtml(result.overview) : L.common_no_overview()}
              </p>
            </div>
            <button
              class="flex w-12 shrink-0 items-center justify-center border-l bg-primary/5 text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
              title={L.home_add_product()}
              disabled={!!pendingItemKey}
              onclick={() => addProduct(result.provider, result.externalId)}
            >
              {#if isThisPending}
                <LoaderCircleIcon class="size-5 animate-spin" />
              {:else}
                <PlusIcon class="size-5" />
              {/if}
            </button>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
