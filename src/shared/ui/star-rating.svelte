<script lang="ts">
  type Props = {
    value?: number
    max?: number
    readonly?: boolean
    size?: 'sm' | 'md' | 'lg'
    onRate?: (value: number) => void
  }

  const { value = 0, max = 5, readonly = false, size = 'md', onRate }: Props = $props()

  let hovered = $state(0)

  const sizeClass = $derived(
    {
      sm: 'text-base',
      md: 'text-xl',
      lg: 'text-2xl',
    }[size],
  )

  const filled = $derived(hovered || value)

  const stars = $derived(Array.from({ length: max }, (_, index) => index + 1))
</script>

<div class="flex gap-0.5" role={readonly ? 'img' : 'group'} aria-label="Rating: {value} of {max}">
  {#each stars as star (star)}
    {@const active = star <= filled}
    {#if readonly}
      <span class={`${sizeClass} ${active ? 'text-yellow-400' : 'text-muted-foreground/30'}`}>★</span>
    {:else}
      <button
        type="button"
        class={`${sizeClass} transition-colors ${active ? 'text-yellow-400' : 'text-muted-foreground/30'} hover:text-yellow-400`}
        onmouseenter={() => (hovered = star)}
        onmouseleave={() => (hovered = 0)}
        onclick={() => onRate?.(star)}
        aria-label="Rate {star} of {max}">★</button
      >
    {/if}
  {/each}
</div>
