<script lang="ts">
  import { page } from '$app/state'
  import HomeIcon from '@lucide/svelte/icons/house'
  import InfoIcon from '@lucide/svelte/icons/info'
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
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

  <nav class="flex min-h-0 flex-1 flex-col p-4">
    <div class="space-y-2">
      <a
        href="/"
        class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${isActive('/') ? 'bg-accent font-medium' : ''}`}
        onclick={() => onNavigate?.()}
      >
        <HomeIcon class="size-4" />
        <span>{L.nav_home()}</span>
      </a>
      <a
        href="/board"
        class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${isActive('/board') ? 'bg-accent font-medium' : ''}`}
        onclick={() => onNavigate?.()}
      >
        <LayoutDashboardIcon class="size-4" />
        <span>{L.nav_board()}</span>
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
    </div>
    <div class="min-h-0 flex-1" aria-hidden="true"></div>
    <a
      href="/about"
      class={`mt-2 flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${isActive('/about') ? 'bg-accent font-medium' : ''}`}
      onclick={() => onNavigate?.()}
    >
      <InfoIcon class="size-4" />
      <span>{L.nav_about()}</span>
    </a>
  </nav>

  <div class="flex items-center justify-between border-t p-4">
    <LocaleSelector />
    <ThemeToggler />
  </div>
</div>
