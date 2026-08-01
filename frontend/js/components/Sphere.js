// frontend/js/components/Sphere.js
// 🎯 Esfera 3D interactiva

import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';

export class Sphere {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sphere = null;
    this.particles = null;
    this.ring = null;
    this.analyser = null;
    this.freqData = null;
    this.audioActive = false;
    
    this.init();
  }

  init() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1e);
    
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.createSphere();
    this.createParticles();
    this.createRing();
    this.createLights();
    
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
    
    state.subscribe((event, data) => {
      if (event === 'themeChange') {
        this.updateTheme(data.themeName);
      }
    });
  }

  createSphere() {
    const geometry = new THREE.IcosahedronGeometry(1.8, 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.15,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);
  }

  createParticles() {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const radius = 2.2 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      colors[i * 3] = 0.2 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      
      sizes[i] = 0.02 + Math.random() * 0.04;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  createRing() {
    const geometry = new THREE.TorusGeometry(2.1, 0.015, 16, 100);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.3
    });
    
    this.ring = new THREE.Mesh(geometry, material);
    this.ring.rotation.x = Math.PI / 2;
    this.scene.add(this.ring);
  }

  createLights() {
    const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
    light1.position.set(1, 1, 1);
    this.scene.add(light1);
    
    const light2 = new THREE.DirectionalLight(0x00e5ff, 0.4);
    light2.position.set(-1, -1, -1);
    this.scene.add(light2);
    
    const ambient = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambient);
  }

  updateTheme(themeName) {
    const theme = CONFIG.themes[themeName] || CONFIG.themes.JARVIS;
    const color = new THREE.Color(theme.accent);
    
    if (this.sphere) {
      this.sphere.material.color.copy(color);
      this.sphere.material.emissive.copy(color);
    }
    
    if (this.ring) {
      this.ring.material.color.copy(color);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    const time = Date.now() * 0.001;
    
    if (this.sphere) {
      this.sphere.rotation.x += 0.002;
      this.sphere.rotation.y += 0.005;
      this.sphere.rotation.z += 0.001;
    }
    
    if (this.particles) {
      this.particles.rotation.y += 0.0005;
      this.particles.rotation.x = Math.sin(time * 0.1) * 0.02;
    }
    
    if (this.ring) {
      this.ring.rotation.z = Math.sin(time * 0.2) * 0.1;
      this.ring.rotation.y += 0.003;
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}