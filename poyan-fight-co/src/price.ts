import { WEIGHT_PRICES, GLOSS_EXTRA, NAME_EXTRA, type GloveConfig } from './config'

// Works out the total from the config. Nothing else in the app does price maths.
export function getPrice(config: GloveConfig) {
  let price = WEIGHT_PRICES[config.weight]
  if (config.finish === 'gloss') price += GLOSS_EXTRA
  if (config.name.trim() !== '') price += NAME_EXTRA
  return price
}

// 169 -> '$169'. Intl handles currency symbols and commas for us.
const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPrice(amount: number) {
  return nzd.format(amount)
}