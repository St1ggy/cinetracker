<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import BookmarkIcon from '@lucide/svelte/icons/bookmark'
  import CompassIcon from '@lucide/svelte/icons/compass'
  import FolderOpenIcon from '@lucide/svelte/icons/folder-open'
  import { createMutation } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import { getVisibilityLabel } from '$shared/lib/labels'
  import HandleRequiredModal from '$shared/ui/handle-required-modal.svelte'

  import CreateListForm from './ui/create-list-form.svelte'
  import ExploreTabContent from './ui/explore-tab-content.svelte'

  import type { ListVisibility } from '$shared/config/domain'
  import type { PageData } from '../../routes/lists/$types'

  const data = $derived(page.data as PageData)

  type ViewMode = 'all' | 'mine' | 'saved'

  const view = $derived((page.url.searchParams.get('view') as ViewMode) ?? 'all')

  const hasSession = $derived(!!data.session?.user?.id)

  const effectiveView = $derived(!hasSession && (view === 'mine' || view === 'saved') ? 'all' : view)

  const setView = (v: ViewMode) => goto(`/lists?view=${v}`, { replaceState: true })

  $effect(() => {
    if (!hasSession && (view === 'mine' || view === 'saved')) {
      setView('all')
    }
  })

  type CreateListPayload = {
    title: string
    description: string | null
    visibility: ListVisibility
    tags: string[]
    isAnonymous: boolean
  }

  let showHandleRequired = $state(false)

  const createListMutation = createMutation(() => ({
    mutationFn: async (payload: CreateListPayload) => {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        if (responseData?.error === 'HANDLE_REQUIRED') {
          showHandleRequired = true

          return
        }

        throw new Error('Failed to create list')
      }
    },
    onSuccess: async () => {
      await invalidateAll()
      toast.success(L.lists_create_success())
    },
    onError: () => {
      toast.error(L.common_error_generic())
    },
  }))

  const tabs: { value: ViewMode; label: () => string; icon: typeof CompassIcon }[] = [
    { value: 'all', label: () => L.lists_view_all(), icon: CompassIcon },
    { value: 'mine', label: () => L.lists_view_mine(), icon: FolderOpenIcon },
    { value: 'saved', label: () => L.lists_view_saved(), icon: BookmarkIcon },
  ]
</script>

<section class="space-y-6">
  <header>
    <h1 class="text-2xl font-bold tracking-tight">{L.lists_my_title()}</h1>
    <p class="mt-1 text-sm text-muted-foreground">{L.lists_manage_description()}</p>
  </header>

  <div class="flex flex-wrap items-center gap-2">
    <div class="flex gap-1 rounded-lg border bg-card p-1">
      {#each tabs as tab (tab.value)}
        {@const Icon = tab.icon}
        <button
          type="button"
          class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
            effectiveView === tab.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          } ${!hasSession && (tab.value === 'mine' || tab.value === 'saved') ? 'opacity-70' : ''}`}
          onclick={() => setView(tab.value)}
          disabled={!hasSession && (tab.value === 'mine' || tab.value === 'saved')}
          title={!hasSession && tab.value !== 'all' ? L.common_sign_in() : undefined}
        >
          <Icon class="size-4 shrink-0" />
          {tab.label()}
        </button>
      {/each}
    </div>
  </div>

  {#if effectiveView === 'all'}
    <ExploreTabContent lists={data.lists} popularTags={data.popularTags} filters={data.filters} basePath="/lists" />
  {:else if effectiveView === 'mine'}
    <div class="space-y-6">
      <CreateListForm
        isPending={createListMutation.isPending}
        onCreate={(payload) => createListMutation.mutate(payload)}
      />

      <div>
        <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
          <FolderOpenIcon class="size-5 text-muted-foreground" />
          {L.lists_my_title()}
        </h2>
        {#if data.ownedLists.length === 0}
          <div class="rounded-lg border border-dashed bg-card/50 px-6 py-10 text-center">
            <p class="text-sm font-medium text-muted-foreground">{L.lists_empty_owned()}</p>
            <p class="mt-1 text-xs text-muted-foreground">{L.lists_empty_owned_cta()}</p>
          </div>
        {:else}
          <div class="grid gap-3 md:grid-cols-2">
            {#each data.ownedLists as item (item.id)}
              <a
                href={`/lists/${item.id}`}
                class="group rounded-lg border bg-card p-4 transition-all duration-150 hover:border-primary/30 hover:shadow-sm"
              >
                <div class="flex items-start justify-between gap-2">
                  <h3 class="leading-snug font-semibold transition-colors group-hover:text-primary">{item.title}</h3>
                  <div class="flex shrink-0 gap-1">
                    {#if item.isAnonymous}
                      <span class="rounded border px-2 py-0.5 text-xs text-muted-foreground">{L.lists_anonymous()}</span
                      >
                    {/if}
                    <span class="rounded border px-2 py-0.5 text-xs">{getVisibilityLabel(L, item.visibility)}</span>
                  </div>
                </div>
                <p class="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {item.description ?? L.common_no_description()}
                </p>
                <div class="mt-3 text-xs text-muted-foreground">
                  {L.common_items_count({ count: item._count.items })}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div>
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
        <BookmarkIcon class="size-5 text-muted-foreground" />
        {L.lists_saved_title()}
      </h2>
      {#if data.savedLists.length === 0}
        <div class="rounded-lg border border-dashed bg-card/50 px-6 py-10 text-center">
          <p class="text-sm font-medium text-muted-foreground">{L.lists_empty_saved()}</p>
          <a href="/lists?view=all" class="mt-2 inline-block text-xs text-primary hover:underline"
            >{L.lists_empty_saved_cta()}</a
          >
        </div>
      {:else}
        <div class="grid gap-3 md:grid-cols-2">
          {#each data.savedLists as item (item.listId)}
            <a
              href={`/lists/${item.listId}`}
              class="group rounded-lg border bg-card p-4 transition-all duration-150 hover:border-primary/30 hover:shadow-sm"
            >
              <div class="flex items-start justify-between gap-2">
                <h3 class="leading-snug font-semibold transition-colors group-hover:text-primary">{item.list.title}</h3>
                <span class="shrink-0 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium"
                  >{L.common_saved()}</span
                >
              </div>
              <p class="mt-1.5 text-xs text-muted-foreground">
                {L.common_by({ name: item.list.owner.handle ?? item.list.owner.name ?? item.list.owner.email ?? '—' })}
              </p>
              <div class="mt-3 text-xs text-muted-foreground">
                {L.common_items_count({ count: item.list._count.items })}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

{#if showHandleRequired}
  <HandleRequiredModal onclose={() => (showHandleRequired = false)} onHandleSet={() => (showHandleRequired = false)} />
{/if}
