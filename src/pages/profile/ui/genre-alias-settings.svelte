<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import { cn } from '$lib/utils.js'

  import SlugChipField from './slug-chip-field.svelte'

  import type { GenreAliasConfig } from '$shared/lib/genre-alias'

  type GroupRow = {
    id: string
    displayName: string
    canonical: string
    slugs: string[]
  }

  type Props = { initialConfig: GenreAliasConfig }
  const { initialConfig }: Props = $props()

  let busy = $state(false)
  let selectedId = $state<string | null>(null)

  const rowsFromConfig = (c: GenreAliasConfig): GroupRow[] =>
    c.groups.map((g) => ({
      id: crypto.randomUUID(),
      displayName: g.displayName,
      canonical: g.canonical,
      slugs: [...g.slugs],
    }))

  let groups = $state<GroupRow[]>([])

  $effect.pre(() => {
    const nextGroups = rowsFromConfig(initialConfig)

    groups = nextGroups
    selectedId = nextGroups[0]?.id ?? null
  })

  const selected = $derived(
    selectedId == null ? null : (groups.find((g) => g.id === selectedId) ?? null),
  )

  const selectedIndex = $derived(
    selectedId == null ? -1 : groups.findIndex((g) => g.id === selectedId),
  )

  const trunc = (value: string, max: number) => {
    if (value.length <= max) {
      return value
    }

    return `${value.slice(0, max)}…`
  }

  const setGroupDisplayName = (id: string, displayName: string) => {
    groups = groups.map((g) => (g.id === id ? { ...g, displayName } : g))
  }

  const setGroupCanonical = (id: string, canonical: string) => {
    groups = groups.map((g) => (g.id === id ? { ...g, canonical } : g))
  }

  const textInputClass = cn(
    'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
  )

  const addGroup = () => {
    const newId = crypto.randomUUID()

    groups = [
      ...groups,
      { id: newId, displayName: '', canonical: '', slugs: [] },
    ]
    selectedId = newId
  }

  const removeGroup = (id: string) => {
    const ix = groups.findIndex((g) => g.id === id)
    const next = groups.filter((g) => g.id !== id)

    groups = next

    if (selectedId === id) {
      selectedId = next[Math.max(0, ix - 1)]?.id ?? next[0]?.id ?? null
    }
  }

  const buildConfig = (): { ok: true; config: GenreAliasConfig } | { ok: false } => {
    const out: GenreAliasConfig['groups'] = []

    for (const g of groups) {
      const displayName = g.displayName.trim()
      const canonical = g.canonical.trim()
      const slugs = g.slugs.map((s) => s.trim()).filter((s) => s.length > 0)

      if (displayName.length === 0 || canonical.length === 0 || slugs.length === 0) {
        return { ok: false }
      }

      out.push({ displayName, canonical, slugs })
    }

    return { ok: true, config: { groups: out } }
  }
</script>

<div class="rounded-lg border border-border/80 bg-card/80 p-5 shadow-sm sm:p-6">
  <header>
    <h2 class="text-base font-semibold text-foreground">{L.profile_genre_aliases_title()}</h2>
    <p class="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">
      {L.profile_genre_aliases_description()}
    </p>
  </header>

  <div
    class="mt-6 flex flex-col gap-5 md:mt-7 md:grid md:min-h-0 md:max-w-5xl md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:items-start md:gap-6"
  >
    <div class="flex min-h-0 min-w-0 flex-col">
      <p class="text-xs font-medium text-muted-foreground" id="ga-list-caption">
        {L.profile_genre_aliases_list_caption()}
      </p>
      <ul class="mt-2 max-h-60 min-h-0 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1 md:max-h-[min(24rem,50vh)]">
        {#each groups as g (g.id)}
          <li>
            <button
              type="button"
              id="ga-list-{g.id}"
              class="w-full min-w-0 rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-muted/50 {selectedId ===
              g.id
                ? 'border-primary/50 bg-muted/40'
                : 'border-transparent'}"
              aria-pressed={selectedId === g.id}
              disabled={busy}
              onclick={() => {
                selectedId = g.id
              }}
            >
              <span class="line-clamp-1 text-sm font-medium text-foreground">
                {g.displayName.trim() || '—'}
              </span>
              <span class="mt-0.5 line-clamp-1 font-mono text-[11px] text-muted-foreground"
                >{g.canonical.trim() ? trunc(g.canonical, 20) : '—'}</span
              >
            </button>
          </li>
        {/each}
      </ul>
      <button
        type="button"
        class="mt-2 flex h-10 w-full items-center justify-center rounded-md border-2 border-dashed border-border/80 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/25 hover:text-foreground"
        disabled={busy}
        title={L.profile_genre_aliases_add_group()}
        aria-label={L.profile_genre_aliases_add_group()}
        onclick={addGroup}
      >
        <span
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-current"
          aria-hidden="true"
        >
          <PlusIcon class="h-3.5 w-3.5" />
        </span>
      </button>
    </div>

    <div
      class="min-h-36 min-w-0 rounded-md border border-border/60 bg-muted/10 p-4 dark:bg-background/20"
      aria-live="polite"
    >
      {#if selected == null}
        <p class="text-sm text-muted-foreground">{L.profile_genre_aliases_empty_select()}</p>
      {:else if selectedIndex >= 0}
        <div class="mb-3 flex items-start justify-between gap-2">
          <h3 class="text-sm font-medium text-foreground">
            {L.profile_genre_aliases_group_heading({ n: selectedIndex + 1 })}
          </h3>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-destructive hover:bg-destructive/10"
            disabled={busy}
            onclick={() => removeGroup(groups[selectedIndex]!.id)}
          >
            <Trash2Icon class="h-4 w-4" />
            <span class="hidden sm:inline">{L.profile_genre_aliases_remove_group()}</span>
          </button>
        </div>
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 sm:items-start">
            <div class="min-w-0 space-y-1.5">
              <label
                class="text-xs text-muted-foreground"
                for="ga-d-name-{groups[selectedIndex]!.id}">{L.profile_genre_aliases_display_name_label()}</label
              >
              <input
                type="text"
                id="ga-d-name-{groups[selectedIndex]!.id}"
                class={textInputClass}
                disabled={busy}
                value={groups[selectedIndex]!.displayName}
                oninput={(event) => {
                  setGroupDisplayName(
                    groups[selectedIndex]!.id,
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }}
                autocomplete="off"
              />
            </div>
            <div class="min-w-0 space-y-1.5">
              <label
                class="text-xs text-muted-foreground"
                for="ga-d-canon-{groups[selectedIndex]!.id}">{L.profile_genre_aliases_canonical_label()}</label
              >
              <input
                type="text"
                id="ga-d-canon-{groups[selectedIndex]!.id}"
                class={cn(textInputClass, 'font-mono text-xs')}
                disabled={busy}
                value={groups[selectedIndex]!.canonical}
                oninput={(event) => {
                  setGroupCanonical(
                    groups[selectedIndex]!.id,
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }}
                autocomplete="off"
              />
              <p class="text-[11px] text-muted-foreground">
                {L.profile_genre_aliases_canonical_hint()}
              </p>
            </div>
          </div>

          <div class="min-w-0">
            <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <div class="text-xs font-medium text-muted-foreground">
                {L.profile_genre_aliases_slugs_label()}
              </div>
              <div class="text-xs tabular-nums text-muted-foreground/90">
                {L.profile_genre_aliases_chips_count({ n: groups[selectedIndex]!.slugs.length })}
              </div>
            </div>
            <SlugChipField bind:slugs={groups[selectedIndex]!.slugs} disabled={busy} />
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="mt-6 border-t border-border/60 pt-4">
    <button
      type="button"
      class="w-full min-w-40 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:ml-auto sm:w-auto sm:px-6"
      disabled={busy}
      onclick={async () => {
        if (busy) return

        const built = buildConfig()

        if (!built.ok) {
          toast.error(L.profile_genre_aliases_validation_error())

          return
        }

        busy = true
        try {
          const r = await fetch('/api/app/genre-aliases', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: built.config }),
          })

          if (!r.ok) {
            toast.error(L.profile_genre_aliases_save_error())

            return
          }

          toast.success(L.common_saved())
          await invalidateAll()
        } catch {
          toast.error(L.common_error_generic())
        } finally {
          busy = false
        }
      }}
    >
      {L.profile_genre_aliases_save()}
    </button>
  </div>
</div>
