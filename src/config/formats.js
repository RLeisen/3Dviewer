export const SUPPORTED_FORMATS = ['glb', 'gltf', 'obj', 'fbx', 'stl'];

export const FORMAT_LABEL = {
  glb: 'GLB',
  gltf: 'GLTF',
  obj: 'OBJ',
  fbx: 'FBX',
  stl: 'STL',
};

export const MODEL_FILE_ACCEPT = SUPPORTED_FORMATS.map((format) => `.${format}`).join(',');
