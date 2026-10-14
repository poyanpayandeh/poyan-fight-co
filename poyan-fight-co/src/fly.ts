import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// A camera spot: where the camera sits, what it looks at, and how close people may zoom from there
export interface View {
  position: THREE.Vector3
  target: THREE.Vector3
  minDistance: number
}

// Glides the camera smoothly to a View. Any drag by the user cancels the glide.
export function createFlyer(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  let goal: View | null = null
  let dragging = false

  controls.addEventListener('start', () => {
    dragging = true
    goal = null
  })
  controls.addEventListener('end', () => {
    dragging = false
  })

  return {
    // Where the camera is right now, so we can come back to it later
    current(): View {
      return {
        position: camera.position.clone(),
        target: controls.target.clone(),
        minDistance: controls.minDistance,
      }
    },

    flyTo(view: View) {
      if (dragging) return        // don't fight someone who is spinning the glove
      goal = view
      controls.minDistance = 0    // otherwise the zoom limit blocks the glide part-way
    },

    // Call every frame
    update(delta: number) {
      if (!goal) return
      const ease = 1 - Math.exp(-6 * delta)
      camera.position.lerp(goal.position, ease)
      controls.target.lerp(goal.target, ease)

      // Close enough: snap the last bit and put the zoom limit back
      if (camera.position.distanceTo(goal.position) < 0.0005) {
        camera.position.copy(goal.position)
        controls.target.copy(goal.target)
        controls.minDistance = goal.minDistance
        goal = null
      }
    },
  }
}