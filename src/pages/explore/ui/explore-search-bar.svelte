<script lang="ts">
  import { goto } from '$app/navigation'
  import SearchIcon from '@lucide/svelte/icons/search'
  import XIcon from '@lucide/svelte/icons/x'

  import { L } from '$lib'

  type Props = {
    query?: string
    activeTags?: string[]
  }

  let { query = $bindable(''), activeTags = $bindable([]) }: Props = $props()

  let inputValue = $state(query)

  const buildUrl = (): string => {
    const parts: string[] = []

    if (inputValue.trim()) parts.push(`q=${encodeURIComponent(inputValue.trim())}`)

    for (const tag of activeTags) parts.push(`tag=${encodeURIComponent(tag)}`)

    return parts.length > 0 ? `/explore?${parts.join('&')}` : '/explore'
  }

  const applySearch = () => goto(buildUrl())

  const removeTag = (tag: string) => {
    activeTags = activeTags.filter((t) => t !== tag)
    goto(buildUrl())
  }

  const onKeyDown = (event_: KeyboardEvent) => {
    if (event_.key === 'Enter') applySearch()
  }
</script>

<div class="flex flex-col gap-2">
  <div class="relative flex items-center">
    <SearchIcon class="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
    <input
      type="search"
      class="w-full rounded-lg border bg-background py-2.5 pr-12 pl-10 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
      placeholder={L.explore_search_placeholder()}
      bind:value={inputValue}
      onkeydown={onKeyDown}
    />
    <button
      type="button"
      aria-label={L.common_apply()}
      class="absolute right-2 rounded-md bg-primary px-2.5 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      onclick={applySearch}
    >
      <SearchIcon class="size-3.5" />
    </button>
  </div>

  {#if activeTags.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each activeTags as tag (tag)}
        <span class="flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium">
          #{tag}
          <button
            type="button"
            aria-label="Remove tag {tag}"
            class="text-muted-foreground hover:text-foreground"
            onclick={() => removeTag(tag)}
          >
            <XIcon class="size-3" />
          </button>
        </span>
      {/each}
    </div>
  {/if}
</div>
