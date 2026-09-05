import * as THREE from 'three';
import { CROPS, CROP_SECONDS, buildingDefinition, furnitureAccess, type BuildingDefinition, type Furniture, type RoomDefinition } from '../game/content';
import { buildingElevation } from '../game/engine';
import type { Building, GameState } from '../game/schema';
import { block, material } from './capybara';
import { batchStaticMeshes } from './batching';

const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 10);
const coneGeometry = new THREE.ConeGeometry(1, 1, 10);
const ringGeometry = new THREE.RingGeometry(.33, .4, 24);
const ropeGeometry = new THREE.TorusGeometry(.24, .045, 4, 10);
const glow = new THREE.MeshStandardMaterial({ color: '#f5d394', emissive: '#eea14d', emissiveIntensity: .7, roughness: .5 });
const glass = new THREE.MeshStandardMaterial({ color: '#c0e6d6', transparent: true, opacity: .2, roughness: .2, depthWrite: false, side: THREE.DoubleSide });
const markerMaterial = new THREE.MeshBasicMaterial({ color: '#f2d394', side: THREE.DoubleSide, transparent: true, opacity: .85, depthWrite: false });
function cylinder(parent: THREE.Object3D, color: string, x: number, y: number, z: number, radius: number, height: number): THREE.Mesh {
  const mesh = new THREE.Mesh(cylinderGeometry, material(color)); mesh.position.set(x, y, z); mesh.scale.set(radius, height, radius); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function plant(parent: THREE.Object3D, x: number, y: number, z: number, size = 1): void {
  const mesh = new THREE.Mesh(coneGeometry, material('#76a66b')); mesh.position.set(x, y + size * .5, z); mesh.scale.set(size * .35, size, size * .35); parent.add(mesh);
}
function windowFrame(group: THREE.Group, x: number, y: number, z: number): void {
  const pane = block(group, '#f2cc84', [x, y, z], [1.15, 1.2, .08]); pane.material = glow;
  for (const dx of [-.65, .65]) block(group, '#6c826d', [x + dx, y, z + .04], [.18, 1.4, .12]);
  block(group, '#eee0bd', [x, y, z + .08], [.08, 1.2, .12]); block(group, '#eee0bd', [x, y, z + .08], [1.2, .08, .12]);
}
/** The same builder supplies interior furniture and exterior functional silhouettes. */
export function furnish(group: THREE.Group, f: Furniture): THREE.Group {
  const object = new THREE.Group(); object.name = `furniture-${f.id}`; object.position.set(f.x, 0, f.z); object.rotation.y = -THREE.MathUtils.degToRad(f.rotation); group.add(object);
  const w = f.width, d = f.depth, wood = '#a88961', dark = '#786749', cloth = '#91a390';
  const table = () => { block(object, wood, [0, .95, 0], [w, .18, d]); for (const x of [-w * .38, w * .38]) for (const z of [-d * .35, d * .35]) block(object, dark, [x, .45, z], [.15, .9, .15]); };
  switch (f.kind) {
    case 'bed':
      block(object, dark, [0, .3, 0], [w, .6, d]); block(object, '#f3e7cb', [0, .67, 0], [w * .94, .23, d * .95]);
      block(object, cloth, [0, .85, d * .15], [w * .94, .13, d * .6]); block(object, '#faf0d9', [0, .9, -d * .3], [w * .75, .27, .5]); block(object, wood, [0, .9, -d * .46], [w, 1.5, .15]); break;
    case 'chair':
      block(object, wood, [0, .55, 0], [w, .18, d]); block(object, wood, [0, 1, -d * .4], [w, .9, .12]);
      for (const x of [-w * .35, w * .35]) for (const z of [-d * .35, d * .35]) block(object, dark, [x, .25, z], [.1, .5, .1]); break;
    case 'shelf':
      for (const x of [-w * .46, w * .46]) block(object, dark, [x, 1.3, 0], [.14, 2.6, d]);
      for (let y = .3; y < 2.7; y += .7) { block(object, wood, [0, y, 0], [w, .12, d]); for (let i = 0; i < 5; i++) block(object, ['#a7795c', '#829989', '#c5b27c'][i % 3], [-w * .33 + i * w * .16, y + .3, 0], [w * .12, .5, d * .65]); } break;
    case 'forge': case 'stove': {
      const height = f.kind === 'forge' ? 2.2 : 1.4;
      block(object, '#8e9389', [0, height / 2, 0], [w, height, d]); block(object, '#514e43', [0, height * .5, d / 2 + .01], [w * .75, height * .55, .03]);
      const fire = block(object, '#e5aa67', [0, height * .4, d / 2 + .04], [w * .5, height * .24, .04]); fire.material = glow;
      cylinder(object, '#686e65', w * .25, height + .7, -d * .2, .3, 1.7); break;
    }
    case 'sink': table(); block(object, '#e5e1d0', [0, 1.08, 0], [w * .85, .22, d * .8]); block(object, '#89b4af', [0, 1.22, 0], [w * .65, .05, d * .55]); cylinder(object, '#b4a47e', 0, 1.5, -d * .3, .08, .6); break;
    case 'barrel': cylinder(object, wood, 0, .75, 0, Math.min(w, d) * .45, 1.5); for (const y of [.3, 1.2]) cylinder(object, '#777d6b', 0, y, 0, Math.min(w, d) * .46, .12); break;
    case 'chest':
      block(object, wood, [0, .55, 0], [w, 1.1, d]); block(object, '#c09d6b', [0, 1.16, 0], [w, .22, d]);
      for (const x of [-w * .3, w * .3]) block(object, dark, [x, .7, d / 2 + .02], [.14, 1.25, .05]); block(object, '#e0c78a', [0, .95, d / 2 + .07], [.26, .26, .09]); break;
    case 'crate':
      block(object, dark, [0, .1, 0], [w, .2, d]); for (let y = .3; y < 1.2; y += .3) for (const side of [-1, 1]) block(object, wood, [0, y, side * d * .45], [w, .2, .12]);
      for (const x of [-w * .32, 0, w * .32]) block(object, f.contents === 'metal' ? '#9cabaf' : '#ddaa57', [x, .65, 0], [.45, f.contents === 'metal' ? .2 : .4, .4], f.contents !== 'metal'); break;
    case 'sack': case 'basket':
      for (const x of [-w * .25, w * .25]) { block(object, f.kind === 'sack' ? '#d3bd84' : wood, [x, .5, 0], [w * .43, 1, d * .9], true); if (f.kind === 'basket') plant(object, x, .8, 0, .4); } break;
    case 'planter': case 'plot': case 'compost': {
      block(object, '#b78362', [0, .28, 0], [w, .56, d]); block(object, '#796443', [0, .58, 0], [w * .9, .08, d * .85]);
      if (f.kind === 'planter') for (const x of [-w * .3, 0, w * .3]) plant(object, x, .65, 0, .8);
      if (f.kind === 'compost') block(object, '#809565', [0, .7, 0], [w * .75, .3, d * .7], true);
      if (f.kind === 'plot') {
        const growth = new THREE.Group(); growth.name = `growth-${f.id}`; object.add(growth);
        for (const x of [-w * .3, 0, w * .3]) for (const z of [-d * .2, d * .2]) { plant(growth, x, .65, z, .9); const fruit = block(growth, '#dcc26e', [x, 1.35, z], [.15, .24, .15]); fruit.name = 'crop-tip'; }
        growth.visible = false;
      }
      break;
    }
    case 'anvil': block(object, wood, [0, .4, 0], [w * .65, .8, d * .8]); block(object, '#65706d', [0, 1, 0], [w * .65, .5, d * .55]); block(object, '#89918a', [0, 1.3, 0], [w, .23, d * .7]); break;
    case 'grindstone': {
      for (const x of [-w * .3, w * .3]) block(object, wood, [x, .6, 0], [.24, 1.2, d * .8]);
      const wheel = cylinder(object, '#a6aca0', 0, 1.25, 0, .75, .42); wheel.rotation.z = Math.PI / 2; cylinder(object, '#725f45', w * .4, 1.25, 0, .1, .7).rotation.z = Math.PI / 2; break;
    }
    case 'telescope': {
      cylinder(object, dark, 0, 1, 0, .18, 2);
      const tube = cylinder(object, '#c2ab77', 0, 2.4, 0, .48, 3.1); tube.rotation.z = .85;
      for (const x of [-1, 1]) { const leg = block(object, dark, [x * .65, .65, 0], [.2, 1.7, .2]); leg.rotation.z = x * .45; }
      const lens = cylinder(object, '#81bbc5', -1.17, 3.4, 0, .49, .1); lens.rotation.z = .85; break;
    }
    case 'loom': table(); for (const x of [-w * .4, w * .4]) block(object, dark, [x, 1.7, 0], [.13, 1.6, .13]); block(object, wood, [0, 2.4, 0], [w * .9, .12, .12]);
      for (let i = 0; i < 8; i++) block(object, '#d5c39b', [-w * .35 + i * w * .1, 1.7, 0], [.05, 1.3, .06]); for (let i = 0; i < 5; i++) block(object, '#d5c39b', [0, 1.15 + i * .25, .03], [w * .7, .04, .05]); break;
    case 'rack': case 'hooks':
      block(object, dark, [0, 1.8, 0], [w, .16, .18]);
      if (f.kind === 'rack') for (const x of [-w * .44, w * .44]) block(object, dark, [x, 1, 0], [.15, 2, d * .65]);
      for (const x of [-w * .3, 0, w * .3]) { block(object, '#a89973', [x, 1.45, .1], [.08, .7, .12]); block(object, f.contents === 'metal' ? '#a6b3b6' : '#789ba0', [x, 1.05, .1], [f.contents === 'metal' ? .52 : .32, .45, .14], f.contents !== 'metal'); } break;
    case 'chart': block(object, '#efe4c3', [0, 1.9, 0], [w, 1.8, .08]); for (let i = 0; i < 5; i++) block(object, '#738d96', [(i - 2) * w * .16, 1.8 + Math.sin(i) * .45, .06], [.09, .09, .02]); break;
    case 'fishingBench': table();
      for (const x of [-w * .35, w * .35]) { const rod = block(object, dark, [x, 1.6, -.25], [.06, 1.8, .07]); rod.rotation.z = .18; }
      block(object, '#8aaba0', [0, 1.12, 0], [w * .45, .12, d * .65]); cylinder(object, '#d6c392', w * .3, 1.22, .25, .24, .3); break;
    case 'workbench': table(); block(object, '#657675', [-w * .32, 1.13, 0], [.45, .3, .4]); block(object, '#cbb688', [w * .15, 1.08, 0], [w * .35, .08, d * .6]); break;
    case 'starMap': table(); block(object, '#4e7081', [0, 1.07, 0], [w * .88, .04, d * .8]); for (let i = 0; i < 7; i++) block(object, '#f0d88b', [Math.sin(i * 3) * w * .3, 1.11, Math.cos(i * 2) * d * .3], [.07, .03, .07], true); break;
    case 'desk': table(); block(object, '#efe7ce', [.3, 1.07, .1], [.75, .04, .5]); cylinder(object, '#e9c784', -w * .3, 1.45, -.2, .12, .7); break;
    case 'table': table(); cylinder(object, '#e7dcc2', 0, 1.1, 0, .35, .08); break;
  }
  return object;
}
function prop(id: string, kind: Furniture['kind'], x: number, z: number, width: number, depth: number, contents?: Furniture['contents']): Furniture {
  return { id, name: id, kind, x, z, width, depth, rotation: 0, access: { x: 0, z: 0 }, solid: false, contents };
}
/** Exterior differences come from construction styles and a catalog of reusable parts, never building IDs. */
export function createBuilding(building: Building, seed: number): THREE.Group {
  const def = buildingDefinition(building.kind), group = new THREE.Group(), w = def.width, d = def.depth, h = def.height;
  const excluded = new Set<THREE.Object3D>();
  const foundationHeight = def.style === 'dock' ? .4 : 2.8;
  block(group, def.stone ? '#aaa58e' : '#a58b60', [0, .24 - foundationHeight / 2, 0], [w, foundationHeight, d]);
  if (def.style === 'glass') {
    const shell = block(group, '#c0e6d6', [0, h / 2, 0], [w, h, d]); shell.material = glass; excluded.add(shell);
    for (const side of [-1, 1]) for (let z = -d / 2; z <= d / 2; z += 2) block(group, '#d9debf', [side * w / 2, h / 2, z], [.15, h, .15]);
    for (const x of [-w * .3, w * .3]) for (const z of [-d * .3, 0, d * .3]) furnish(group, prop('young-plants', 'planter', x, z, 2, 1.8));
  } else {
    // Separate wall pieces leave an actual opening at the front, not a painted door.
    block(group, def.color, [0, h / 2, -d / 2 + .12], [w, h, .24]);
    for (const side of [-1, 1]) { block(group, def.color, [side * (w / 2 - .12), h / 2, 0], [.24, h, d]); block(group, def.color, [side * (w / 4 + .65), h / 2, d / 2 - .12], [w / 2 - 1.3, h, .24]); }
    block(group, def.color, [0, h - .4, d / 2 - .12], [2.6, .8, .24]);
    block(group, '#6b6250', [0, 1.3, d / 2 - (def.glow ? 2.5 : .25)], [2.3, 2.6, .12]);
    if (def.glow) { const fire = block(group, '#eea14d', [0, .9, d / 2 - 2.3], [1.7, 1, .05]); fire.material = glow; }
    else block(group, '#d6bd83', [.75, 1.2, d / 2 - .08], [.12, .12, .12], true);
    for (const side of [-1, 1]) windowFrame(group, side * w * .32, h * .55, d / 2 + .03);
  }
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) block(group, '#816e51', [x, h / 2, z], [.22, h + .1, .22]);
  if (def.style === 'barn' || def.style === 'dock') for (const side of [-1, 1]) for (let z = -d / 2 + .5; z < d / 2; z += 1) block(group, '#8b7253', [side * (w / 2 + .02), h / 2, z], [.1, h - .4, .08]);
  if (def.style === 'tower') {
    cylinder(group, def.color, 0, h + .65, 0, w * .37, 1.6);
    // Two roof wings leave an open observation slit and a strong telescope silhouette.
    for (const side of [-1, 1]) { const wing = block(group, def.roof, [side * w * .29, h + 1.65, 0], [w * .32, .25, d * .83]); wing.rotation.z = side * -.35; }
    const telescope = furnish(group, prop('roof-telescope', 'telescope', 0, 0, 3.8, 3.2)); telescope.position.y = h + .2;
  } else {
    const rise = def.style === 'barn' ? 2.6 : def.style === 'glass' ? 3 : 2, pitch = Math.atan2(rise, w / 2), slope = Math.hypot(w / 2, rise);
    const geometry = new THREE.BufferGeometry(); geometry.userData.owned = true;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, h, d / 2, w / 2, h, d / 2, 0, h + rise, d / 2, w / 2, h, -d / 2, -w / 2, h, -d / 2, 0, h + rise, -d / 2], 3)); geometry.computeVertexNormals();
    const gables = new THREE.Mesh(geometry, def.style === 'glass' ? glass : material(def.color)); gables.castShadow = def.style !== 'glass'; group.add(gables); excluded.add(gables);
    for (const side of [-1, 1]) {
      const roof = block(group, def.roof, [side * w / 4, h + rise / 2, 0], [slope + .4, .22, d + .6]); roof.rotation.z = -side * pitch;
      if (def.style === 'glass') { roof.material = glass; excluded.add(roof); }
      for (let z = -d / 2; z <= d / 2; z += 1.5) { const beam = block(group, def.style === 'glass' ? '#d9debf' : def.roof, [side * w / 4, h + rise / 2 + .13, z], [slope + .4, .1, .13]); beam.rotation.z = -side * pitch; }
    }
    block(group, '#887451', [0, h + rise, 0], [.18, .18, d + .6]);
  }
  if (def.chimney) block(group, '#8c8b7b', [w * .28, h + 1.25, -d * .27], [1.15, 3, 1.15]);
  if (def.style === 'dock') for (const x of [-w * .43, w * .43]) for (const z of [-d * .43, d * .43]) cylinder(group, '#796044', x, -.7, z, .22, 2.5);
  for (const part of def.exterior) {
    if (part.kind === 'cargo') { furnish(group, prop('cargo', part.contents === 'metal' ? 'crate' : 'sack', part.x, part.z, part.width, part.depth, part.contents)); continue; }
    if (part.kind === 'nets') {
      furnish(group, prop('net-rack', 'loom', part.x, part.z, part.width, part.depth));
      const rope = new THREE.Mesh(ropeGeometry, material('#dcc497')); rope.position.set(part.x, 1.4, part.z + part.depth / 2); group.add(rope);
      cylinder(group, '#c18855', part.x + .3, .35, part.z, .22, .6);
      block(group, '#eac276', [part.x - .3, .45, part.z + .3], [.25, .35, .25], true); continue;
    }
    for (let z = -part.depth / 2 + .2; z < part.depth / 2; z += .4) block(group, '#b59b72', [part.x, .18, part.z + z], [part.width, .16, .36]);
    for (const side of [-1, 1]) for (const end of [-1, 1]) cylinder(group, '#806849', part.x + side * part.width * .45, part.kind === 'pier' ? -.3 : 1.2, part.z + end * part.depth * .4, .12, part.kind === 'pier' ? 2 : 2.5);
    if (part.kind === 'loading' || part.kind === 'porch') block(group, def.roof, [part.x, 2.6, part.z], [part.width + .25, .2, part.depth + .25]);
  }
  batchStaticMeshes(group, excluded);
  group.rotation.y = -THREE.MathUtils.degToRad(building.rotation);
  group.position.set(building.x, buildingElevation(building, seed), building.z); return group;
}
export function createInterior(def: BuildingDefinition, room: RoomDefinition): THREE.Group {
  const group = new THREE.Group(), w = room.width, d = room.depth;
  const excluded = new Set<THREE.Object3D>();
  block(group, '#786c56', [0, -.25, 0], [w + .5, .5, d + .5]);
  for (let z = -d / 2 + .25; z < d / 2; z += .5) block(group, room.floor, [0, .015, z], [w, .04, .47]);
  block(group, room.wall, [0, 1.65, -d / 2], [w + .3, 3.3, .25]);
  for (const side of [-1, 1]) block(group, room.wall, [side * w / 2, .5, 0], [.23, 1, d]);
  for (const side of [-1, 1]) block(group, room.wall, [side * (w / 4 + .65), .25, d / 2], [w / 2 - 1.3, .5, .23]);
  block(group, '#78998b', [0, .04, d / 2 - .2], [2.4, .08, .7]);
  block(group, room.accent, [0, .07, d / 2 - 2], [2.5, .04, 2]);
  for (const x of [-w * .3, w * .3]) windowFrame(group, x, 2.1, -d / 2 + .18);
  for (const f of room.furniture) {
    const object = furnish(group, f);
    const growth = object.getObjectByName(`growth-${f.id}`); if (growth) excluded.add(growth);
    if (f.use) {
      const marker = new THREE.Mesh(ringGeometry, markerMaterial), access = furnitureAccess(f);
      marker.name = `use-${f.id}`; marker.rotation.x = -Math.PI / 2; marker.position.set(access.x, .11, access.z); marker.visible = false; group.add(marker); excluded.add(marker);
    }
  }
  batchStaticMeshes(group, excluded);
  const light = new THREE.PointLight(def.glow ? '#ffb66f' : '#ffe0a0', def.glow ? 22 : 16, Math.max(w, d) * 1.4, 2); light.position.set(0, 4, -2); group.add(light);
  return group;
}
export function updateInterior(group: THREE.Group, building: Building, state: GameState, targetId?: string): void {
  for (const f of buildingDefinition(building.kind).rooms[0].furniture) {
    const marker = group.getObjectByName(`use-${f.id}`); if (marker) marker.visible = targetId === f.id;
    const growth = group.getObjectByName(`growth-${f.id}`); if (!growth) continue;
    const plot = building.plots.find(p => p.furnitureId === f.id); growth.visible = !!plot;
    if (plot) {
      growth.scale.y = .25 + Math.min(1, (state.time - plot.plantedAt) / CROP_SECONDS) * .75;
      growth.traverse(object => { if (object instanceof THREE.Mesh && object.name === 'crop-tip') object.material = material(CROPS[plot.kind].color); });
    }
  }
}
