import {
  LEATHER_COLOURS, SEAL_COLOURS, LETTERING_COLOURS, FINISHES,
  type GloveConfig,
} from './config'


function label(value: string | number) {
  const text = String(value)
  return text.charAt(0).toUpperCase() + text.slice(1)
}


function keysOf<T extends string>(colours: Readonly<Record<T, string>>) {
  return Object.keys(colours) as T[]
}

function section<T extends string | number>(
  title: string,
  values: readonly T[],
  current: T,
  onPick: (value: T) => void,
  swatch?: (value: T) => string,
) {
  const wrap = document.createElement('section')
  wrap.className = 'option'

  const heading = document.createElement('h2')
  heading.className = 'option-title'
  const picked = document.createElement('span')
  picked.className = 'option-picked'
  heading.append(title, picked)

  const row = document.createElement('div')
  row.className = 'option-row'

  const buttons = values.map((value) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.title = label(value)

    if (swatch) {
      button.className = 'swatch'
      button.style.setProperty('--swatch', swatch(value))
      button.setAttribute('aria-label', `${title}: ${label(value)}`)
    } else {
      button.className = 'pill'
      button.textContent = label(value)
    }

    button.addEventListener('click', () => {
      showPicked(value)
      onPick(value)
    })
    return button
  })

  // Highlight the picked button and write its name next to the heading
  function showPicked(value: T) {
    picked.textContent = label(value)
    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(values[i] === value))
    })
  }

  row.append(...buttons)
  wrap.append(heading, row)
  showPicked(current)
  return wrap
}

// Builds every section into the panel. Each button updates the config, then calls onChange.
export function buildPanel(root: HTMLElement, config: GloveConfig, onChange: () => void) {
  root.append(
    section('Leather', keysOf(LEATHER_COLOURS), config.leather,
      (value) => { config.leather = value; onChange() },
      (value) => LEATHER_COLOURS[value]),

    section('Finish', FINISHES, config.finish,
      (value) => { config.finish = value; onChange() }),

    section('Seal', keysOf(SEAL_COLOURS), config.seal,
      (value) => { config.seal = value; onChange() },
      (value) => SEAL_COLOURS[value]),

    section('Lettering', keysOf(LETTERING_COLOURS), config.lettering,
      (value) => { config.lettering = value; onChange() },
      (value) => LETTERING_COLOURS[value]),
  )
}