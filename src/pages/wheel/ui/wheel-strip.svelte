<script lang="ts">
  import createEmblaCarousel from 'embla-carousel'

  import { L } from '$lib'
  import {
    applyWheelStripSpinPhysics,
    findWheelStripSpinScrollDistance,
    wheelStripMinSpinTravelPx,
  } from '$shared/lib/wheel-embla-spin'

  import type { WheelEntry } from '../wheel.types'
  import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel'
  import type { Action } from 'svelte/action'

  const preventScrollDefault: EventListener = (event) => {
    event.preventDefault()
  }

  /** Stops user wheel / trackpad; Embla still scrolls programmatically. */
  const blockStripUserScroll: Action<HTMLElement> = (node) => {
    const options: AddEventListenerOptions = { passive: false }

    node.addEventListener('wheel', preventScrollDefault, options)

    return {
      destroy() {
        node.removeEventListener('wheel', preventScrollDefault, options)
      },
    }
  }

  type Props = {
    entries: WheelEntry[]
    spinSerial: number
    winnerId: string | null
    onSpinningChange?: (spinning: boolean) => void
    onSpinComplete?: (winner: WheelEntry) => void
  }

  const { entries, spinSerial, winnerId, onSpinningChange, onSpinComplete }: Props = $props()

  /** Repeating the list in the DOM (Embla loop reorders slides, but only duplicates make repeats visible). */
  const STRIP_LIST_COPIES = 4
  /** Middle copy, roughly centered in the long strip. */
  const ANCHOR_COPY = Math.min(2, STRIP_LIST_COPIES - 1)

  type StripCell = { entry: WheelEntry; copy: number; key: string }

  const stripCells = $derived.by((): StripCell[] => {
    if (entries.length === 0) {
      return []
    }

    const out: StripCell[] = []

    for (let copy = 0; copy < STRIP_LIST_COPIES; copy += 1) {
      for (const entry of entries) {
        out.push({ entry, copy, key: `${entry.id}@${copy}` })
      }
    }

    return out
  })

  const randomInt = (maxExclusive: number) => {
    if (maxExclusive <= 1) return 0

    const bytes = new Uint32Array(1)

    crypto.getRandomValues(bytes)

    return bytes[0]! % maxExclusive
  }

  const stripEmbla = (overrides?: EmblaOptionsType): EmblaOptionsType => ({
    axis: 'x',
    align: 'center',
    loop: true,
    watchDrag: false,
    watchFocus: false,
    watchSlides: true,
    // Idle: relaxed. Spin: `reInit` 1s–5s for semantics + `applyWheelStripSpinPhysics` for pull/glide.
    duration: 2400,
    containScroll: false,
    ...overrides,
  })

  const playStripSpin = (api: EmblaCarouselType, list: WheelEntry[], id: string) => {
    const reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    const w = list.findIndex((row) => row.id === id)

    if (w === -1) {
      onSpinningChange?.(false)

      return
    }

    const winner = list[w]

    if (!winner) {
      onSpinningChange?.(false)

      return
    }

    const n = list.length
    const copyForLanding = Math.max(1, STRIP_LIST_COPIES - 1)
    const targetSnapIndex = copyForLanding * n + w
    const slideCount = STRIP_LIST_COPIES * n

    const finish = () => {
      onSpinningChange?.(false)
      onSpinComplete?.(winner)
    }

    // Drawn once per button press: total spin feel 1s–5s; at least 3–7 full Embla loop lengths before stop.
    const durationMs = 1000 + randomInt(4001)
    const minFullLaps = 3 + randomInt(5)

    if (reducedMotion) {
      api.reInit({ ...stripEmbla({ duration: 0 }) })
      requestAnimationFrame(() => {
        api.scrollTo(targetSnapIndex, true)
        finish()
      })

      return
    }

    const canLoop = api.internalEngine().options.loop

    const runSettle = (onDone: () => void) => {
      let done = false
      const onSettle = () => {
        if (done) return

        done = true
        api.off('settle', onSettle)
        onDone()
      }

      api.on('settle', onSettle)
    }

    const runAnimatedSpin = () => {
      if (slideCount > 1 && api.selectedScrollSnap() === targetSnapIndex) {
        const away = (targetSnapIndex + 1 + randomInt(slideCount - 1)) % slideCount

        api.scrollTo(away, true)
      }

      requestAnimationFrame(() => {
        const minT = wheelStripMinSpinTravelPx(api, minFullLaps)
        const scrollDistance = findWheelStripSpinScrollDistance(api, targetSnapIndex, minT)

        // After nudge, `scrollTo(·, true)` leaves duration=0; then restore the “fast start / long glide” curve.
        applyWheelStripSpinPhysics(api, durationMs)
        api.internalEngine().scrollTo.distance(scrollDistance, true)
      })
    }

    if (!canLoop) {
      api.reInit({ ...stripEmbla({ duration: durationMs, loop: false }) })
      runSettle(finish)
      requestAnimationFrame(() => {
        runAnimatedSpin()
      })

      return
    }

    api.reInit({ ...stripEmbla({ duration: durationMs, loop: true }) })
    runSettle(finish)
    requestAnimationFrame(() => {
      runAnimatedSpin()
    })
  }

  const entriesKey = $derived(entries.map((row) => row.id).join('|'))

  let emblaViewport = $state<HTMLDivElement | null>(null)
  let emblaApi = $state<EmblaCarouselType | null>(null)
  let lastProcessedSerial = $state(0)
  let layoutEpoch = 0

  $effect(() => {
    const node = emblaViewport

    if (!node || entries.length === 0) {
      emblaApi = null

      return
    }

    const n = entries.length
    const start =
      n > 0
        ? Math.min(ANCHOR_COPY, STRIP_LIST_COPIES - 1) * n + (Math.max(0, n >> 1) % n)
        : 0
    const api = createEmblaCarousel(node, stripEmbla({ startIndex: start }))

    emblaApi = api
    const epoch = layoutEpoch

    queueMicrotask(() => {
      requestAnimationFrame(() => {
        if (layoutEpoch !== epoch) {
          return
        }

        if (!api.internalEngine().options.loop) {
          api.reInit({ ...stripEmbla({ loop: false, startIndex: 0 }) })
        }

        requestAnimationFrame(() => {
          if (layoutEpoch !== epoch) {
            return
          }

          if (n > 0) {
            const anchor =
              Math.min(ANCHOR_COPY, STRIP_LIST_COPIES - 1) * n + (Math.max(0, n >> 1) % n)

            api.scrollTo(anchor, true)
          }
        })
      })
    })

    return () => {
      if (emblaApi === api) {
        emblaApi = null
      }

      api.destroy()
    }
  })

  $effect(() => {
    const serial = spinSerial
    const id = winnerId

    if (serial === 0 || serial === lastProcessedSerial || !id) return

    const list = entries

    if (list.length === 0) return

    layoutEpoch += 1
    lastProcessedSerial = serial
    onSpinningChange?.(true)

    const trySpin = (attempt: number) => {
      const api = emblaApi

      if (!api) {
        if (attempt < 24) requestAnimationFrame(() => trySpin(attempt + 1))
        else onSpinningChange?.(false)

        return
      }

      playStripSpin(api, list, id)
    }

    queueMicrotask(() => {
      requestAnimationFrame(() => trySpin(0))
    })
  })
</script>

<div class="relative rounded-xl border bg-card">
  <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2" aria-hidden="true">
    <div class="flex flex-col items-center">
      <div class="flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm">
        <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
      </div>
      <div class="h-0 w-0 border-x-6 border-t-10 border-x-transparent border-t-primary drop-shadow-sm"></div>
    </div>
  </div>

  {#if entries.length === 0}
    <div class="p-10 text-center text-sm text-muted-foreground">{L.wheel_empty_filtered()}</div>
  {:else}
    <div class="relative min-w-0">
      <div
        class="pointer-events-none absolute inset-y-0 left-0 z-20 w-14 bg-linear-to-r from-card to-transparent"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 z-20 w-14 bg-linear-to-l from-card to-transparent"
        aria-hidden="true"
      ></div>
      {#key entriesKey}
        <div
          bind:this={emblaViewport}
          class="embla touch-pan-y overflow-hidden px-2 py-10 select-none sm:px-3"
          use:blockStripUserScroll
        >
          <div class="embla__container flex gap-3">
            {#each stripCells as cell (cell.key)}
              <div class="embla__slide min-w-0 shrink-0 grow-0 basis-28">
                <article
                  class="rounded-lg border bg-background p-2 shadow-sm"
                  aria-hidden={cell.copy > 0 ? true : undefined}
                >
                  {#if cell.entry.posterUrl}
                    <img
                      src={cell.entry.posterUrl}
                      alt=""
                      class="mx-auto aspect-2/3 w-full rounded-md object-cover"
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                    />
                  {:else}
                    <div
                      class="mx-auto flex aspect-2/3 w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
                    >
                      ?
                    </div>
                  {/if}
                  <p class="mt-2 line-clamp-3 text-center text-[11px] leading-tight font-medium">
                    {cell.entry.title}
                  </p>
                </article>
              </div>
            {/each}
          </div>
        </div>
      {/key}
    </div>
  {/if}
</div>
