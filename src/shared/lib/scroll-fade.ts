// Svelte action that drives the `.scroll-fade` CSS mask by updating
// `--sf-top` and `--sf-bottom` custom properties (0 = no fade, 1 = fade).
//
// Usage: <div class="scroll-fade overflow-y-auto" use:scrollFade>
export const scrollFade = (node: HTMLElement) => {
  const update = () => {
    const atTop = node.scrollTop <= 2
    const atBottom = node.scrollTop >= node.scrollHeight - node.clientHeight - 2

    node.style.setProperty('--sf-top', atTop ? '0' : '1')
    node.style.setProperty('--sf-bottom', atBottom ? '0' : '1')
  }

  const ro = new ResizeObserver(update)

  ro.observe(node)
  node.addEventListener('scroll', update, { passive: true })
  update()

  return {
    destroy() {
      ro.disconnect()
      node.removeEventListener('scroll', update)
    },
  }
}
