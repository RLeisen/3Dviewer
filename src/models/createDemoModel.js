import * as THREE from 'three';

function material(color, metalness = 0.15, roughness = 0.65) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function box(group, name, size, position, meshMaterial) {
  const geometry = new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function createDemoModel() {
  const root = new THREE.Group();
  root.name = '工业工作台';

  const graphite = material('#323638', 0.55, 0.35);
  const warmMetal = material('#a6a49b', 0.72, 0.24);
  const panel = material('#d6d1c5', 0.24, 0.62);
  const green = material('#2e6b5d', 0.4, 0.38);
  const accent = material('#e76f2e', 0.25, 0.42);
  const dark = material('#17191a', 0.48, 0.32);

  // Dimensions are authored in millimetres: 1800 W x 1450 H x 800 D.
  box(root, '工作台面', [1800, 80, 800], [0, 900, 0], graphite);
  [-820, 820].forEach((x) => {
    [-330, 330].forEach((z) => {
      box(root, '支撑腿', [80, 860, 80], [x, 430, z], warmMetal);
      box(root, '调节脚', [130, 28, 130], [x, 14, z], dark);
    });
  });

  box(root, '后工具板', [1720, 490, 50], [0, 1205, 350], panel);
  box(root, '上横梁', [1800, 60, 80], [0, 1420, 330], graphite);
  box(root, '左立柱', [70, 510, 70], [-840, 1175, 330], graphite);
  box(root, '右立柱', [70, 510, 70], [840, 1175, 330], graphite);

  for (let x = -720; x <= 720; x += 120) {
    for (let y = 1040; y <= 1330; y += 95) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 58, 14), dark);
      hole.name = '工具板孔';
      hole.rotation.x = Math.PI / 2;
      hole.position.set(x, y, 350);
      root.add(hole);
    }
  }

  box(root, '抽屉柜', [520, 620, 620], [530, 550, 40], green);
  [300, 455, 610, 765].forEach((y) => {
    box(root, '抽屉面板', [490, 125, 14], [530, y, -277], panel);
    box(root, '抽屉拉手', [190, 20, 24], [530, y + 15, -298], dark);
  });

  box(root, '台钳底座', [260, 55, 230], [-500, 967.5, -80], green);
  box(root, '台钳固定颚', [70, 170, 260], [-585, 1080, -80], graphite);
  box(root, '台钳活动颚', [70, 170, 260], [-400, 1080, -80], graphite);
  box(root, '钳口高亮', [255, 34, 278], [-492.5, 1178, -80], accent);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 420, 20), warmMetal);
  handle.name = '台钳手柄';
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-400, 1020, -225);
  handle.castShadow = true;
  root.add(handle);

  box(root, '工具盒', [310, 150, 180], [260, 1035, 210], accent);
  box(root, '工具盒内衬', [270, 12, 140], [260, 1115, 210], dark);

  root.userData.viewerName = '工业工作台';
  root.userData.viewerFormat = 'DEMO';
  return root;
}
