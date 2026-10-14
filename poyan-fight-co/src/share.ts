import {
  LEATHER_COLOURS, SEAL_COLOURS, LETTERING_COLOURS, FINISHES, WEIGHTS, NAME_MAX, keysOf,
  type GloveConfig,
} from './config'

// Anyone can type anything into a link, so only accept values that really exist.
// ?leather=royal is fine. ?leather=purple returns undefined and the default stays.
function pick<T extends string | number>(allowed: readonly T[], value: string | null) {
  return allowed.find((option) => String(option) === value)
}

// On page load: copy any choices in the link into the config
export function readConfigFromUrl(config: GloveConfig) {
  const params = new URLSearchParams(window.location.search)

  config.leather = pick(keysOf(LEATHER_COLOURS), params.get('leather')) ?? config.leather
  config.finish = pick(FINISHES, params.get('finish')) ?? config.finish
  config.seal = pick(keysOf(SEAL_COLOURS), params.get('seal')) ?? config.seal
  config.lettering = pick(keysOf(LETTERING_COLOURS), params.get('lettering')) ?? config.lettering
  config.weight = pick(WEIGHTS, params.get('weight')) ?? config.weight

  const name = params.get('name')
  if (name) config.name = name.slice(0, NAME_MAX)
}

// The current build as a full link, e.g. https://…/?leather=royal&finish=gloss&…&name=POYAN
export function buildUrl(config: GloveConfig) {
  const params = new URLSearchParams({
    leather: config.leather,
    finish: config.finish,
    seal: config.seal,
    lettering: config.lettering,
    weight: String(config.weight),
  })
  const name = config.name.trim()
  if (name) params.set('name', name)

  const url = new URL(window.location.href)
  url.search = params.toString()
  return url.toString()
}

// Keep the address bar up to date as options change.
// replaceState swaps the link without reloading the page or adding a Back-button step.
// Waiting 300 ms means typing a name updates it once, not on every letter.
let saveTimer = 0
export function saveConfigToUrl(config: GloveConfig) {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    history.replaceState(null, '', buildUrl(config))
  }, 300)
}

// Phones: open the normal share menu (Messenger, WhatsApp, Instagram…).
// Computers: copy the link instead.
export async function shareBuild(config: GloveConfig) {
  const url = buildUrl(config)
  const isPhone = window.matchMedia('(pointer: coarse)').matches

  if (isPhone && 'share' in navigator) {
    try {
      await navigator.share({ title: 'Poyan Fight Co gloves', text: 'Check out the gloves I built', url })
      return 'shared'
    } catch (error) {
      // They closed the share menu without picking anything. That's fine, do nothing.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Anything else: fall through and copy the link instead
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}