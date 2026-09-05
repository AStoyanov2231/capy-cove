import * as THREE from 'three';
import { ITEM_COLORS } from '../game/content';
import { BIOMES, biomeAt, generateWorld, randomGenerator, riverX, terrainHeight, waterHeight, type WorldItem } from '../game/geography';
export { createBuilding, createInterior, updateInterior } from './buildings';
import { block, material } from './capybara';
import { batchStaticMeshes } from './batching';
import { waterMaterial, windMaterial } from './finish';
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
function tree(parent: THREE.Group, biome: string, variant: number): void {
  const trunk = cylinder(parent, '#9a7850', 0, 1.05, 0, 0.29, 2.3); trunk.rotation.z = (variant % 3 - 1) * 0.07;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const root = block(parent, '#9a7850', [Math.cos(a) * 0.28, 0.13, Math.sin(a) * 0.28], [0.55, 0.2, 0.22]); root.rotation.y = -a; }
  const canopy = new THREE.Group(); canopy.name = 'canopy'; parent.add(canopy);
  if (biome === 'snow' || biome === 'highland') {
    for (let i = 0; i < 4; i++) cone(canopy, biome === 'snow' ? ['#537f73', '#a9cdc0', '#d1e4d7', '#eaf1df'][i] : ['#427e61', '#5c9b6a', '#77ae75', '#9cc987'][i], 0, 1.95 + i * 0.73, 0, 1.65 - i * 0.33, 2.05);
  } else {
    const colors = biome === 'forest' ? ['#4b9162', '#70af69', '#91c478'] : biome === 'wetland' ? ['#5a9d7e', '#80bc83', '#a7d193'] : ['#76ad61', '#9bca73', '#bddb8b'];
    block(canopy, colors[0], [0, 2.9, 0], [1.75, 1.65, 1.65], true);
    block(canopy, colors[1], [-1.05, 2.55, 0.4], [1.3, 1.22, 1.25], true);
    block(canopy, colors[1], [1.15, 2.8, 0.15], [1.3, 1.4, 1.35], true);
    block(canopy, colors[2], [0.35, 3.65, -0.35], [1.3, 1.05, 1.2], true);
    block(canopy, colors[2], [-0.65, 3.15, -0.65], [1.1, 0.95, 1.2], true);
    if (variant % 3 === 0) for (const x of [-0.9, 0.1, 0.8]) block(canopy, '#f0b249', [x, 2.45, 1.45], [0.19, 0.21, 0.19], true);
  }
  batchStaticMeshes(canopy, new Set());
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
  const canopy = object.getObjectByName('canopy');
  batchStaticMeshes(object, new Set(canopy ? [canopy] : []));
  const ring = new THREE.Mesh(ringGeometry, ringMaterial); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.name = 'resource-ring'; object.add(ring);
  object.position.set(node.x, terrainHeight(node.x, node.z, seed), node.z); return object;
}
export interface WorldScene { group: THREE.Group; items: Map<string, THREE.Group>; water: THREE.Mesh; foam: THREE.InstancedMesh; grass: THREE.InstancedMesh; butterflies: THREE.Group[]; clocks: { value: number }[]; decorations: THREE.InstancedMesh[] }
export function createWorld(seed = 7241): WorldScene {
  const group = new THREE.Group(), items = new Map<string, THREE.Group>(), random = randomGenerator(seed);
  const vertices: number[] = [], colors: number[] = [];
  const terrainColors = new Map<string, THREE.Color>();
  const groundColor = (x: number, z: number): THREE.Color => {
    const key = `${x}:${z}`; const existing = terrainColors.get(key); if (existing) return existing;
    const color = new THREE.Color(BIOMES[biomeAt(x, z, seed)].color);
    for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) color.lerp(new THREE.Color(BIOMES[biomeAt(x + dx, z + dz, seed)].color), 0.16);
    const slope = Math.abs(terrainHeight(x, z + 2, seed) - terrainHeight(x, z - 2, seed));
    if (slope > 1.4) color.lerp(new THREE.Color('#b6b69a'), Math.min(0.75, (slope - 1.4) * 0.25));
    color.multiplyScalar(0.97 + random() * 0.06); terrainColors.set(key, color); return color;
  };
  for (let x = -128; x < 128; x += 2) for (let z = -128; z < 128; z += 2) {
    const points = [[x, z], [x, z + 2], [x + 2, z], [x + 2, z], [x, z + 2], [x + 2, z + 2]];
    for (let t = 0; t < 2; t++) {
      for (const [px, pz] of points.slice(t * 3, t * 3 + 3)) { const color = groundColor(px, pz); vertices.push(px, terrainHeight(px, pz, seed), pz); colors.push(color.r, color.g, color.b); }
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.userData.owned = true;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }); landMat.userData.owned = true;
  const cloudClock = { value: 0 };
  landMat.onBeforeCompile = shader => {
    shader.uniforms.cloudTime = cloudClock;
    shader.vertexShader = 'varying vec3 groundPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n groundPosition=position;');
    shader.fragmentShader = 'uniform float cloudTime; varying vec3 groundPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float cloud=sin(groundPosition.x*.11+cloudTime*.025)*sin(groundPosition.z*.075+groundPosition.x*.035+cloudTime*.018);
      diffuseColor.rgb*=1.-smoothstep(.15,.8,cloud)*.065;`);
  };
  landMat.customProgramCacheKey = () => 'capy-ground-clouds-v1';
  const land = new THREE.Mesh(geometry, landMat); land.receiveShadow = true; group.add(land);
  const waterVertices: number[] = [];
  for (let z = -128; z < 128; z++) {
    const x1 = riverX(z, seed), x2 = riverX(z + 1, seed), y1 = waterHeight(z, seed), y2 = waterHeight(z + 1, seed);
    waterVertices.push(x1 - 2.8, y1, z, x2 - 2.8, y2, z + 1, x1 + 2.8, y1, z, x1 + 2.8, y1, z, x2 - 2.8, y2, z + 1, x2 + 2.8, y2, z + 1);
  }
  const waterGeo = new THREE.BufferGeometry(); waterGeo.userData.owned = true; waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterVertices, 3)); waterGeo.computeVertexNormals();
  const waterMat = waterMaterial();
  const water = new THREE.Mesh(waterGeo, waterMat); group.add(water);
  const foamGeo = new THREE.PlaneGeometry(0.65, 0.1); foamGeo.userData.owned = true;
  const foamMat = new THREE.MeshBasicMaterial({ color: '#e8eee0', transparent: true, opacity: 0.55, side: THREE.DoubleSide }); foamMat.userData.owned = true;
  const foam = new THREE.InstancedMesh(foamGeo, foamMat, 200); const dummy = new THREE.Object3D();
  for (let i = 0; i < 200; i++) { const z = -126 + random() * 252, x = riverX(z, seed) + (random() - 0.5) * 4.4;
    dummy.position.set(x, waterHeight(z, seed) + 0.05, z); dummy.rotation.x = -Math.PI / 2; dummy.updateMatrix(); foam.setMatrixAt(i, dummy.matrix);
  }
  group.add(foam);
  generateWorld(seed).items.forEach((node, i) => { const object = resource(node, seed, i); object.visible = Math.hypot(node.x, node.z) < 58; object.getObjectByName('resource-ring')!.visible = false; items.set(node.id, object); group.add(object); });
  // Each instance is a whole tuft. Wind runs on the GPU, with no per-blade animation loop.
  const blades: number[] = [];
  for (let i = 0; i < 5; i++) { const a = i * 2.4, x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.22; blades.push(x - 0.1, -0.5, z, x + 0.1, -0.5, z, x + Math.sin(a) * 0.15, 0.4 + i % 2 * 0.2, z + 0.12); }
  const tuft = new THREE.BufferGeometry(); tuft.userData.owned = true; tuft.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3)); tuft.computeVertexNormals();
  const grassMat = windMaterial('#ffffff', 0.18), grass = new THREE.InstancedMesh(tuft, grassMat, 10500);
  const decorations: THREE.InstancedMesh[] = [grass];
  const positions: { x: number; z: number }[] = [];
  for (let i = 0; i < grass.count; i++) {
    const x = (random() - 0.5) * 250, z = (random() - 0.5) * 250, biome = biomeAt(x, z, seed);
    const river = Math.abs(x - riverX(z, seed)) < 3.15;
    const size = 0.45 + random() * 0.7;
    dummy.position.set(x, terrainHeight(x, z, seed) + 0.2 * size, z); dummy.scale.set(size, river ? 0 : size * (biome === 'wetland' ? 1.5 : 0.75), size); dummy.rotation.set(0, random() * 6, 0); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(i, new THREE.Color(biome === 'desert' ? '#d3af6c' : biome === 'snow' ? '#b9d8c4' : i % 3 ? '#85b76a' : '#a8c978'));
    positions.push({ x, z });
  }
  grass.userData.positions = positions; grass.userData.baseMatrices = grass.instanceMatrix.array.slice(); group.add(grass);
  const petalGeometry = new THREE.IcosahedronGeometry(1, 0); petalGeometry.userData.owned = true;
  const flowerMat = windMaterial('#ffffff', 0.09), flowers = new THREE.InstancedMesh(petalGeometry, flowerMat, 1600);
  const flowerPositions: { x: number; z: number }[] = [];
  for (let i = 0; i < flowers.count; i++) {
    const x = (random() - 0.5) * 240, z = (random() - 0.5) * 240, biome = biomeAt(x, z, seed);
    const grow = ['meadow', 'forest', 'wetland'].includes(biome) && Math.abs(x - riverX(z, seed)) > 3.5;
    dummy.position.set(x, terrainHeight(x, z, seed) + 0.3, z); dummy.rotation.set(0, random() * 6, 0); dummy.scale.setScalar(grow ? 0.12 + random() * 0.08 : 0); dummy.updateMatrix(); flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, new THREE.Color(['#f4df9a', '#e6bca7', '#c6bfdc', '#fff0c3'][i % 4])); flowerPositions.push({ x, z });
  }
  flowers.userData.positions = flowerPositions; flowers.userData.baseMatrices = flowers.instanceMatrix.array.slice(); group.add(flowers); decorations.push(flowers);
  const butterflies: THREE.Group[] = [];
  for (let i = 0; i < 18; i++) {
    const butterfly = new THREE.Group(), x = (random() - 0.5) * 90, z = (random() - 0.5) * 90;
    butterfly.userData.origin = new THREE.Vector3(x, terrainHeight(x, z, seed) + 1.5, z);
    for (const side of [-1, 1]) block(butterfly, i % 2 ? '#f3d590' : '#bcdad1', [side * 0.13, 0, 0], [0.17, 0.025, 0.22], true);
    butterfly.position.copy(butterfly.userData.origin); group.add(butterfly); butterflies.push(butterfly);
  }
  const clocks = [waterMat.userData.clock, grassMat.userData.clock, flowerMat.userData.clock, cloudClock] as { value: number }[];
  // River cascades follow the real northern terrace rather than a disconnected backdrop.
  const cascadeX = riverX(-54, seed), cascadeBottom = waterHeight(-54, seed), fallVertices: number[] = [];
  for (let z = -57.5; z < -53.5; z += 0.25) for (let strip = 0; strip < 7; strip++) {
    const dx = -2.6 + strip * 0.77, x1 = riverX(z, seed) + dx, x2 = riverX(z + 0.25, seed) + dx;
    const y1 = waterHeight(z, seed) + 0.065, y2 = waterHeight(z + 0.25, seed) + 0.065;
    fallVertices.push(x1, y1, z, x2, y2, z + 0.25, x1 + 0.55, y1, z, x1 + 0.55, y1, z, x2, y2, z + 0.25, x2 + 0.55, y2, z + 0.25);
  }
  const fallGeo = new THREE.BufferGeometry(); fallGeo.userData.owned = true; fallGeo.setAttribute('position', new THREE.Float32BufferAttribute(fallVertices, 3)); fallGeo.computeVertexNormals();
  const fallMat = waterMaterial(); fallMat.color.set('#b9e5d7'); fallMat.roughness = 0.38;
  const cascade = new THREE.Mesh(fallGeo, fallMat); group.add(cascade); clocks.push(fallMat.userData.clock);
  for (let i = 0; i < 8; i++) block(group, '#dceade', [cascadeX - 2.4 + i * 0.7, cascadeBottom + 0.12, -53.6], [0.42, 0.1, 0.25], true);
  return { group, items, water, foam, grass, butterflies, clocks, decorations };
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
