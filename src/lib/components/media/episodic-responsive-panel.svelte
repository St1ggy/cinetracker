<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x'
  import { Dialog } from 'bits-ui'

  import { L } from '$lib'
  import { cn } from '$lib/utils.js'

  import type { Snippet } from 'svelte'

  type Props = {
    onOpenChange: (open: boolean) => void
    class?: string
    children: Snippet
  }

  const { onOpenChange, class: className, children }: Props = $props()
</script>

<Dialog.Root open {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
    />
    <Dialog.Content
      class={cn(
        'fixed z-50 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col gap-0 overflow-y-auto border-0 bg-background p-0 shadow-lg outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
        'max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-h-[min(90dvh,720px)] max-md:translate-y-0',
        'max-md:rounded-t-xl max-md:border-t',
        'max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom',
        'md:top-1/2 md:left-1/2 md:max-h-[min(90vh,720px)] md:w-full md:-translate-x-1/2 md:-translate-y-1/2',
        'md:rounded-xl md:border md:shadow-2xl',
        'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))] max-md:pb-4',
        className,
      )}
    >
      <div class="border-b border-border px-4 pt-2 pb-2 md:hidden" aria-hidden="true">
        <div class="mx-auto h-1.5 w-10 rounded-full bg-muted"></div>
      </div>
      <Dialog.Close
        class="absolute end-3 top-3 z-10 hidden h-8 w-8 items-center justify-center rounded-md opacity-80 ring-offset-2 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden md:inline-flex"
      >
        <XIcon class="size-4" />
        <span class="sr-only">{L.common_close()}</span>
      </Dialog.Close>
      {@render children?.()}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
