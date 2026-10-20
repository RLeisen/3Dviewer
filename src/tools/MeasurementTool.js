import * as THREE from 'three';
import { formatLength } from '../config/units.js';

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach((item) => item.dispose());
    else child.material?.dispose();
    child.material?.map?.dispose();
  });
}

function createLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(18, 20, 20, 0.92)';
  context.beginPath();
  context.roundRect(8, 8, 496, 112, 18);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '600 42px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(0.5, 0.125, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export class MeasurementTool {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'Measurements';
    scene.add(this.group);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.enabled = false;
    this.unit = 'mm';
    this.firstPoint = null;
    this.markerRadius = 0.012;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.cancelPending();
  }

  setUnit(unit) {
    this.unit = unit;
    this.clear();
  }

  setMarkerRadius(radius) {
    this.markerRadius = THREE.MathUtils.clamp(radius, 0.0005, 0.08);
  }

  pick(event, camera, target, bounds) {
    if (!this.enabled || !target) return false;
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, camera);
    const hit = this.raycaster.intersectObject(target, true).find((item) => item.object.visible);
    if (!hit) return false;

    if (!this.firstPoint) {
      this.firstPoint = hit.point.clone();
      this.group.add(this.createMarker(this.firstPoint, true));
      return true;
    }

    const secondPoint = hit.point.clone();
    this.group.add(this.createMarker(secondPoint, false));
    this.addMeasurement(this.firstPoint, secondPoint);
    this.firstPoint = null;
    return true;
  }

  createMarker(position, pending) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(this.markerRadius, 18, 12),
      new THREE.MeshBasicMaterial({ color: '#ff6a2b', depthTest: false }),
    );
    marker.position.copy(position);
    marker.renderOrder = 21;
    marker.userData.pendingMarker = pending;
    return marker;
  }

  addMeasurement(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: '#ff6a2b', depthTest: false, transparent: true, opacity: 0.95 }),
    );
    line.renderOrder = 20;
    this.group.add(line);

    const label = createLabel(formatLength(start.distanceTo(end), this.unit));
    label.position.copy(start).lerp(end, 0.5);
    label.position.y += this.markerRadius * 3;
    this.group.add(label);
  }

  cancelPending() {
    if (!this.firstPoint) return;
    const pending = [...this.group.children].reverse().find((child) => child.userData.pendingMarker);
    if (pending) {
      this.group.remove(pending);
      disposeObject(pending);
    }
    this.firstPoint = null;
  }

  clear() {
    this.firstPoint = null;
    while (this.group.children.length) {
      const child = this.group.children[0];
      this.group.remove(child);
      disposeObject(child);
    }
  }

  dispose() {
    this.clear();
    this.group.removeFromParent();
  }
}
