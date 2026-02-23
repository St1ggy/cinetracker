<script lang="ts">
  import GlobeIcon from '@lucide/svelte/icons/globe'
  import LinkIcon from '@lucide/svelte/icons/link'
  import LockIcon from '@lucide/svelte/icons/lock'

  import { L } from '$lib'
  import { getVisibilityLabel } from '$shared/lib/labels'
  import { cn } from '$lib/utils.js'

  import type { ListVisibility } from '$shared/config/domain'

  type Props = {
    visibility: ListVisibility
    class?: string
  }

  const { visibility, class: className }: Props = $props()

  const label = $derived(getVisibilityLabel(L, visibility))
</script>

<span
  class={cn('inline-flex shrink-0 items-center text-muted-foreground', className)}
  title={label}
  aria-label={label}
>
  {#if visibility === 'PRIVATE'}
    <LockIcon class="size-[1em]" />
  {:else if visibility === 'UNLISTED'}
    <LinkIcon class="size-[1em]" />
  {:else}
    <GlobeIcon class="size-[1em]" />
  {/if}
</span>
