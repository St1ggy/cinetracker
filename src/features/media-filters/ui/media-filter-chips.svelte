<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x'

  import type { MediaFilterChip } from '$shared/lib/media-filters'

  type Props = {
    chips: MediaFilterChip[]
    onRemove: (chip: MediaFilterChip) => void
  }

  const { chips, onRemove }: Props = $props()
</script>

{#if chips.length > 0}
  <ul class="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
    {#each chips as chip (chip.id)}
      <li class="contents">
        <button
          type="button"
          class="inline-flex max-w-full items-center gap-1 rounded-full border bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
          onclick={() => onRemove(chip)}
        >
          <span class="truncate">{chip.label}</span>
          <XIcon class="size-3 shrink-0 opacity-70" aria-hidden="true" />
        </button>
      </li>
    {/each}
  </ul>
{/if}
