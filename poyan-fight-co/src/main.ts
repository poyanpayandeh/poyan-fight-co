import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

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

// Screen size
const sizes = { width: window.innerWidth, height: window.innerHeight }

// Camera: front-left, so you see the wordmark and the thumb
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

// Load the glove
const loader = new GLTFLoader()
loader.load(
  '/models/glove.glb',
  (gltf) => {
    const glove = gltf.scene

    // Velcro cuff shows by default. Hiding the lace cuff also hides its name label.
    const laceCuff = glove.getObjectByName('zone_cuff_lace')
    if (laceCuff) laceCuff.visible = false

    // Every part casts and receives shadows
    glove.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

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