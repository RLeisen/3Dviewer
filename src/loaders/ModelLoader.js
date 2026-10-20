import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { SUPPORTED_FORMATS } from '../config/formats.js';

function extensionOf(filename) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function basename(path) {
  return decodeURIComponent(path.split(/[\\/]/).pop()?.split('?')[0] ?? '').toLowerCase();
}

function defaultUnitFor(format) {
  return ['glb', 'gltf'].includes(format) ? 'm' : 'mm';
}

export class ModelLoader {
  constructor() {
    this.objectUrls = [];
  }

  async loadFiles(fileList, onProgress = () => {}) {
    const files = Array.from(fileList);
    const primary = files.find((file) => SUPPORTED_FORMATS.includes(extensionOf(file.name)));
    if (!primary) {
      throw new Error('未找到支持的模型文件，请选择 GLB、GLTF、OBJ、FBX 或 STL。');
    }

    this.revokeUrls();
    const fileUrls = new Map();
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      fileUrls.set(file.name.toLowerCase(), url);
      fileUrls.set(basename(file.name), url);
      if (file.webkitRelativePath) fileUrls.set(file.webkitRelativePath.toLowerCase(), url);
    });

    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => fileUrls.get(url.toLowerCase()) ?? fileUrls.get(basename(url)) ?? url);
    manager.onProgress = (_url, loaded, total) => onProgress(total ? loaded / total : 0);

    const format = extensionOf(primary.name);
    const sourceUrl = fileUrls.get(primary.name.toLowerCase());
    const object = await this.loadByFormat({ format, primary, sourceUrl, files, manager });
    object.name ||= primary.name.replace(/\.[^.]+$/, '');

    return {
      object,
      name: primary.name,
      format: format.toUpperCase(),
      defaultUnit: defaultUnitFor(format),
    };
  }

  async loadByFormat({ format, primary, sourceUrl, files, manager }) {
    switch (format) {
      case 'glb':
      case 'gltf': {
        const draco = new DRACOLoader(manager);
        draco.setDecoderPath('/draco/');
        const loader = new GLTFLoader(manager);
        loader.setDRACOLoader(draco);
        const gltf = await loader.loadAsync(sourceUrl);
        draco.dispose();
        return gltf.scene;
      }
      case 'obj': {
        const loader = new OBJLoader(manager);
        const mtlFile = files.find((file) => extensionOf(file.name) === 'mtl');
        if (mtlFile) {
          const mtlText = await mtlFile.text();
          const materials = new MTLLoader(manager).parse(mtlText, '');
          materials.preload();
          loader.setMaterials(materials);
        }
        return loader.loadAsync(sourceUrl);
      }
      case 'fbx':
        return new FBXLoader(manager).loadAsync(sourceUrl);
      case 'stl': {
        const geometry = await new STLLoader(manager).loadAsync(sourceUrl);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: '#8f9b98', metalness: 0.15, roughness: 0.62 }),
        );
        mesh.name = primary.name.replace(/\.[^.]+$/, '');
        return mesh;
      }
      default:
        throw new Error(`暂不支持 .${format} 格式。`);
    }
  }

  revokeUrls() {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls = [];
  }

  dispose() {
    this.revokeUrls();
  }
}
