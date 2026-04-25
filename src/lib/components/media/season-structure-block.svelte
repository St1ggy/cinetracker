<script lang="ts">
  import Trash2Icon from '@lucide/svelte/icons/trash-2'

  import { L } from '$lib'
  import {
    type SeasonBreakdownEntry,
    parseQuickSeasonBreakdownInput,
    sortSeasonBreakdown,
  } from '$shared/lib/episodic-progress'

  type Props = {
    idPrefix: string
    /** Catalog rows for “reset to catalog”. */
    catalogForReset: SeasonBreakdownEntry[]
    draft: SeasonBreakdownEntry[]
    onAfterQuickApply?: () => void
  }

  // Svelte: `let` required for `$bindable` in the same destructure; other props are const
  // eslint-disable-next-line prefer-const
  let { idPrefix, catalogForReset, draft = $bindable<SeasonBreakdownEntry[]>([]), onAfterQuickApply }: Props = $props()

  let structureQuick = $state('')
  let quickParseError = $state(false)

  const applyStructureQuick = () => {
    const parsed = parseQuickSeasonBreakdownInput(structureQuick)

    if (!parsed) {
      quickParseError = true

      return
    }

    quickParseError = false
    draft = parsed.map((r) => ({ ...r }))
    onAfterQuickApply?.()
  }

  const onStructureQuickInput = () => {
    quickParseError = false
  }

  const addRow = () => {
    const nextSn = draft.length === 0 ? 1 : Math.max(...draft.map((r) => r.seasonNumber), 0) + 1

    draft = sortSeasonBreakdown([...draft, { seasonNumber: nextSn, episodes: 1 }])
  }

  const removeRow = (index: number) => {
    const next = draft.filter((_, index_) => index_ !== index)

    draft = sortSeasonBreakdown(next)
  }

  const resetToCatalog = () => {
    const c = sortSeasonBreakdown([...catalogForReset])

    draft = c.length > 0 ? c.map((r) => ({ ...r })) : []
  }

  const setRowSeason = (index: number, n: number) => {
    const c = draft.map((r, index_) => (index_ === index ? { ...r, seasonNumber: n } : { ...r }))

    draft = sortSeasonBreakdown(c)
  }

  const setRowEpisodes = (index: number, n: number) => {
    const c = draft.map((r, index_) => (index_ === index ? { ...r, episodes: n } : { ...r }))

    draft = sortSeasonBreakdown(c)
  }
</script>

<div class="mt-2 space-y-2">
  <div>
    <label class="mb-1 block text-xs font-medium text-muted-foreground" for="squick-{idPrefix}">
      {L.media_structure_quick_entry_label()}
    </label>
    <textarea
      id="squick-{idPrefix}"
      class="min-h-28 w-full rounded-md border border-input bg-background px-2 py-2 font-mono text-sm leading-relaxed {quickParseError
        ? 'border-destructive'
        : ''}"
      placeholder={L.media_structure_quick_entry_placeholder()}
      value={structureQuick}
      oninput={(event) => {
        onStructureQuickInput()
        structureQuick = (event.currentTarget as HTMLTextAreaElement).value
      }}
    ></textarea>
    <div class="mt-1 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        onclick={applyStructureQuick}
      >
        {L.media_progress_apply_quick()}
      </button>
      {#if quickParseError}
        <p class="text-sm text-destructive" role="alert">
          {L.media_structure_quick_error()}
        </p>
      {/if}
    </div>
  </div>

  {#each draft as row, ridx (ridx)}
    <div
      class="grid items-end gap-x-2 gap-y-2 {draft.length > 1
        ? 'grid-cols-1 min-[400px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem]'
        : 'grid-cols-1 min-[400px]:grid-cols-2'}"
    >
      <div class="min-w-0">
        <label class="mb-1 block text-xs text-muted-foreground" for="str-s-{idPrefix}-{ridx}"
          >{L.media_progress_season()}</label
        >
        <input
          id="str-s-{idPrefix}-{ridx}"
          type="number"
          min="1"
          class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm"
          value={row.seasonNumber}
          oninput={(event) => {
            const v = (event.currentTarget as HTMLInputElement).value

            if (v === '') {
              return
            }

            const n = Math.max(1, Math.floor(Number(v)))

            if (!Number.isFinite(n)) {
              return
            }

            setRowSeason(ridx, n)
          }}
        />
      </div>
      <div class="min-w-0">
        <label class="mb-1 block text-xs text-muted-foreground" for="str-epc-{idPrefix}-{ridx}"
          >{L.media_progress_structure_in_season()}</label
        >
        <input
          id="str-epc-{idPrefix}-{ridx}"
          type="number"
          min="1"
          class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm"
          value={row.episodes}
          oninput={(event) => {
            const v = (event.currentTarget as HTMLInputElement).value

            if (v === '') {
              return
            }

            const n = Math.max(1, Math.floor(Number(v)))

            if (!Number.isFinite(n)) {
              return
            }

            setRowEpisodes(ridx, n)
          }}
        />
      </div>
      {#if draft.length > 1}
        <div class="col-span-1 min-[400px]:col-auto">
          <span class="invisible mb-1 block text-xs max-[399px]:hidden" aria-hidden="true"
            >{L.media_progress_season()}</span
          >
          <button
            type="button"
            class="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted min-[400px]:w-10"
            aria-label={L.media_progress_structure_remove_row()}
            onclick={() => {
              removeRow(ridx)
            }}
          >
            <Trash2Icon class="size-4" />
          </button>
        </div>
      {/if}
    </div>
  {/each}
  <div class="flex flex-wrap gap-2 pt-1">
    <button
      type="button"
      class="rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
      onclick={addRow}
    >
      {L.media_progress_structure_add_season()}
    </button>
    <button
      type="button"
      class="rounded-md border border-dotted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
      onclick={resetToCatalog}
    >
      {L.media_progress_structure_reset_catalog()}
    </button>
  </div>
</div>
