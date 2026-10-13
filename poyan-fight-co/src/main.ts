import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import GUI from 'lil-gui'
import {
  DEFAULT_CONFIG, LEATHER_COLOURS, SEAL_COLOURS, LETTERING_COLOURS, FINISHES,
  type GloveConfig,
} from './config'

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

// Lighting: one key light that casts a soft shadow
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

// Screen size
const sizes = { width: window.innerWidth, height: window.innerHeight }

// Camera: front-right, so you see the seal and the thumb (left-hand glove)
const camera = new THREE.PerspectiveCamera(40, sizes.width / sizes.height, 0.1, 50)
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
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.NeutralToneMapping   // keeps product colours true
renderer.shadowMap.enabled = true

// Soft studio reflections, generated in code so there's no file to download
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
pmrem.dispose()   // only needed to build the environment, so free it straight away

// ---------- Configurator ----------

// The customer's current choices. Everything reads from this.
const config: GloveConfig = { ...DEFAULT_CONFIG }

// Glove materials, found by the names we gave them in Blender
const materials = new Map<string, THREE.MeshStandardMaterial>()

// Turn a colour texture into a black-and-white one, so material.color can tint it
function makeTintable(material: THREE.MeshStandardMaterial) {
  const map = material.map
  if (!map) return
  const img = map.image as ImageBitmap | HTMLImageElement
  const { width, height } = img

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, width, height)
  const px = data.data   // r, g, b, a, r, g, b, a, ...

  // How bright each pixel is (the same weights your eye uses)
  const lum = new Float32Array(width * height)
  for (let i = 0; i < lum.length; i++) {
    lum[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]
  }

  // The leather's normal brightness becomes pure white, so a tint shows its true colour
  const sorted = Float32Array.from(lum).sort()
  const leatherLevel = sorted[Math.floor(sorted.length * 0.9)] || 1
  for (let i = 0; i < lum.length; i++) {
    const v = Math.min(255, (lum[i] / leatherLevel) * 255)
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v
  }
  ctx.putImageData(data, 0, 0)

  const grey = new THREE.CanvasTexture(canvas)
  grey.colorSpace = THREE.SRGBColorSpace
  grey.flipY = map.flipY        // glTF textures aren't flipped, so match the original
  grey.wrapS = map.wrapS
  grey.wrapT = map.wrapT
  grey.channel = map.channel
  material.map = grey
  material.needsUpdate = true
  map.dispose()                 // free the old red texture
}

// Make the glove match the config
function applyConfig() {
  const leather = materials.get('boxing_gloves')
  if (leather) {
    leather.color.set(LEATHER_COLOURS[config.leather])
    leather.roughness = config.finish === 'gloss' ? 0.25 : 0.65
  }
  materials.get('zone_badge')?.color.set(SEAL_COLOURS[config.seal])
  materials.get('zone_logo')?.color.set(LETTERING_COLOURS[config.lettering])
}

// Dev panel for testing. The real menus replace this later.
const gui = new GUI({ title: 'Config (dev)' })
gui.add(config, 'leather', Object.keys(LEATHER_COLOURS)).onChange(applyConfig)
gui.add(config, 'finish', [...FINISHES]).onChange(applyConfig)
gui.add(config, 'seal', Object.keys(SEAL_COLOURS)).onChange(applyConfig)
gui.add(config, 'lettering', Object.keys(LETTERING_COLOURS)).onChange(applyConfig)

// ---------- Camera fitting ----------

// How far the camera sits depends on the screen shape
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

// Keep everything correct when the window changes size
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  fitCamera()
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// ---------- Load the glove ----------

const loader = new GLTFLoader()
loader.load(
  '/models/glove.glb',
  (gltf) => {
    const glove = gltf.scene

    // Shadows on every part, and collect the materials by name
    glove.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const m of mats) {
          if (m instanceof THREE.MeshStandardMaterial) materials.set(m.name, m)
        }
      }
    })

    // Make the leather recolourable, then apply the starting choices
    const leatherMat = materials.get('boxing_gloves')
    if (leatherMat) makeTintable(leatherMat)
    applyConfig()

    // Point the camera at the centre of the glove, whatever its size
    const box = new THREE.Box3().setFromObject(glove)
    box.getCenter(controls.target)
    gloveRadius = box.getBoundingSphere(new THREE.Sphere()).radius
    fitCamera()

    scene.add(glove)
  },
  undefined,
  (error) => console.error('Could not load the glove:', error)
)

// Draw every frame
renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})