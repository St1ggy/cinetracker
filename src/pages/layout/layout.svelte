<script lang="ts">
  import { afterNavigate, beforeNavigate, onNavigate } from '$app/navigation'
  import { page } from '$app/state'
  import MenuIcon from '@lucide/svelte/icons/menu'
  import XIcon from '@lucide/svelte/icons/x'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { ModeWatcher } from 'mode-watcher'

  onNavigate((navigation) => {
    if (!document.startViewTransition) return

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  import { L } from '$lib'
  import favicon from '$lib/assets/favicon.svg'
  import AppSidebar from '$widgets/app-sidebar'

  import '../../app.css'

  import type { LayoutProps } from './layout.types'

  const { children }: LayoutProps = $props()
  const queryClient = new QueryClient()
  let mobileSidebarOpen = $state(false)
  let isNavigating = $state(false)

  beforeNavigate(() => {
    isNavigating = true
  })
  afterNavigate(() => {
    isNavigating = false
  })
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if isNavigating}
  <div class="nav-progress" aria-hidden="true"></div>
{/if}

<ModeWatcher />

<QueryClientProvider client={queryClient}>
  <div class="min-h-screen bg-background">
    <div class="flex min-h-screen">
      <aside class="sticky top-0 hidden h-screen w-72 shrink-0 md:block">
        <AppSidebar />
      </aside>

      {#if mobileSidebarOpen}
        <button
          class="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label={L.common_close()}
          onclick={() => (mobileSidebarOpen = false)}
        ></button>
        <aside class="fixed inset-y-0 left-0 z-50 w-72 md:hidden">
          <AppSidebar onNavigate={() => (mobileSidebarOpen = false)} />
        </aside>
      {/if}

      <main class="flex min-w-0 flex-1 flex-col">
        <header class="m-4 flex items-center justify-between gap-4 rounded-lg border bg-card p-3">
          <button
            class="inline-flex size-9 items-center justify-center rounded-md border hover:bg-accent md:hidden"
            aria-label={L.nav_toggle_sidebar()}
            onclick={() => (mobileSidebarOpen = !mobileSidebarOpen)}
          >
            {#if mobileSidebarOpen}
              <XIcon class="size-4" />
            {:else}
              <MenuIcon class="size-4" />
            {/if}
          </button>
          <div class="text-sm text-muted-foreground">
            {#if page.data.session?.user}
              {L.layout_signed_in_as({ name: page.data.session.user.email ?? page.data.session.user.name ?? '—' })}
            {:else}
              <a href="/signin" class="underline">{L.common_sign_in()}</a>
            {/if}
          </div>
        </header>

        <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
          {@render children()}
        </div>
      </main>
    </div>
  </div>
</QueryClientProvider>
