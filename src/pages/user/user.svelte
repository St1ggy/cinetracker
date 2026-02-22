<script lang="ts">
  import { page } from '$app/state'

  import { L } from '$lib'
  import ExploreListCard from '$pages/explore/ui/explore-list-card.svelte'

  import type { PageData } from '../../routes/u/[handle]/$types'

  const data = $derived(page.data as PageData)
  const { profile } = $derived(data)
</script>

<section class="mx-auto max-w-4xl space-y-8 px-4 py-8">
  <header class="flex items-center gap-4">
    <div
      class="flex size-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground"
    >
      {profile.handle?.[0]?.toUpperCase() ?? '?'}
    </div>
    <div>
      <h1 class="text-2xl font-semibold">@{profile.handle}</h1>
      {#if profile.name}
        <p class="text-sm text-muted-foreground">{profile.name}</p>
      {/if}
    </div>
  </header>

  <div>
    <h2 class="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
      {L.explore_title()} · {profile.lists.length}
    </h2>

    {#if profile.lists.length === 0}
      <p class="py-12 text-center text-muted-foreground">{L.explore_no_results()}</p>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2">
        {#each profile.lists as list (list.id)}
          <ExploreListCard
            list={{
              ...list,
              isAnonymous: false,
              owner: {
                id: profile.id,
                handle: profile.handle,
                name: profile.name,
                email: null,
              },
            }}
          />
        {/each}
      </div>
    {/if}
  </div>
</section>
