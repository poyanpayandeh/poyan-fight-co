import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  DEFAULT_CONFIG, LEATHER_COLOURS, SEAL_COLOURS, LETTERING_COLOURS, WEIGHT_SIZES,
  type GloveConfig,
} from './config'
import { buildPanel } from './panel'
import { getPrice, formatPrice } from './price'

// Canvas
const canvas = document.querySelector<HTMLCanvasElement>('canvas.webgl')
if (!canvas) throw new Error('Canvas element not found')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#e9e6e1')

// Floor: invisible except for the shadow it catches
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShadowMaterial({ opacity: 0.18 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

// Lighting
const key = new THREE.DirectionalLight('#ffffff', 1.5)
key.position.set(1, 2, 1.2)
key.castShadow = true
key.shadow.mapSize.set(1024, 1024)
key.shadow.camera.left = -0.35
key.shadow.camera.right = 0.35
key.shadow.camera.top = 0.35
key.shadow.camera.bottom = -0.35
key.shadow.camera.near = 0.5
key.shadow.camera.far = 5
key.shadow.radius = 4          // softens the shadow edge
key.shadow.normalBias = 0.002  // stops speckled "shadow acne" on the glove
scene.add(key)

// Camera: front-right, so you see the wordmark and the thumb on a left-hand glove
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)   // the real aspect is set in resize()
camera.position.set(0.3, 0.22, 0.48)
scene.add(camera)

// Controls: drag to spin, scroll or pinch to zoom
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.15, 0)                // updated to the glove's centre once it loads
controls.enableDamping = true                  // smooth glide after you let go
controls.enablePan = false                     // stop people dragging the glove off screen
controls.maxPolarAngle = Math.PI / 2 - 0.05    // stop just above the floor
controls.update()

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.toneMapping = THREE.NeutralToneMapping   // keeps product colours true
renderer.shadowMap.enabled = true

// Soft studio reflections, generated in code so there's no file to download
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
pmrem.dispose()   // only needed to build the environment, so free it straight away

// ---------- Configurator ----------

// The one source of truth. The panel changes it, applyConfig() shows it on the glove.
const config: GloveConfig = { ...DEFAULT_CONFIG }

// Glove materials by name, filled in when the model loads
const materials = new Map<string, THREE.MeshStandardMaterial>()

// The leather texture has red baked in, so a colour tint would mix with that red.
// This swaps in a greyscale copy, so material.color decides the final colour.
function makeTintable(material: THREE.MeshStandardMaterial | undefined) {
  const map = material?.map
  if (!material || !map) return
  const image = map.image
  if (!(image instanceof ImageBitmap || image instanceof HTMLImageElement)) return

  const { width, height } = image
  const copy = document.createElement('canvas')
  copy.width = width
  copy.height = height
  const ctx = copy.getContext('2d')
  if (!ctx) return
  ctx.drawImage(image, 0, 0)

  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data

  // Brightness of every pixel
  const brightness = new Float32Array(width * height)
  for (let i = 0; i < brightness.length; i++) {
    brightness[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]
  }

  // Scale so the leather comes out near white: the 90th-percentile brightness becomes 255
  const sorted = brightness.slice().sort()
  const bright = sorted[Math.floor(sorted.length * 0.9)] || 255

  for (let i = 0; i < brightness.length; i++) {
    const grey = Math.min(255, (brightness[i] / bright) * 255)
    data[i * 4] = grey
    data[i * 4 + 1] = grey
    data[i * 4 + 2] = grey
  }
  ctx.putImageData(pixels, 0, 0)

  const texture = new THREE.CanvasTexture(copy)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.flipY = map.flipY        // glTF textures are not flipped. Keep it that way.
  texture.wrapS = map.wrapS
  texture.wrapT = map.wrapT
  texture.channel = map.channel    // which UV set the texture uses
  texture.needsUpdate = true

  material.map = texture
  map.dispose()                    // the red original isn't needed any more
}

// Push the config onto the glove's materials
function applyConfig() {
  const leather = materials.get('boxing_gloves')
  if (leather) {
    leather.color.set(LEATHER_COLOURS[config.leather])
    leather.roughness = config.finish === 'gloss' ? 0.25 : 0.65
  }
  materials.get('zone_badge')?.color.set(SEAL_COLOURS[config.seal])
  materials.get('zone_logo')?.color.set(LETTERING_COLOURS[config.lettering])
}

// Show the live price. A quick pop when it changes, so the eye notices.
const priceEl = document.querySelector<HTMLElement>('#price')
let shownPrice = 0

function updatePrice() {
  const price = getPrice(config)
  if (!priceEl || price === shownPrice) return
  priceEl.textContent = formatPrice(price)
  if (shownPrice !== 0) {
    priceEl.animate(
      [{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
      { duration: 250, easing: 'ease-out' },
    )
  }
  shownPrice = price
}

// Anything that depends on the config gets updated here
function onConfigChange() {
  applyConfig()
  updatePrice()
}

// The options panel
const options = document.querySelector<HTMLElement>('#options')
if (options) buildPanel(options, config, onConfigChange)
updatePrice()

// Add to cart: there's no real shop behind this concept brand, so just confirm the click
const cartButton = document.querySelector<HTMLButtonElement>('#add-to-cart')
cartButton?.addEventListener('click', () => {
  cartButton.textContent = 'Added (demo)'
  cartButton.disabled = true
  setTimeout(() => {
    cartButton.textContent = 'Add to cart'
    cartButton.disabled = false
  }, 1800)
})

// ---------- Sizing ----------

// How far the camera sits depends on the canvas shape
let gloveRadius = 0.19   // replaced with the real size once the glove loads

function fitCamera() {
  const vFov = THREE.MathUtils.degToRad(camera.fov)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
  const fov = Math.min(vFov, hFov)                      // the narrower direction decides
  const distance = (gloveRadius * 1.1) / Math.sin(fov / 2)
  const direction = camera.position.clone().sub(controls.target).normalize()
  camera.position.copy(controls.target).addScaledVector(direction, distance)
  controls.minDistance = distance * 0.55
  controls.maxDistance = distance * 1.6
  controls.update()
}

// The canvas no longer fills the whole window (the panel takes some of it),
// so measure the canvas itself instead of the window
function resize() {
  const width = renderer.domElement.clientWidth
  const height = renderer.domElement.clientHeight
  if (width === 0 || height === 0) return

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  fitCamera()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)   // false = let the CSS decide the on-screen size
}

// Runs once now, then whenever the canvas changes size (window resize, phone rotation, layout change)
new ResizeObserver(resize).observe(canvas)

// ---------- Load the glove ----------

let glove: THREE.Group | null = null   // set once the model has loaded
const sizeAnchor = new THREE.Vector3()  // bottom centre of the glove. It grows and shrinks around this point.
let gloveSize = 1                       // current size. Eases towards the size for the chosen weight.

const loader = new GLTFLoader()
loader.load(
  '/models/glove.glb',
  (gltf) => {
    const model = gltf.scene

    // Every part casts and receives shadows. Collect the materials by name.
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const m of mats) {
          if (m instanceof THREE.MeshStandardMaterial) materials.set(m.name, m)
        }
      }
    })

    makeTintable(materials.get('boxing_gloves'))
    applyConfig()

    // Point the camera at the centre of the glove, whatever its size
    const box = new THREE.Box3().setFromObject(model)
    box.getCenter(controls.target)
    gloveRadius = box.getBoundingSphere(new THREE.Sphere()).radius
    fitCamera()

    // Size changes happen around the bottom centre, so the glove stays sitting on the floor
    box.getCenter(sizeAnchor)
    sizeAnchor.y = box.min.y

    scene.add(model)
    glove = model
  },
  undefined,
  (error) => console.error('Could not load the glove:', error)
)

// Draw every frame
let lastTime = 0

renderer.setAnimationLoop((time) => {
  const delta = Math.min((time - lastTime) / 1000, 0.1)   // seconds since the last frame
  lastTime = time

  // Ease the glove towards the size for the chosen weight.
  // Using delta keeps the speed the same on 60 Hz and 120 Hz screens.
  if (glove) {
    const target = WEIGHT_SIZES[config.weight]
    gloveSize += (target - gloveSize) * (1 - Math.exp(-10 * delta))
    glove.scale.setScalar(gloveSize)
    // Scaling happens around the model's origin, so move it back to keep sizeAnchor in place
    glove.position.copy(sizeAnchor).multiplyScalar(1 - gloveSize)
  }

  controls.update()
  renderer.render(scene, camera)
})