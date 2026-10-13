import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  DEFAULT_CONFIG, LEATHER_COLOURS, SEAL_COLOURS, LETTERING_COLOURS,
  type GloveConfig,
} from './config'
import { buildPanel } from './panel'

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

// Camera
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

// Soft studio reflections
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
pmrem.dispose()   // only needed to build the environment, so free it straight away


const config: GloveConfig = { ...DEFAULT_CONFIG }


const materials = new Map<string, THREE.MeshStandardMaterial>()


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

 
  const brightness = new Float32Array(width * height)
  for (let i = 0; i < brightness.length; i++) {
    brightness[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]
  }

  
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
  texture.flipY = map.flipY        
  texture.wrapS = map.wrapS
  texture.wrapT = map.wrapT
  texture.channel = map.channel    
  texture.needsUpdate = true

  material.map = texture
  map.dispose()                    
}

// push the config onto the glove's materials
function applyConfig() {
  const leather = materials.get('boxing_gloves')
  if (leather) {
    leather.color.set(LEATHER_COLOURS[config.leather])
    leather.roughness = config.finish === 'gloss' ? 0.25 : 0.65
  }
  materials.get('zone_badge')?.color.set(SEAL_COLOURS[config.seal])
  materials.get('zone_logo')?.color.set(LETTERING_COLOURS[config.lettering])
}

// the options panel
const options = document.querySelector<HTMLElement>('#options')
if (options) buildPanel(options, config, applyConfig)

// how far the camera sits depends on the canvas shape
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

// runs whenever the layout cvhanges
new ResizeObserver(resize).observe(canvas)


// load glove
const loader = new GLTFLoader()
loader.load(
  '/models/glove.glb',
  (gltf) => {
    const glove = gltf.scene

    // cast and recieve shadows, grabs materials
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

    makeTintable(materials.get('boxing_gloves'))
    applyConfig()

    // point the camera at the centre of the glove
    const box = new THREE.Box3().setFromObject(glove)
    box.getCenter(controls.target)
    gloveRadius = box.getBoundingSphere(new THREE.Sphere()).radius
    fitCamera()

    scene.add(glove)
  },
  undefined,
  (error) => console.error('Could not load the glove:', error)
)

// update every frame
renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})