import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { UNITS, formatLength } from '../config/units.js';
import { MeasurementTool } from '../tools/MeasurementTool.js';

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach((item) => item.dispose());
    else child.material?.dispose();
  });
}

function collectStats(object) {
  const materials = new Set();
  let meshes = 0;
  let triangles = 0;

  object.traverse((child) => {
    if (!child.isMesh) return;
    meshes += 1;
    const geometry = child.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : (geometry.attributes.position?.count ?? 0) / 3;
    const items = Array.isArray(child.material) ? child.material : [child.material];
    items.filter(Boolean).forEach((item) => materials.add(item));
    child.castShadow = true;
    child.receiveShadow = true;
  });

  return { meshes, triangles: Math.round(triangles), materials: materials.size };
}

export class Viewer {
  constructor(container, { onScaleChange = () => {} } = {}) {
    this.container = container;
    this.onScaleChange = onScaleChange;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#bfc0bc');
    this.scene.fog = new THREE.Fog('#bfc0bc', 18, 42);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.0001, 5000);
    this.camera.position.set(3.2, 2.5, 3.7);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute('aria-label', '三维模型视图');
    this.container.prepend(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.001;
    this.controls.maxDistance = 1500;
    this.controls.addEventListener('change', () => this.updateScaleRuler());

    this.sourceUnit = 'mm';
    this.userScale = 1;
    this.rawSize = new THREE.Vector3(1, 1, 1);
    this.modelRoot = null;
    this.modelObject = null;
    this.boundsHelper = null;
    this.gridVisible = true;
    this.boundsVisible = true;
    this.wireframe = false;

    this.setupEnvironment();
    this.measurement = new MeasurementTool(this.scene);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.onCanvasClick = (event) => this.measurement.pick(event, this.camera, this.modelRoot, this.renderer.domElement.getBoundingClientRect());
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);

    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
    this.resize();
  }

  setupEnvironment() {
    const hemisphere = new THREE.HemisphereLight('#f5f4eb', '#555a57', 2.1);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight('#fff3dd', 4.2);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 45;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0004;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight('#bdded5', 1.7);
    rim.position.set(-5, 3, -4);
    this.scene.add(rim);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ color: '#252726', opacity: 0.16 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.0005;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.grid = new THREE.GridHelper(10, 20, '#747873', '#9fa19d');
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.52;
    this.grid.position.y = 0.0002;
    this.scene.add(this.grid);
  }

  setModel(object, { sourceUnit = 'mm' } = {}) {
    this.removeCurrentModel();
    this.sourceUnit = sourceUnit;
    this.userScale = 1;

    object.updateMatrixWorld(true);
    const originalBounds = new THREE.Box3().setFromObject(object);
    if (originalBounds.isEmpty()) throw new Error('模型中没有可显示的几何体。');
    originalBounds.getSize(this.rawSize);
    const center = originalBounds.getCenter(new THREE.Vector3());

    this.modelRoot = new THREE.Group();
    this.modelRoot.name = 'ModelRoot';
    this.modelObject = object;
    object.position.x -= center.x;
    object.position.y -= originalBounds.min.y;
    object.position.z -= center.z;
    this.modelRoot.add(object);
    this.scene.add(this.modelRoot);

    this.boundsHelper = new THREE.BoxHelper(this.modelRoot, '#ff6a2b');
    this.boundsHelper.material.transparent = true;
    this.boundsHelper.material.opacity = 0.9;
    this.boundsHelper.material.depthTest = false;
    this.boundsHelper.renderOrder = 10;
    this.scene.add(this.boundsHelper);

    this.applyScale(false);
    this.setWireframe(this.wireframe);
    const physicalSize = this.getDimensionsMeters();
    this.measurement.setMarkerRadius(Math.max(physicalSize.x, physicalSize.y, physicalSize.z) * 0.009);
    this.fitToModel();
    return collectStats(object);
  }

  removeCurrentModel() {
    this.measurement.clear();
    if (this.boundsHelper) {
      this.scene.remove(this.boundsHelper);
      disposeObject(this.boundsHelper);
      this.boundsHelper = null;
    }
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      disposeObject(this.modelRoot);
      this.modelRoot = null;
      this.modelObject = null;
    }
  }

  setSourceUnit(unit) {
    if (!UNITS[unit]) return;
    this.sourceUnit = unit;
    this.measurement.setUnit(unit);
    this.applyScale();
    this.fitToModel();
  }

  setUserScale(scale) {
    this.userScale = THREE.MathUtils.clamp(Number(scale) || 1, 0.01, 100);
    this.measurement.clear();
    this.applyScale();
  }

  applyScale(notify = true) {
    if (!this.modelRoot) return;
    const worldScale = UNITS[this.sourceUnit].meters * this.userScale;
    this.modelRoot.scale.setScalar(worldScale);
    this.modelRoot.updateMatrixWorld(true);
    this.boundsHelper?.update();
    const dimensions = this.getDimensionsMeters();
    this.measurement.setMarkerRadius(Math.max(dimensions.x, dimensions.y, dimensions.z) * 0.009);
    this.configureGrid(dimensions);
    if (notify) this.onScaleChange(dimensions);
  }

  configureGrid(size) {
    const maxDimension = Math.max(size.x, size.z, 0.001);
    const magnitude = 10 ** Math.floor(Math.log10(maxDimension));
    const gridSize = Math.max(magnitude * 10, maxDimension * 5);
    this.grid.scale.setScalar(gridSize / 10);
  }

  getDimensionsMeters() {
    return this.rawSize.clone().multiplyScalar(UNITS[this.sourceUnit].meters * this.userScale);
  }

  fitToModel() {
    if (!this.modelRoot) return;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.001);
    const direction = new THREE.Vector3(1.15, 0.82, 1.25).normalize();
    const distance = this.getFitDistance(radius, 1.18);
    this.camera.position.copy(sphere.center).addScaledVector(direction, distance);
    this.camera.near = Math.max(radius / 1000, 0.00001);
    this.camera.far = Math.max(radius * 100, 10);
    this.camera.up.set(0, 1, 0);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(sphere.center);
    this.controls.minDistance = radius * 0.04;
    this.controls.maxDistance = radius * 30;
    this.controls.update();
    this.updateScaleRuler();
  }

  setView(view) {
    if (!this.modelRoot) return;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const distance = this.getFitDistance(Math.max(sphere.radius, 0.001), 1.25);
    const directions = {
      iso: new THREE.Vector3(1, 0.8, 1),
      top: new THREE.Vector3(0, 1, 0.001),
      front: new THREE.Vector3(0, 0.12, 1),
    };
    const direction = directions[view]?.normalize() ?? directions.iso.normalize();
    this.camera.up.set(0, 1, view === 'top' ? -0.001 : 0);
    if (view === 'top') this.camera.up.set(0, 0, -1);
    this.camera.position.copy(sphere.center).addScaledVector(direction, distance);
    this.controls.target.copy(sphere.center);
    this.controls.update();
  }

  getFitDistance(radius, padding) {
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    return radius / Math.sin(limitingFov / 2) * padding;
  }

  setMeasureEnabled(enabled) {
    this.measurement.setEnabled(enabled);
    this.controls.enabled = !enabled;
    this.renderer.domElement.classList.toggle('is-measuring', enabled);
  }

  setGridVisible(visible) {
    this.gridVisible = visible;
    this.grid.visible = visible;
    this.ground.visible = visible;
  }

  setBoundsVisible(visible) {
    this.boundsVisible = visible;
    if (this.boundsHelper) this.boundsHelper.visible = visible;
  }

  setWireframe(enabled) {
    this.wireframe = enabled;
    this.modelObject?.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.filter(Boolean).forEach((item) => {
        item.wireframe = enabled;
        item.needsUpdate = true;
      });
    });
  }

  updateScaleRuler() {
    const height = this.container.clientHeight || 1;
    const distance = this.camera.position.distanceTo(this.controls.target);
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance;
    const metersPerPixel = visibleHeight / height;
    const raw = metersPerPixel * 110;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
    const normalized = raw / magnitude;
    const nice = (normalized < 2 ? 1 : normalized < 5 ? 2 : 5) * magnitude;
    this.onScaleChange(this.getDimensionsMeters(), {
      label: formatLength(nice, this.sourceUnit),
      width: THREE.MathUtils.clamp(nice / metersPerPixel, 45, 180),
    });
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.updateScaleRuler();
  }

  async capture() {
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve) => this.renderer.domElement.toBlob(resolve, 'image/png'));
  }

  animate() {
    this.controls.update();
    if (this.boundsHelper?.visible) this.boundsHelper.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.renderer.setAnimationLoop(null);
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    this.measurement.dispose();
    this.removeCurrentModel();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
