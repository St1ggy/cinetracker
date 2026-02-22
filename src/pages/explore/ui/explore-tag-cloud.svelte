<script lang="ts">
  import { goto } from '$app/navigation'

  import { L } from '$lib'

  type Tag = { id: string; slug: string; name: string }

  type Props = {
    tags: Tag[]
    activeTags?: string[]
    query?: string
  }

  const { tags, activeTags = [], query = '' }: Props = $props()

  const toggle = (slug: string) => {
    const next = activeTags.includes(slug) ? activeTags.filter((t) => t !== slug) : [...activeTags, slug]

    const parts: string[] = []

    if (query) parts.push(`q=${encodeURIComponent(query)}`)

    for (const tag of next) parts.push(`tag=${encodeURIComponent(tag)}`)

    goto(parts.length > 0 ? `/explore?${parts.join('&')}` : '/explore')
  }
</script>

{#if tags.length > 0}
  <div class="space-y-2">
    <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">{L.explore_popular_tags()}</p>
    <div class="flex flex-wrap gap-1.5">
      {#each tags as tag (tag.id)}
        {@const active = activeTags.includes(tag.slug)}
        <button
          type="button"
          class={`rounded-full border px-3 py-1 text-xs transition-colors ${
            active
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground'
          }`}
          onclick={() => toggle(tag.slug)}
        >
          #{tag.name}
        </button>
      {/each}
    </div>
  </div>
{/if}
