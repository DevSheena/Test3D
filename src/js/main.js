import '../css/main.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ---- Scene Setup ----
const scene = new THREE.Scene();
scene.background = new THREE.Color('#202020');

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(10, 10, 10);

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// ---- Lighting ----
const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 10.5);
dirLight.position.set(10, 20, 10); 
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 4096; 
dirLight.shadow.mapSize.height = 4096;
const d = 50; 
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.camera.far = 1000;
dirLight.shadow.bias = -0.0001; 
scene.add(dirLight);

// ---- Model Management ----
let currentModel = null;
const loader = new GLTFLoader();

function loadModel(path) {
    // 1. Cleanup previous model
    if (currentModel) {
        scene.remove(currentModel);
        // Traverse and dispose geometries/materials to prevent memory leaks
        currentModel.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        currentModel = null;
    }

    // 2. Load New Model
    loader.load(
        path,
        (gltf) => {
            const model = gltf.scene;
            currentModel = model;

            // Calculate Initial Size
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Scale Model to Target Size (10)
            const targetSize = 10;
            if (maxDim > 0) {
                const scaleFactor = targetSize / maxDim;
                model.scale.setScalar(scaleFactor);
            }
            
            // Re-calculate Box & Center AFTER Scaling
            model.updateMatrixWorld(true);
            const scaledBox = new THREE.Box3().setFromObject(model);
            const center = scaledBox.getCenter(new THREE.Vector3());
            
            // Center the Model
            model.position.sub(center);

            // Setup Shadows/Materials
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if(child.material) {
                        child.material.side = THREE.DoubleSide;
                        child.material.depthWrite = true;
                        if (child.material.transparent) {
                           child.material.transparent = false;
                           child.material.alphaTest = 0.5; 
                        }
                    }
                    child.frustumCulled = false; 
                }
            });
            scene.add(model);

            // ---- Camera Adjustment ----
            if (path.includes('smoking_room')) {
                // Smoking Room
                camera.position.set(1, 0, 1);
            } else {
                // Default for Tiny Room
                camera.position.set(10, 10, 10);
            }
            controls.target.set(0, 0, 0);
            controls.update();
        },
        (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
        (error) => { console.error('An error happened', error); }
    );
}

// ---- UI Interaction ----
const select = document.getElementById('model-select');
if (select) {
    // Load initial
    loadModel(select.value);
    
    // Change listener
    select.addEventListener('change', (e) => {
        loadModel(e.target.value);
    });
}

// ---- Controls ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0); // Explicitly look at origin

// ---- Resize ----
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Animation ----
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();