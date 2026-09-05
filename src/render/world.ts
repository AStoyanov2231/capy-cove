import * as THREE from 'three';
import { ITEMS, QUESTS, riverX } from '../game/content';
import { block, material } from './capybara';
import { batchStaticMeshes } from './batching';

export function randomGenerator(seed: number): () => number {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function cylinder(parent: THREE.Object3D, color: string, top: number, bottom: number, height: number, x: number, y: number, z: number, sides = 8): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function textSign(parent: THREE.Object3D, text: string, x: number, z: number, color = '#385b3e'): void {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f5e4b9'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#c0a77a'; ctx.lineWidth = 10; ctx.strokeRect(6, 6, 500, 116);
  ctx.font = '600 44px "Fredoka", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, 256, 65);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.15), [material('#ab885b'), material('#ab885b'), material('#ab885b'), material('#ab885b'), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }), material('#ab885b')]);
  sign.position.set(x, 1.65, z); parent.add(sign);
  block(parent, '#9f7950', [x - 1.2, 0.75, z], [0.14, 1.6, 0.14]);
  block(parent, '#9f7950', [x + 1.2, 0.75, z], [0.14, 1.6, 0.14]);
}
function tree(parent: THREE.Object3D, x: number, z: number, scale: number, variant: number): void {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); parent.add(group);
  cylinder(group, '#8d7050', 0.16, 0.27, 2.5, 0, 1.15, 0, 5);
  const branch = block(group, '#8d7050', [0.42, 1.75, 0], [0.16, 1.35, 0.16]); branch.rotation.z = -0.65;
  const shades = variant % 3 === 0 ? ['#e4ba64', '#eece7c', '#c9ae59'] : ['#68974f', '#87ae5c', '#a4be68'];
  block(group, shades[0], [0, 3.05, 0], [1.9, 2, 1.65], true);
  block(group, shades[1], [-0.85, 2.85, 0.2], [1.5, 1.55, 1.4], true);
  block(group, shades[2], [1, 2.9, 0], [1.25, 1.35, 1.2], true);
  if (variant % 3 !== 0) {
    for (const [ox, oy, oz] of [[-1, 2.6, 1], [0.7, 2.8, 1.2], [0.2, 2.15, 0.8]]) block(group, '#f4b044', [ox, oy, oz], [0.23, 0.24, 0.23], true);
  }
}
export interface WorldScene {
  group: THREE.Group; items: Map<string, THREE.Group>; questMarkers: THREE.Group[];
  flowers: THREE.Group; picnic: THREE.Group; steam: THREE.Group;
  water: THREE.Mesh; butterflies: THREE.Group[];
}
export function createWorld(): WorldScene {
  const group = new THREE.Group();
  const random = randomGenerator(7241);
  // Faceted banks and a pale sandy rim keep the island legible from above.
  const lower = cylinder(group, '#c7af75', 25.9, 24.3, 2.4, 0, -1.8, 0, 48); lower.scale.z = 0.9;
  const beach = cylinder(group, '#e9d39a', 25.2, 26.3, 0.7, 0, -0.5, 0, 48); beach.scale.z = 0.9;
  const land = cylinder(group, '#a9bd73', 24.3, 25.3, 0.4, 0, -0.18, 0, 48); land.scale.z = 0.9;
  // Hand-colored triangulated meadow instead of a texture-dependent flat plane.
  const grid = new THREE.PlaneGeometry(48, 43.2, 24, 24);
  grid.rotateX(-Math.PI / 2);
  const gridPositions = grid.getAttribute('position');
  for (let i = 0; i < gridPositions.count; i++) {
    gridPositions.setX(i, gridPositions.getX(i) + (random() - 0.5) * 0.8);
    gridPositions.setZ(i, gridPositions.getZ(i) + (random() - 0.5) * 0.8);
  }
  const triangles = grid.toNonIndexed();
  const pos = triangles.getAttribute('position');
  const vertices: number[] = [], colors: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    if ([0, 1, 2].some(j => Math.hypot(pos.getX(i + j), pos.getZ(i + j) / 0.9) > 24.2)) continue;
    const color = new THREE.Color(['#a9bd73', '#abbe76', '#a8bb72', '#adbf78'][Math.floor(random() * 4)]);
    for (let j = 0; j < 3; j++) { vertices.push(pos.getX(i + j), 0, pos.getZ(i + j)); colors.push(color.r, color.g, color.b); }
  }
  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals(); grid.dispose(); triangles.dispose();
  const meadow = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); meadow.position.y = 0.035; meadow.receiveShadow = true; group.add(meadow);

  const waterVertices: number[] = [];
  for (let z = -19; z < 19; z += 1) {
    const x1 = riverX(z), x2 = riverX(z + 1), w = 1.65;
    waterVertices.push(x1 - w, 0.055, z, x1 + w, 0.055, z, x2 + w, 0.055, z + 1, x1 - w, 0.055, z, x2 + w, 0.055, z + 1, x2 - w, 0.055, z + 1);
  }
  const waterGeo = new THREE.BufferGeometry(); waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterVertices, 3)); waterGeo.computeVertexNormals();
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: '#70bcb0', roughness: 0.4, side: THREE.DoubleSide })); group.add(water);
  for (const z of [5, -12]) {
    const x = riverX(z);
    for (let i = 0; i < 11; i++) block(group, i % 2 ? '#c9a36a' : '#d9b681', [x - 2.5 + i * 0.5, 0.19, z], [0.45, 0.2, 2.4]);
    for (const side of [-1, 1]) {
      block(group, '#987451', [x, 1.05, z + side * 1.1], [5.6, 0.12, 0.12]);
      for (const end of [-1, 1]) block(group, '#987451', [x + end * 2.5, 0.68, z + side * 1.1], [0.16, 1.3, 0.16]);
    }
  }
  // A path that follows the adventure, laid in irregular meadow stones.
  for (let i = 0; i < 40; i++) {
    const t = i / 39, z = 9 - t * 23, x = Math.sin(t * Math.PI * 2) * 4;
    const p = block(group, i % 3 === 0 ? '#d6cd9c' : '#c7c58d', [x + (random() - 0.5), 0.066, z], [0.55 + random() * 0.6, 0.035, 0.4 + random() * 0.4], true); p.rotation.y = random() * 6;
  }
  const treeLocations = [[-18, 6], [-17, -1], [-17, -7], [-12, -14], [-8, -18], [0, -21], [10, -17], [17, -11], [20, -4], [21, 3], [17, 10], [11, 16], [5, 18], [-5, 17], [-12, 14], [-19, 0], [-21, -3], [-14, -5], [-9, -6], [7, 1], [9, 10], [-15, 8], [-3, -9], [9, -12], [-19, 10]];
  treeLocations.forEach(([x, z], i) => tree(group, x, z, 0.75 + random() * 0.5, i));
  // Instanced vegetation keeps the rich scene inexpensive on mobile GPUs.
  const stemGeo = new THREE.ConeGeometry(0.08, 0.4, 3);
  const grass = new THREE.InstancedMesh(stemGeo, material('#7b9c5b'), 650);
  const blossom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.105, 0), material('#f7e4aa'), 220);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 650; i++) {
    const a = random() * Math.PI * 2, radius = Math.sqrt(random()) * 23;
    let x = Math.cos(a) * radius, z = Math.sin(a) * radius * 0.9;
    if (Math.abs(x - riverX(z)) < 2.2) { x = -x; z *= 0.9; }
    dummy.position.set(x, 0.18, z); dummy.rotation.set(0, random() * 6, (random() - 0.5) * 0.4); dummy.scale.setScalar(0.7 + random()); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
    if (i < 220) { dummy.position.y = 0.35; dummy.updateMatrix(); blossom.setMatrixAt(i, dummy.matrix); }
  }
  group.add(grass, blossom);
  for (let i = 0; i < 34; i++) {
    const a = random() * Math.PI * 2, r = 22 + random() * 3;
    const rock = block(group, ['#b2b59e', '#989e8c', '#c7c7aa'][i % 3], [Math.cos(a) * r, 0.2, Math.sin(a) * r * 0.9], [0.5 + random(), 0.4 + random() * 0.6, 0.6 + random()], true); rock.rotation.y = random() * 6;
  }
  // Picnic meadow.
  const picnic = new THREE.Group(); group.add(picnic);
  block(group, '#e4a088', [-7, 0.075, 4], [5.1, 0.025, 3.6]);
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 6; iz++) if ((ix + iz) % 2 === 0) block(group, '#f3d3ad', [-9.23 + ix * 0.64, 0.095, 2.5 + iz * 0.6], [0.63, 0.015, 0.59]);
  block(group, '#a98351', [-7, 0.67, 3.7], [2.6, 0.18, 1.5]);
  for (const x of [-8, -6]) for (const z of [3.2, 4.2]) block(group, '#8b704b', [x, 0.34, z], [0.15, 0.7, 0.15]);
  cylinder(picnic, '#f5e5be', 0.4, 0.35, 0.08, -7, 0.83, 3.7);
  for (let i = 0; i < 5; i++) block(picnic, '#f6b449', [-7 + (i % 3 - 1) * 0.23, 0.99 + Math.floor(i / 3) * 0.18, 3.7 + (i % 2) * 0.18], [0.2, 0.2, 0.2], true);
  picnic.visible = false;
  textSign(group, 'PICNIC MEADOW', -7, 1.1);
  // Garden beds and their persistent quest reward.
  const flowers = new THREE.Group(); group.add(flowers);
  for (const x of [6.9, 9.1]) {
    block(group, '#8b7853', [x, 0.1, -5], [1.8, 0.14, 3.1]);
    for (const side of [-1, 1]) block(group, '#c39a67', [x + side * 0.95, 0.23, -5], [0.12, 0.25, 3.3]);
    for (let i = 0; i < 8; i++) {
      const z = -6.1 + Math.floor(i / 2) * 0.75, ox = x + (i % 2 - 0.5) * 0.8;
      block(flowers, '#659052', [ox, 0.45, z], [0.06, 0.65, 0.06]);
      for (let j = 0; j < 5; j++) { const a = j * Math.PI * 2 / 5; block(flowers, i % 2 ? '#f2b683' : '#eee7b8', [ox + Math.cos(a) * 0.18, 0.8, z + Math.sin(a) * 0.18], [0.2, 0.12, 0.2], true); }
      block(flowers, '#e9b64c', [ox, 0.87, z], [0.13, 0.12, 0.13], true);
    }
  }
  flowers.visible = false;
  textSign(group, 'RIVERSIDE GARDEN', 8, -7.5);
  // The spring: inset water, faceted boulders, bamboo and rising steam.
  cylinder(group, '#75ada6', 2.8, 2.8, 0.1, 1, 0.08, -15, 16);
  for (let i = 0; i < 15; i++) { const a = i / 15 * Math.PI * 2; block(group, '#a3a696', [1 + Math.cos(a) * 2.9, 0.22, -15 + Math.sin(a) * 2.9], [0.8, 0.55, 0.7], true); }
  const steam = new THREE.Group(); group.add(steam); steam.visible = false;
  const steamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < 8; i++) { const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), steamMat); puff.position.set(1 + (random() - 0.5) * 3, 1 + random() * 2, -15 + (random() - 0.5) * 3); puff.userData.base = puff.position.y; steam.add(puff); }
  for (let i = 0; i < 7; i++) {
    const x = -2.5 + i * 0.75;
    cylinder(group, '#75965b', 0.08, 0.1, 2.5 + i % 3, x, 1.3, -19, 5);
    for (let j = 0; j < 3; j++) { const leaf = block(group, '#89a565', [x + 0.3, 1.7 + j * 0.5, -19], [0.8, 0.06, 0.25]); leaf.rotation.z = 0.5; }
  }
  textSign(group, 'PEBBLE HOT SPRING', 1, -19.2);

  const items = new Map<string, THREE.Group>();
  for (const item of ITEMS) {
    const object = new THREE.Group(); object.position.set(item.x, 0.35, item.z); group.add(object); items.set(item.id, object);
    if (item.kind === 'orange') {
      block(object, '#f6ab3d', [0, 0, 0], [0.34, 0.33, 0.34], true);
      const leaf = block(object, '#477e48', [0.13, 0.29, 0], [0.26, 0.04, 0.14]); leaf.rotation.z = 0.35;
    } else if (item.kind === 'seed') {
      block(object, '#dfc49a', [0, 0, 0], [0.42, 0.48, 0.32]);
      block(object, '#568851', [0, 0.01, 0.17], [0.19, 0.24, 0.015], true);
      block(object, '#846e44', [0, 0.26, 0], [0.3, 0.06, 0.24]);
    } else block(object, '#8babb5', [0, 0, 0], [0.42, 0.25, 0.36], true);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.54, 24), new THREE.MeshBasicMaterial({ color: '#fff2b8', side: THREE.DoubleSide, transparent: true, opacity: 0.75 })); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.23; object.add(ring);
  }
  const questMarkers = QUESTS.map(q => {
    const marker = new THREE.Group(); marker.position.set(q.x, 3.8, q.z); group.add(marker);
    const gem = block(marker, '#ffe3a0', [0, 0, 0], [0.37, 0.37, 0.37]); gem.rotation.z = Math.PI / 4; gem.rotation.x = Math.PI / 4;
    return marker;
  });
  const butterflies: THREE.Group[] = [];
  for (let i = 0; i < 10; i++) {
    const butterfly = new THREE.Group(); butterfly.position.set((random() - 0.5) * 30, 1 + random() * 2, (random() - 0.5) * 30);
    butterfly.userData.origin = butterfly.position.clone();
    for (const side of [-1, 1]) block(butterfly, i % 2 ? '#f6d796' : '#f1c0a4', [side * 0.12, 0, 0], [0.22, 0.025, 0.3], true);
    group.add(butterfly); butterflies.push(butterfly);
  }
  batchStaticMeshes(group, new Set<THREE.Object3D>([...items.values(), ...questMarkers, flowers, picnic, steam, water, ...butterflies]));
  return { group, items, questMarkers, flowers, picnic, steam, water, butterflies };
}
