<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x'
  import { tick } from 'svelte'

  import { L } from '$lib'
  import { Input } from '$lib/components/ui/input'

  type Props = {
    slugs: string[]
    disabled?: boolean
  }
  // `let` is required: `$bindable()` is reassigned; `disabled` is not, but one pattern is simpler.
  // eslint-disable-next-line prefer-const -- Svelte $bindable() requires `let` in this destructuring
  let { slugs = $bindable(), disabled = false }: Props = $props()

  let draft = $state('')
  let editDraft = $state('')
  let editingIndex = $state<number | null>(null)
  let fieldElement: HTMLInputElement | null = $state(null)
  let editFieldElement: HTMLInputElement | null = $state(null)

  const hasCi = (list: string[], kLower: string) => list.some((s) => s.toLowerCase() === kLower)

  const deduped = (add: string[], base: string[]): string[] => {
    const out: string[] = []

    for (const t of base) {
      if (t && !hasCi(out, t.toLowerCase())) {
        out.push(t)
      }
    }

    for (const t of add) {
      if (t && !hasCi(out, t.toLowerCase())) {
        out.push(t)
      }
    }

    return out
  }

  const addFromDraft = () => {
    const parts = draft
      .split(/[,;]+/u)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (parts.length === 0) {
      return
    }

    slugs = deduped(parts, slugs)
    draft = ''
  }

  const onDraftKeydown = (event: KeyboardEvent) => {
    if (editingIndex !== null) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()

      if (draft.trim() === '') {
        draft = ''
      } else {
        addFromDraft()
      }
    } else if (event.key === 'Backspace' && draft === '' && slugs.length > 0) {
      slugs = slugs.slice(0, -1)
    }
  }

  const onDraftBlur = () => {
    if (editingIndex !== null) {
      return
    }

    if (draft.trim() !== '') {
      addFromDraft()
    }
  }

  const remove = (ix: number) => {
    if (editingIndex === ix) {
      editingIndex = null
      editDraft = ''
    } else if (editingIndex !== null && editingIndex > ix) {
      editingIndex = editingIndex - 1
    }

    slugs = slugs.filter((_, index) => index !== ix)
  }

  const startEdit = async (ix: number) => {
    if (disabled) {
      return
    }

    editingIndex = ix
    editDraft = slugs[ix] ?? ''
    await tick()
    editFieldElement?.focus()
    editFieldElement?.select?.()
  }

  const commitEdit = () => {
    if (editingIndex == null) {
      return
    }

    const ix = editingIndex
    const t = editDraft.trim()

    if (t.length === 0) {
      slugs = slugs.filter((_, index) => index !== ix)
    } else {
      const others = slugs.filter((_, index) => index !== ix)

      if (!hasCi(others, t.toLowerCase())) {
        slugs = slugs.map((s, index) => (index === ix ? t : s))
      }
    }

    editingIndex = null
    editDraft = ''
  }

  const cancelEdit = () => {
    editingIndex = null
    editDraft = ''
  }

  const onEditKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEdit()
      void tick().then(() => fieldElement?.focus())
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }

  /** The second "click" in a double-click has `event.detail === 2` and is more reliable than `dblclick` on a span. */
  const onChipLabelClick = (ix: number) => (event: MouseEvent) => {
    if (event.detail !== 2) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (disabled) {
      return
    }

    if (editingIndex !== null) {
      return
    }

    void startEdit(ix)
  }

  const onChipKeydown = (ix: number) => (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()

      if (editingIndex !== null || disabled) {
        return
      }

      void startEdit(ix)
    }
  }
</script>

<div class="space-y-1.5">
  <p class="text-[11px] text-muted-foreground">{L.profile_genre_aliases_chips_hint()}</p>
  <div
    class="group/slugchips flex max-h-40 min-h-10 w-full min-w-0 flex-wrap content-center items-center gap-1.5 overflow-y-auto rounded-md border border-dashed border-border/80 bg-muted/20 px-1.5 py-1.5 pl-2 dark:bg-background/20 has-[:focus-visible]:border-ring/60 has-[:focus-within]:border-border"
    role="group"
    aria-label={L.profile_genre_aliases_slugs_label()}
  >
    {#each slugs as s, index (`${index}-${s}`)}
      {#if editingIndex === index}
        <div class="inline-flex max-w-full items-center">
          <Input
            class="h-7 w-44 max-w-full min-w-[8rem] border-border/80 bg-background/95 px-2 font-mono text-xs dark:bg-card/80"
            bind:ref={editFieldElement}
            bind:value={editDraft}
            {disabled}
            onkeydown={onEditKeydown}
            onblur={commitEdit}
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
          />
        </div>
      {:else}
        <div
          class="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-full border border-border/80 bg-background/90 pl-0.5 dark:bg-card/80"
        >
          <button
            type="button"
            class="min-w-0 max-w-48 rounded-l-full py-0.5 pl-1.5 text-left font-mono text-xs tabular-nums text-foreground {disabled
              ? 'pointer-events-none opacity-50'
              : 'cursor-text hover:bg-muted/40'}"
            title={L.profile_genre_aliases_chip_dblclick()}
            tabindex={disabled ? -1 : 0}
            {disabled}
            aria-label={L.profile_genre_aliases_chip_dblclick()}
            onclick={onChipLabelClick(index)}
            onkeydown={onChipKeydown(index)}
          >
            <span class="min-w-0 block truncate pr-0.5">{s}</span>
          </button>
          <button
            type="button"
            class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            {disabled}
            title={L.profile_genre_aliases_remove_slug()}
            onclick={() => remove(index)}
          >
            <XIcon class="h-3 w-3" />
            <span class="sr-only">{L.profile_genre_aliases_remove_slug()}</span>
          </button>
        </div>
      {/if}
    {/each}
    <input
      bind:this={fieldElement}
      class="h-7 min-w-[6rem] flex-1 border-0 bg-transparent px-0.5 text-xs font-mono text-foreground shadow-none ring-0 outline-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
      {disabled}
      value={draft}
      oninput={(event) => (draft = (event.currentTarget as HTMLInputElement).value)}
      onkeydown={onDraftKeydown}
      onblur={onDraftBlur}
      placeholder={L.profile_genre_aliases_slug_input_placeholder()}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
    />
  </div>
</div>
