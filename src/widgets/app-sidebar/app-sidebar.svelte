<script lang="ts">
  import { page } from '$app/state'
  import CompassIcon from '@lucide/svelte/icons/compass'
  import GithubIcon from '@lucide/svelte/icons/github'
  import HomeIcon from '@lucide/svelte/icons/house'
  import ListIcon from '@lucide/svelte/icons/list'
  import UserIcon from '@lucide/svelte/icons/user'

  import LocaleSelector from '$features/locale-selector'
  import ThemeToggler from '$features/theme-toggler'
  import { L } from '$lib'

  import type { AppSidebarProps } from './app-sidebar.types'

  const { onNavigate }: AppSidebarProps = $props()

  const isActive = (path: string) => page.url.pathname === path

  const userLabel = $derived(
    page.data.session?.user
      ? (page.data.session.user.name ?? page.data.session.user.email ?? L.nav_profile())
      : L.nav_profile(),
  )
</script>

<div class="flex h-full w-full flex-col border-r bg-card">
  <div class="border-b p-4">
    <div class="font-semibold">{L.app_name()}</div>
  </div>

  <nav class="flex-1 space-y-2 p-4">
    <a
      href="/"
      class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${isActive('/') ? 'bg-accent font-medium' : ''}`}
      onclick={() => onNavigate?.()}
    >
      <HomeIcon class="size-4" />
      <span>{L.nav_home()}</span>
    </a>
    <a
      href="/explore"
      class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${isActive('/explore') ? 'bg-accent font-medium' : ''}`}
      onclick={() => onNavigate?.()}
    >
      <CompassIcon class="size-4" />
      <span>{L.nav_explore()}</span>
    </a>
    <a
      href="/lists"
      class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${isActive('/lists') ? 'bg-accent font-medium' : ''}`}
      onclick={() => onNavigate?.()}
    >
      <ListIcon class="size-4" />
      <span>{L.nav_lists()}</span>
    </a>
    <a
      href="/profile"
      class={`flex min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${isActive('/profile') ? 'bg-accent font-medium' : ''}`}
      onclick={() => onNavigate?.()}
    >
      <UserIcon class="size-4 shrink-0" />
      <span class="truncate">{userLabel}</span>
    </a>
  </nav>

  <div class="space-y-3 border-t p-4">
    <div class="flex items-center justify-between">
      <LocaleSelector />
      <ThemeToggler />
    </div>
    <div class="flex items-center justify-between">
      <span class="text-sm font-semibold text-muted-foreground tabular-nums">v{__APP_VERSION__}</span>
      <a
        href="https://github.com/St1ggy/cinetracker"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="GitHub repository"
      >
        <GithubIcon class="size-4" />
      </a>
    </div>
  </div>
</div>
