<script lang="ts">
  import { goto } from '$app/navigation'

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
  <div class="flex gap-2">
    <input
      type="search"
      class="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
      placeholder={L.explore_search_placeholder()}
      bind:value={inputValue}
      onkeydown={onKeyDown}
    />
    <button
      type="button"
      class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      onclick={applySearch}
    >
      &#128269;
    </button>
  </div>

  {#if activeTags.length > 0}
    <div class="flex flex-wrap gap-1">
      {#each activeTags as tag (tag)}
        <span class="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
          #{tag}
          <button type="button" class="text-muted-foreground hover:text-foreground" onclick={() => removeTag(tag)}>
            ✕
          </button>
        </span>
      {/each}
    </div>
  {/if}
</div>
