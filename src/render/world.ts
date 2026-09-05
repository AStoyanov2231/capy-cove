import * as THREE from 'three';
import { ITEM_COLORS, buildingDefinition, roomFurniture, type BuildingDefinition, type Furniture, type RoomDefinition } from '../game/content';
import { BIOMES, biomeAt, generateWorld, randomGenerator, riverX, terrainHeight, waterHeight, type WorldItem } from '../game/geography';
import type { Building } from '../game/schema';
import { block, material } from './capybara';
import { batchStaticMeshes } from './batching';
export { randomGenerator } from '../game/geography';

const coneGeometry = new THREE.ConeGeometry(1, 1, 7);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
const ringGeometry = new THREE.RingGeometry(0.65, 0.7, 24);
const ringMaterial = new THREE.MeshBasicMaterial({ color: '#fff0bb', side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
function cylinder(parent: THREE.Object3D, color: string, x: number, y: number, z: number, radius: number, height: number): THREE.Mesh {
  const mesh = new THREE.Mesh(cylinderGeometry, material(color)); mesh.position.set(x, y, z); mesh.scale.set(radius, height, radius); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cone(parent: THREE.Object3D, color: string, x: number, y: number, z: number, radius: number, height: number): THREE.Mesh {
  const mesh = new THREE.Mesh(coneGeometry, material(color)); mesh.position.set(x, y, z); mesh.scale.set(radius, height, radius); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function sign(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width = 3.4): void {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#efe0bc'; ctx.fillRect(0, 0, 512, 96);
  ctx.font = '500 38px Fredoka'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3d5847'; ctx.fillText(text, 256, 49, 480);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }); mat.userData.owned = true;
  const geo = new THREE.PlaneGeometry(width, width * 96 / 512); geo.userData.owned = true;
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); parent.add(mesh);
}
function tree(parent: THREE.Group, biome: string, variant: number): void {
  cylinder(parent, '#836c4b', 0, 1.1, 0, 0.23, 2.4);
  if (biome === 'snow' || biome === 'highland') {
    for (let i = 0; i < 3; i++) cone(parent, biome === 'snow' ? ['#6b877b', '#cad8cb', '#e2e8db'][i] : ['#567d63', '#64896a', '#779772'][i], 0, 2 + i * 0.8, 0, 1.65 - i * 0.4, 2.4);
  } else {
    const colors = biome === 'forest' ? ['#557c55', '#6e955d', '#89a66c'] : ['#83a363', '#a1b474', '#b5c389'];
    block(parent, colors[0], [0, 3, 0], [1.8, 1.6, 1.65], true);
    block(parent, colors[1], [-0.9, 2.8, 0.3], [1.35, 1.25, 1.4], true);
    block(parent, colors[2], [0.8, 3.4, -0.2], [1.45, 1.4, 1.4], true);
    if (variant % 3 === 0) for (const x of [-0.9, 0.1, 0.8]) block(parent, '#eab559', [x, 2.4, 1.1], [0.21, 0.23, 0.21], true);
  }
}
function resource(node: WorldItem, seed: number, index: number): THREE.Group {
  const object = new THREE.Group(); const biome = biomeAt(node.x, node.z, seed);
  if (node.kind === 'wood') tree(object, biome, index);
  else if (['stone', 'iron', 'copper', 'crystal'].includes(node.kind)) {
    block(object, biome === 'desert' ? '#aa9674' : '#89968b', [0, 0.4, 0], [0.95, 0.75, 0.85], true);
    if (node.kind !== 'stone') for (let i = 0; i < 4; i++) {
      const part = block(object, ITEM_COLORS[node.kind], [Math.sin(i * 2) * 0.45, 0.75, Math.cos(i * 2) * 0.4], [0.23, node.kind === 'crystal' ? 0.7 : 0.25, 0.25], node.kind !== 'crystal'); part.rotation.z = i * 0.23;
    }
  } else if (node.kind === 'fiber' || node.kind === 'seed') {
    for (let i = 0; i < 5; i++) { const x = Math.sin(i * 3) * 0.35, z = Math.cos(i * 3) * 0.35;
      cone(object, '#739161', x, 0.48, z, 0.18, 0.9);
      if (node.kind === 'seed') block(object, '#e8cf86', [x, 0.84, z], [0.12, 0.18, 0.12], true);
    }
  } else if (node.kind === 'orange') {
    for (let i = 0; i < 3; i++) block(object, ITEM_COLORS.orange, [(i - 1) * 0.3, 0.26, i % 2 * 0.3], [0.27, 0.26, 0.27], true);
    block(object, '#628853', [0.15, 0.48, 0.2], [0.3, 0.05, 0.12]);
  } else {
    block(object, ITEM_COLORS[node.kind], [0, 0.16, 0], [0.95, 0.25, 0.8], true);
    block(object, ITEM_COLORS[node.kind], [0.4, 0.28, 0.2], [0.45, 0.3, 0.4], true);
  }
  batchStaticMeshes(object, new Set());
  const ring = new THREE.Mesh(ringGeometry, ringMaterial); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.name = 'resource-ring'; object.add(ring);
  object.position.set(node.x, terrainHeight(node.x, node.z, seed), node.z); return object;
}
export interface WorldScene { group: THREE.Group; items: Map<string, THREE.Group>; water: THREE.Mesh; foam: THREE.InstancedMesh }
export function createWorld(seed = 7241): WorldScene {
  const group = new THREE.Group(), items = new Map<string, THREE.Group>(), random = randomGenerator(seed);
  const vertices: number[] = [], colors: number[] = [];
  for (let x = -128; x < 128; x += 2) for (let z = -128; z < 128; z += 2) {
    const points = [[x, z], [x, z + 2], [x + 2, z], [x + 2, z], [x, z + 2], [x + 2, z + 2]];
    for (let t = 0; t < 2; t++) {
      const color = new THREE.Color(BIOMES[biomeAt(x + 1, z + 1, seed)].color).multiplyScalar(0.97 + random() * 0.06);
      for (const [px, pz] of points.slice(t * 3, t * 3 + 3)) { vertices.push(px, terrainHeight(px, pz, seed), pz); colors.push(color.r, color.g, color.b); }
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.userData.owned = true;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }); landMat.userData.owned = true;
  const land = new THREE.Mesh(geometry, landMat); land.receiveShadow = true; group.add(land);
  const waterVertices: number[] = [];
  for (let z = -128; z < 128; z++) {
    const x1 = riverX(z, seed), x2 = riverX(z + 1, seed), y1 = waterHeight(z, seed), y2 = waterHeight(z + 1, seed);
    waterVertices.push(x1 - 2.8, y1, z, x2 - 2.8, y2, z + 1, x1 + 2.8, y1, z, x1 + 2.8, y1, z, x2 - 2.8, y2, z + 1, x2 + 2.8, y2, z + 1);
  }
  const waterGeo = new THREE.BufferGeometry(); waterGeo.userData.owned = true; waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterVertices, 3)); waterGeo.computeVertexNormals();
  const waterMat = new THREE.MeshStandardMaterial({ color: '#68a8a4', roughness: 0.22, metalness: 0.18, side: THREE.DoubleSide }); waterMat.userData.owned = true;
  const water = new THREE.Mesh(waterGeo, waterMat); group.add(water);
  const foamGeo = new THREE.PlaneGeometry(0.65, 0.1); foamGeo.userData.owned = true;
  const foamMat = new THREE.MeshBasicMaterial({ color: '#e8eee0', transparent: true, opacity: 0.55, side: THREE.DoubleSide }); foamMat.userData.owned = true;
  const foam = new THREE.InstancedMesh(foamGeo, foamMat, 200); const dummy = new THREE.Object3D();
  for (let i = 0; i < 200; i++) { const z = -126 + random() * 252, x = riverX(z, seed) + (random() - 0.5) * 4.4;
    dummy.position.set(x, waterHeight(z, seed) + 0.05, z); dummy.rotation.x = -Math.PI / 2; dummy.updateMatrix(); foam.setMatrixAt(i, dummy.matrix);
  }
  group.add(foam);
  generateWorld(seed).items.forEach((node, i) => { const object = resource(node, seed, i); object.visible = Math.hypot(node.x, node.z) < 58; object.getObjectByName('resource-ring')!.visible = false; items.set(node.id, object); group.add(object); });
  // Instanced biome-appropriate understory, with per-instance palettes and terrain heights.
  const grass = new THREE.InstancedMesh(coneGeometry, material('#ffffff'), 4500);
  for (let i = 0; i < 4500; i++) {
    const x = (random() - 0.5) * 250, z = (random() - 0.5) * 250, biome = biomeAt(x, z, seed);
    const river = Math.abs(x - riverX(z, seed)) < 3.2;
    dummy.position.set(x, terrainHeight(x, z, seed) + 0.17, z); dummy.scale.set(0.08, river ? 0 : biome === 'wetland' ? 0.85 : 0.35, 0.08); dummy.rotation.set(0, random() * 6, 0.1); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(i, new THREE.Color(biome === 'desert' ? '#bd9c60' : biome === 'snow' ? '#afc1b1' : '#7d985f'));
  }
  group.add(grass);
  // River cascades follow the real northern terrace rather than a disconnected backdrop.
  const cascadeX = riverX(-55.5, seed), cascadeTop = waterHeight(-57, seed), cascadeBottom = waterHeight(-54, seed);
  const cascade = block(group, '#b5dcd0', [cascadeX, (cascadeTop + cascadeBottom) / 2, -55], [5.1, Math.max(0.2, cascadeTop - cascadeBottom), 0.2]);
  cascade.castShadow = false;
  for (let i = 0; i < 8; i++) block(group, '#dceade', [cascadeX - 2.4 + i * 0.7, cascadeBottom + 0.22, -53.6], [0.7, 0.18, 0.45], true);
  return { group, items, water, foam };
}
function windowFrame(group: THREE.Group, x: number, y: number, z: number): void {
  block(group, '#f2cc84', [x, y, z], [1.1, 1.1, 0.08]);
  for (const dx of [-0.65, 0.65]) block(group, '#6c826d', [x + dx, y, z + 0.04], [0.3, 1.35, 0.12]);
  block(group, '#eee0bd', [x, y, z + 0.08], [0.08, 1.2, 0.12]); block(group, '#eee0bd', [x, y, z + 0.08], [1.2, 0.08, 0.12]);
  block(group, '#968062', [x, y - 0.7, z + 0.2], [1.7, 0.22, 0.42]);
  for (const dx of [-0.5, 0, 0.5]) block(group, '#7b995f', [x + dx, y - 0.54, z + 0.2], [0.25, 0.3, 0.23], true);
}
export function createBuilding(building: Building, seed: number): THREE.Group {
  const def = buildingDefinition(building.kind), group = new THREE.Group();
  block(group, '#a49c85', [0, 0.12, 0], [8.2, 0.5, 6.2]);
  block(group, def.color, [0, 1.85, 0], [7.8, 3.2, 5.8]);
  for (const x of [-3.8, 3.8]) for (const z of [-2.8, 2.8]) block(group, '#8b755a', [x, 1.9, z], [0.2, 3.4, 0.22]);
  block(group, '#866749', [0, 1.27, 2.97], [1.4, 2.3, 0.14]);
  block(group, '#e4c886', [0.46, 1.3, 3.08], [0.1, 0.1, 0.12], true);
  block(group, '#d8c59f', [0, 0.12, 3.45], [2.1, 0.2, 1.1]);
  windowFrame(group, -2.25, 2, 2.98); windowFrame(group, 2.25, 2, 2.98);
  if (def.style === 'tower') {
    cylinder(group, def.color, 0, 4, -0.7, 2.2, 2.2); cone(group, def.roof, 0, 5.9, -0.7, 2.9, 2.1);
    for (const x of [-2.3, 2.3]) { const roof = block(group, def.roof, [x, 3.6, 0], [3.5, 0.3, 6.5]); roof.rotation.z = x < 0 ? 0.18 : -0.18; }
  } else {
    const pitch = def.style === 'barn' ? 0.7 : def.style === 'pagoda' ? 0.25 : 0.48;
    const gableGeometry = new THREE.BufferGeometry();
    gableGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -3.9, 3.35, 2.91, 3.9, 3.35, 2.91, 0, 4.15 + Math.tan(pitch) * 2, 2.91,
      3.9, 3.35, -2.91, -3.9, 3.35, -2.91, 0, 4.15 + Math.tan(pitch) * 2, -2.91,
    ], 3));
    gableGeometry.computeVertexNormals(); gableGeometry.userData.owned = true;
    const gable = new THREE.Mesh(gableGeometry, material(def.color)); gable.castShadow = true; group.add(gable);
    for (const side of [-1, 1]) {
      const roof = block(group, def.roof, [side * 2, 4.15, 0], [4.65, 0.25, 6.65]); roof.rotation.z = -side * pitch;
      for (let i = 0; i < 7; i++) { const seam = block(group, new THREE.Color(def.roof).multiplyScalar(0.86), [side * 2, 4.29, -2.7 + i * 0.9], [4.65, 0.07, 0.06]); seam.rotation.z = -side * pitch; }
    }
    if (def.style === 'pagoda') { block(group, def.roof, [0, 5, 0], [4.6, 0.22, 4]); cone(group, def.roof, 0, 5.7, 0, 2.4, 1.1); }
  }
  if (def.style === 'glass') {
    for (const x of [-3, -1.5, 1.5, 3]) block(group, '#d1e5d5', [x, 2.7, 3.01], [0.95, 0.95, 0.07]);
    for (const x of [-3.7, 3.7]) block(group, '#89b7a7', [x, 1.8, 0], [0.25, 2.4, 4.8]);
  }
  if (def.style === 'dock') {
    for (let i = 0; i < 7; i++) block(group, i % 2 ? '#b19870' : '#c3ad84', [-5, 0.3, -2.7 + i * 0.9], [2, 0.18, 0.85]);
    for (const z of [-2.7, 2.7]) cylinder(group, '#826c4c', -5.7, 0.5, z, 0.16, 1.7);
    cylinder(group, '#9a7853', -4.8, 0.9, 1.6, 0.45, 1);
  }
  if (building.kind === 'mill') {
    const sails = new THREE.Group(); sails.name = 'sails'; sails.position.set(0, 4.6, 2.65);
    for (let i = 0; i < 4; i++) { const blade = new THREE.Group(); blade.rotation.z = i * Math.PI / 2; sails.add(blade); block(blade, '#e9d9af', [0.35, 1.7, 0], [0.6, 2.8, 0.12]); block(blade, '#857255', [0, 1.5, 0], [0.13, 3.3, 0.2]); }
    group.add(sails);
  }
  if (['home', 'bakery', 'smithy', 'inn', 'pottery'].includes(building.kind)) block(group, '#9e9681', [2.4, 4.9, -1.5], [0.8, 2.1, 0.8]);
  if (building.kind === 'farm') for (const x of [-5, 5]) { block(group, '#806745', [x, 0.15, 0], [1, 0.15, 4]); for (let i = 0; i < 5; i++) cone(group, '#c7b36a', x, 0.5, -1.5 + i * 0.7, 0.22, 0.7); }
  if (building.kind === 'observatory') { const telescope = cylinder(group, '#c8aa70', 0, 6.8, 0, 0.25, 2.3); telescope.rotation.z = 0.9; }
  const sails = group.getObjectByName('sails'); batchStaticMeshes(group, new Set(sails ? [sails] : []));
  sign(group, def.name, 0, 3.2, 3.3, 3.3);
  group.position.set(building.x, terrainHeight(building.x, building.z, seed), building.z); return group;
}
function furnish(group: THREE.Group, f: Furniture): void {
  const object = new THREE.Group(); object.position.set(f.x, 0, f.z); group.add(object);
  const wood = '#a88961', dark = '#786749', cloth = '#91a390';
  const table = () => { block(object, wood, [0, 0.95, 0], [f.width, 0.18, f.depth]); for (const x of [-0.7, 0.7]) for (const z of [-0.45, 0.45]) block(object, dark, [x, 0.45, z], [0.12, 0.9, 0.12]); };
  switch (f.kind) {
    case 'bed': block(object, dark, [0, 0.3, 0], [2.5, 0.6, 2.7]); block(object, '#f3e7cb', [0, 0.67, 0], [2.3, 0.23, 2.5]); block(object, cloth, [0, 0.85, 0.4], [2.3, 0.13, 1.5]); block(object, '#faf0d9', [0, 0.9, -0.8], [1.8, 0.27, 0.5]); block(object, wood, [0, 0.85, -1.35], [2.6, 1.5, 0.12]); break;
    case 'sofa': block(object, dark, [0, 0.25, 0], [2.5, 0.35, 1.5]); block(object, cloth, [0, 0.65, 0.1], [2.3, 0.4, 1.2]); block(object, cloth, [0, 1, -0.6], [2.5, 1.15, 0.3]); for (const x of [-1.1, 1.1]) block(object, cloth, [x, 0.9, 0], [0.3, 0.7, 1.5]); block(object, '#e5c794', [-0.6, 1, 0], [0.55, 0.5, 0.25]); break;
    case 'shelf': for (const x of [-0.94, 0.94]) block(object, dark, [x, 1.3, -0.2], [0.14, 2.6, 0.8]); for (let y = 0.3; y < 2.7; y += 0.7) { block(object, wood, [0, y, -0.2], [2, 0.12, 0.85]); for (let i = 0; i < 6; i++) block(object, ['#a7795c', '#829989', '#c5b27c'][i % 3], [-0.7 + i * 0.27, y + 0.3, -0.15], [0.19, 0.5, 0.4]); } break;
    case 'stove': block(object, '#8e9389', [0, 0.7, 0], [2, 1.4, 1.5]); block(object, '#514e43', [0, 0.6, 0.77], [1.3, 0.7, 0.03]); block(object, '#e5aa67', [0, 0.55, 0.8], [0.8, 0.22, 0.02]); cylinder(object, '#686e65', 0, 2.2, -0.4, 0.2, 1.8); break;
    case 'sink': table(); block(object, '#e5e1d0', [0, 1.06, 0], [1.4, 0.2, 1]); block(object, '#89b4af', [0, 1.18, 0], [1.05, 0.05, 0.7]); cylinder(object, '#b4a47e', 0, 1.5, -0.5, 0.08, 0.6); break;
    case 'barrel': cylinder(object, wood, 0, 0.75, 0, 0.7, 1.5); for (const y of [0.3, 1.2]) cylinder(object, '#777d6b', 0, y, 0, 0.72, 0.12); break;
    case 'planter': block(object, '#b78362', [0, 0.35, 0], [2, 0.7, 1.5]); block(object, '#796443', [0, 0.72, 0], [1.8, 0.1, 1.3]); for (const x of [-0.6, 0, 0.6]) { cone(object, '#71915f', x, 1.2, 0, 0.4, 1); block(object, '#e3cfa0', [x, 1.65, 0], [0.17, 0.17, 0.17], true); } break;
    case 'anvil': block(object, wood, [0, 0.4, 0], [1.6, 0.8, 1.2]); block(object, '#65706d', [0, 1, 0], [1.5, 0.5, 0.7]); block(object, '#89918a', [0, 1.3, 0], [2, 0.18, 0.9]); break;
    case 'telescope': { cylinder(object, dark, 0, 0.8, 0, 0.12, 1.6); const tube = cylinder(object, '#c2ab77', 0, 1.8, 0, 0.32, 1.8); tube.rotation.z = 0.9; for (const x of [-0.6, 0.6]) { const leg = block(object, dark, [x, 0.5, 0], [0.15, 1.2, 0.15]); leg.rotation.z = x; } break; }
    case 'bath': block(object, '#c3c7b5', [0, 0.5, 0], [2.5, 1, 2.7]); block(object, '#82b3af', [0, 1.03, 0], [2.1, 0.06, 2.3]); for (const x of [-1.15, 1.15]) block(object, '#e2e0ca', [x, 1, 0], [0.2, 0.2, 2.7]); break;
    case 'loom': table(); for (const x of [-0.7, 0.7]) block(object, dark, [x, 1.7, 0], [0.13, 1.6, 0.13]); block(object, wood, [0, 2.4, 0], [1.6, 0.12, 0.12]); block(object, '#d5c39b', [0, 1.65, 0], [1.2, 1.3, 0.05]); for (let x = -0.5; x < 0.6; x += 0.2) block(object, '#acb99b', [x, 1.6, 0.04], [0.06, 1.3, 0.03]); break;
    case 'display': table(); block(object, '#d4c49e', [0, 1.15, 0], [1.2, 0.15, 0.9]); block(object, '#a6a0bd', [0, 1.6, 0], [0.43, 0.65, 0.4], true); break;
    case 'desk': table(); block(object, '#efe7ce', [0.3, 1.07, 0.1], [0.75, 0.04, 0.5]); block(object, '#a57f5f', [-0.5, 1.1, 0], [0.4, 0.12, 0.6]); cylinder(object, '#e9c784', -0.65, 1.45, -0.3, 0.12, 0.7); break;
    case 'table': table(); cylinder(object, '#e7dcc2', 0, 1.1, 0, 0.35, 0.08); block(object, '#dba052', [0, 1.22, 0], [0.16, 0.16, 0.16], true); break;
  }
}
export function createInterior(def: BuildingDefinition, room: RoomDefinition, index: number): THREE.Group {
  const group = new THREE.Group();
  block(group, '#786c56', [0, -0.25, 0], [12.5, 0.5, 10.5]);
  for (let i = 0; i < 20; i++) block(group, i % 3 ? '#bca27a' : '#c8b18a', [0, 0.015, -4.75 + i * 0.5], [12, 0.04, 0.47]);
  block(group, '#e8d9b8', [0, 1.65, -5], [12.3, 3.3, 0.25]);
  block(group, '#9c8866', [0, 0.24, -4.8], [12, 0.35, 0.15]);
  for (const side of [-1, 1]) {
    for (const z of [-3, 3]) block(group, '#d7c5a2', [side * 6, 0.65, z], [0.22, 1.3, 4]);
    for (const z of [-1, 1]) block(group, '#917758', [side * 5.98, 1.35, z], [0.28, 2.7, 0.22]);
    block(group, '#917758', [side * 6, 2.65, 0], [0.28, 0.18, 2.2]);
    const open = side === -1 ? index > 0 : index < def.rooms.length - 1;
    block(group, open ? '#78998b' : '#aa9574', [side * 5.98, open ? 0.04 : 1.2, 0], [0.2, open ? 0.08 : 2.4, 1.7]);
  }
  for (const x of [-3.7, 3.7]) block(group, '#c6b28e', [x, 0.25, 5], [4.7, 0.5, 0.23]);
  block(group, '#78998b', [0, 0.04, 4.8], [2.5, 0.08, 0.7]);
  block(group, '#879985', [0, 0.07, 0], [4.2, 0.04, 4]);
  for (const x of [-1.85, 1.85]) block(group, '#cbd0aa', [x, 0.095, 0], [0.07, 0.02, 3.65]);
  windowFrame(group, -2.9, 2.1, -4.8); windowFrame(group, 2.9, 2.1, -4.8);
  roomFurniture(room).forEach(f => furnish(group, f));
  // Wall lights and their warm pools belong to the room, not to the outdoor world.
  for (const x of [-5.2, 5.2]) { block(group, '#997e52', [x, 2, -4.65], [0.35, 0.65, 0.32]); block(group, '#f1d292', [x, 2.1, -4.43], [0.22, 0.37, 0.08]); }
  batchStaticMeshes(group, new Set()); sign(group, room.name, 0, 2.75, -4.8, 3.1);
  const light = new THREE.PointLight('#ffcd85', 12, 15, 2); light.position.set(0, 4, -2); group.add(light);
  return group;
}
/** Dispose only local assets, never the shared capybara/material/primitive caches. */
export function disposeWorldObject(root: THREE.Object3D): void {
  root.traverse(object => { if (!(object instanceof THREE.Mesh)) return;
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (object.geometry.userData.owned) object.geometry.dispose();
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) if (mat.userData.owned) {
      if ('map' in mat) (mat.map as THREE.Texture | null)?.dispose(); mat.dispose();
    }
  });
}
