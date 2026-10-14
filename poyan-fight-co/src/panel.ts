import {
  LEATHER_COLOURS, SEAL_COLOURS, LETTERING_COLOURS, FINISHES, WEIGHTS, GLOSS_EXTRA,
  NAME_EXTRA, NAME_MAX, keysOf,
  type GloveConfig,
} from './config'
import { formatPrice } from './price'

// 'royal' -> 'Royal', 14 -> '14'
function label(value: string | number) {
  const text = String(value)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Everything one section needs. Named settings read better than six arguments in a row.
interface SectionOptions<T extends string | number> {
  title: string
  values: readonly T[]
  current: T
  onPick: (value: T) => void
  text?: (value: T) => string     // what the button and heading say. Default: 'royal' -> 'Royal'
  swatch?: (value: T) => string   // give a colour for round swatches. Leave out for text buttons.
}

// One option section: a heading, the name of the current pick, and a row of buttons
function section<T extends string | number>({
  title, values, current, onPick, text = label, swatch,
}: SectionOptions<T>) {
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
    button.title = text(value)

    if (swatch) {
      button.className = 'swatch'
      button.style.setProperty('--swatch', swatch(value))
      button.setAttribute('aria-label', `${title}: ${text(value)}`)
    } else {
      button.className = 'pill'
      button.textContent = text(value)
    }

    button.addEventListener('click', () => {
      showPicked(value)
      onPick(value)
    })
    return button
  })


  function showPicked(value: T) {
    picked.textContent = text(value)
    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(values[i] === value))
    })
  }

  row.append(...buttons)
  wrap.append(heading, row)
  showPicked(current)
  return wrap
}

function nameSection(config: GloveConfig, onChange: () => void) {
  const wrap = document.createElement('section')
  wrap.className = 'option'

  const heading = document.createElement('h2')
  heading.className = 'option-title'
  const extra = document.createElement('span')
  extra.className = 'option-picked'
  extra.textContent = `+${formatPrice(NAME_EXTRA)}`
  heading.append('Name', extra)

  const input = document.createElement('input')
  input.id = 'name-input'        
  input.className = 'name-input'
  input.type = 'text'
  input.maxLength = NAME_MAX
  input.placeholder = 'Add your name'
  input.autocomplete = 'off'
  input.spellcheck = false
  input.enterKeyHint = 'done'
  input.value = config.name
  input.setAttribute('aria-label', 'Name embroidered on the wrist patch')

  // 'input' fires on every key press, so the glove updates while you type
  input.addEventListener('input', () => {
    config.name = input.value
    onChange()
  })

  // Enter / Done closes the keyboard, which sends the camera back
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur()
  })

  const hint = document.createElement('p')
  hint.className = 'option-hint'
  hint.textContent = `Embroidered on the wrist patch. Up to ${NAME_MAX} letters.`

  wrap.append(heading, input, hint)
  return wrap
}

// Builds every section into the panel. Each button updates the config, then calls onChange.
export function buildPanel(root: HTMLElement, config: GloveConfig, onChange: () => void) {
  root.append(
    section({
      title: 'Leather',
      values: keysOf(LEATHER_COLOURS),
      current: config.leather,
      swatch: (value) => LEATHER_COLOURS[value],
      onPick: (value) => { config.leather = value; onChange() },
    }),

    section({
      title: 'Finish',
      values: FINISHES,
      current: config.finish,
      text: (value) => value === 'gloss' ? `Gloss +${formatPrice(GLOSS_EXTRA)}` : 'Matte',
      onPick: (value) => { config.finish = value; onChange() },
    }),

    section({
      title: 'Seal',
      values: keysOf(SEAL_COLOURS),
      current: config.seal,
      swatch: (value) => SEAL_COLOURS[value],
      onPick: (value) => { config.seal = value; onChange() },
    }),

    section({
      title: 'Lettering',
      values: keysOf(LETTERING_COLOURS),
      current: config.lettering,
      swatch: (value) => LETTERING_COLOURS[value],
      onPick: (value) => { config.lettering = value; onChange() },
    }),

    section({
      title: 'Weight',
      values: WEIGHTS,
      current: config.weight,
      text: (value) => `${value} oz`,
      onPick: (value) => { config.weight = value; onChange() },
    }),

    nameSection(config, onChange),
  )
}