export const LEATHER_COLOURS = {
    red: '#c3142d',
    black: '#1b1b20',
    white: '#f2efe8',
    royal: '#1f3c9c',
    gold: '#c79a2c',
} as const 

export const SEAL_COLOURS = {
  black: '#16161a',
  white: '#f2efe8',
  red: '#c3142d',
} as const

export const LETTERING_COLOURS = {
  gold: '#d4a72c',
  silver: '#c9ccd3',
  white: '#ffffff',
  black: '#16161a',
} as const

export const FINISHES = ['matte', 'gloss'] as const
export const WEIGHTS = [10, 12, 14, 16] as const

export type LeatherColour = keyof typeof LEATHER_COLOURS
export type SealColour = keyof typeof SEAL_COLOURS
export type LetteringColour = keyof typeof LETTERING_COLOURS
export type Finish = (typeof FINISHES)[number]
export type Weight = (typeof WEIGHTS)[number]

export interface GloveConfig {
  leather: LeatherColour
  finish: Finish
  seal: SealColour
  lettering: LetteringColour
  weight: Weight
  name: string
}

export const DEFAULT_CONFIG: GloveConfig = {
  leather: 'red',
  finish: 'matte',
  seal: 'black',
  lettering: 'gold',
  weight: 14,
  name: '',
}