import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { JSDOM } from 'jsdom';
import { createCanvas } from 'canvas';

// Patch global objects for Three.js in a Node context
const { window } = new JSDOM();
global.window = window;
global.document = window.document;
global.THREE = THREE;
global.HTMLCanvasElement = createCanvas;
global.Image = window.Image;

export async function generateThumbnail(glbPath, thumbnailPath) {
    const width = 256;
    const height = 256;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(path.resolve(glbPath));
    scene.add(gltf.scene);

    renderer.render(scene, camera);

    const buffer = renderer.domElement.toBuffer('image/png');
    fs.writeFileSync(path.resolve(thumbnailPath), buffer);
}
