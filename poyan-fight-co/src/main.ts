import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// Canvas
const canvas = document.querySelector<HTMLCanvasElement>('canvas.webgl')
if (!canvas) throw new Error('Canvas element not found')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#e9e6e1')

// capsule placeholder untill glove is ready
// const placeholder = new THREE.Mesh(
//   new THREE.CapsuleGeometry(0.5, 0.6, 8, 24),
//   new THREE.MeshStandardMaterial({ color: '#c3142d', roughness: 0.5 })
// )
// placeholder.position.y = 0.8 // lift it so it sits on the floor
// scene.add(placeholder)

// load in glove
const loader = new GLTFLoader()
loader.load(
  'models/glove.glb', (gltf) => {
    const glove = gltf.scene
    
    const laceCuff = glove.getObjectByName('zone_cuff_lace')
    if (laceCuff) laceCuff.visible=false

    scene.add(glove)
  },
  undefined,
  (error) => console.error("Could not load the glove:", error)
)


// Floor
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(3,64),
  new THREE.MeshStandardMaterial({color: '#d8d4cd', roughness: 1})
)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

// Lighting
const ambient = new THREE.AmbientLight('#ffffff', 0.6)
scene.add(ambient)
const key = new THREE.DirectionalLight('#ffffff', 2.5)
key.position.set(3,4,2)
scene.add(key)

// Screen size
const sizes = {width: window.innerWidth, height: window.innerHeight }

// Camera
const camera = new THREE.PerspectiveCamera(40, sizes.width / sizes.height, 0.1, 50)
camera.position.set(2.5, 1.8, 3.5)
scene.add(camera)

// Controls: drag to spin, scroll or pinch to zoom
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.8, 0)                 // orbit around the glove, not the floor
controls.enableDamping = true                  // smooth glide after you let go
controls.enablePan = false                     // stop people dragging the glove off screen
controls.minDistance = 2                       // closest zoom
controls.maxDistance = 7                       // furthest zoom
controls.maxPolarAngle = Math.PI / 2 - 0.05    // stop just above the floor
controls.update()

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Account for resize
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Update every frame
renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})
