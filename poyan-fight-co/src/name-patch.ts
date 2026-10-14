import * as THREE from 'three'

// Same shape as the patch on the model: 49 mm wide, 36 mm tall
const WIDTH = 1024
const HEIGHT = 740
const FONT = 'Anton, Impact, sans-serif'

function makeCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas not supported')
  return { canvas, ctx }
}

// Paints the customer's name onto the wrist patch, made to look embroidered
export function createNamePatch() {
  const colour = makeCanvas()    // what you see
  const bump = makeCanvas()      // black = flat, white = raised. Gives the stitching some depth.
  const letters = makeCanvas()   // scratch canvas: only the letters, transparent everywhere else

  const map = new THREE.CanvasTexture(colour.canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.flipY = false     // glTF UVs start at the top-left, same as a canvas, so don't flip
  map.anisotropy = 8    // keeps the text sharp when seen at an angle

  const bumpMap = new THREE.CanvasTexture(bump.canvas)
  bumpMap.flipY = false

  // Letters with thin diagonal "thread" lines, drawn on the scratch canvas
  function paintLetters(text: string, size: number, fill: string) {
    const ctx = letters.ctx
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.font = `${size}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    // Centre the capitals exactly, using the measured height of the actual letters
    const m = ctx.measureText(text)
    const y = HEIGHT / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
    ctx.fillStyle = fill
    ctx.fillText(text, WIDTH / 2, y)

    // 'source-atop' only draws where something is already drawn, so the lines stay inside the letters
    ctx.globalCompositeOperation = 'source-atop'
    ctx.lineWidth = 3
    for (let x = -HEIGHT; x < WIDTH; x += 9) {
      ctx.strokeStyle = 'rgb(0 0 0 / 0.25)'
      ctx.beginPath()
      ctx.moveTo(x, HEIGHT)
      ctx.lineTo(x + HEIGHT * 0.6, 0)
      ctx.stroke()
      ctx.strokeStyle = 'rgb(255 255 255 / 0.2)'
      ctx.beginPath()
      ctx.moveTo(x + 4, HEIGHT)
      ctx.lineTo(x + 4 + HEIGHT * 0.6, 0)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  // Dashed stitching around the edge, like a real patch
  function paintBorder(ctx: CanvasRenderingContext2D, stroke: string) {
    ctx.save()
    ctx.strokeStyle = stroke
    ctx.lineWidth = 6
    ctx.setLineDash([16, 10])
    ctx.strokeRect(WIDTH * 0.11, HEIGHT * 0.1, WIDTH * 0.78, HEIGHT * 0.8)
    ctx.restore()
  }

  function draw(name: string, background: string, thread: string) {
    const text = name.trim().toUpperCase()

    // The fabric
    colour.ctx.fillStyle = background
    colour.ctx.fillRect(0, 0, WIDTH, HEIGHT)
    bump.ctx.fillStyle = '#000'
    bump.ctx.fillRect(0, 0, WIDTH, HEIGHT)

    paintBorder(colour.ctx, thread)
    paintBorder(bump.ctx, '#888')

    if (text) {
      // Start big, then shrink to fit long names inside the border
      let size = HEIGHT * 0.5
      letters.ctx.font = `${size}px ${FONT}`
      const maxWidth = WIDTH * 0.66
      const width = letters.ctx.measureText(text).width
      if (width > maxWidth) size *= maxWidth / width

      // Colour: thread-coloured letters with a soft shadow underneath
      paintLetters(text, size, thread)
      colour.ctx.save()
      colour.ctx.shadowColor = 'rgb(0 0 0 / 0.35)'
      colour.ctx.shadowBlur = 6
      colour.ctx.shadowOffsetY = 3
      colour.ctx.drawImage(letters.canvas, 0, 0)
      colour.ctx.restore()

      // Bump: the same letters in white, so they catch the light as if raised
      paintLetters(text, size, '#fff')
      bump.ctx.drawImage(letters.canvas, 0, 0)
    }

    // Tell Three.js the canvases changed, so it sends them to the GPU again
    map.needsUpdate = true
    bumpMap.needsUpdate = true
  }

  return { map, bumpMap, draw }
}