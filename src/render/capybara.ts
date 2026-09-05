import * as THREE from 'three';
import type { Profile } from '../game/schema';

export const FUR_COLORS = { honey: '#b88958', cocoa: '#805b42', sand: '#d9b985' };
const materials = new Map<string, THREE.MeshStandardMaterial>();
export function material(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  const key = new THREE.Color(color).getHexString();
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  return materials.get(key)!;
}
const box = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.IcosahedronGeometry(1, 0);
export function block(parent: THREE.Object3D, color: THREE.ColorRepresentation, position: [number, number, number], scale: [number, number, number], round = false): THREE.Mesh {
  const mesh = new THREE.Mesh(round ? sphere : box, material(color));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export interface CapyModel { group: THREE.Group; legs: THREE.Mesh[]; head: THREE.Group; heart: THREE.Group }
export function createCapybara(profile: Profile): CapyModel {
  const group = new THREE.Group();
  const fur = FUR_COLORS[profile.fur];
  const light = new THREE.Color(fur).lerp(new THREE.Color('#ffe4ba'), 0.22);
  const dark = new THREE.Color(fur).multiplyScalar(0.75);
  // Broad barrel body, flat muzzle, small ears and squat legs: capybara, not bear.
  const body = block(group, fur, [0, 0.82, -0.12], [1.03, 0.86, 1.65]);
  body.geometry = new THREE.CylinderGeometry(0.64, 0.64, 1.65, 6);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1, 1, 0.94);
  const legs = [-0.35, 0.35].flatMap(x => [-0.66, 0.45].map(z => block(group, dark, [x, 0.23, z], [0.29, 0.42, 0.34])));
  const head = new THREE.Group();
  head.position.set(0, 1.05, 0.55);
  group.add(head);
  block(head, fur, [0, 0.05, 0.06], [0.94, 0.76, 0.98]);
  block(head, light, [0, -0.11, 0.52], [0.96, 0.46, 0.48]);
  for (const side of [-1, 1]) {
    const ear = block(head, fur, [side * 0.38, 0.47, -0.2], [0.24, 0.3, 0.23], true);
    ear.rotation.z = side * -0.2;
    block(head, '#bd8972', [side * 0.38, 0.48, -0.07], [0.11, 0.14, 0.05]);
    block(head, '#302d25', [side * 0.478, 0.15, 0.25], [0.055, 0.11, 0.12]);
    block(head, '#302d25', [side * 0.28, -0.025, 0.772], [0.105, 0.065, 0.025]);
    if (profile.gender === 'female') {
      const lash = block(head, '#302d25', [side * 0.482, 0.21, 0.27], [0.055, 0.035, 0.17]);
      lash.rotation.x = 0.2;
    }
  }
  block(head, dark, [0, -0.24, 0.769], [0.28, 0.028, 0.02]);
  if (profile.accessory === 'orange') {
    block(head, '#f3a52f', [0, 0.62, 0.08], [0.27, 0.25, 0.27], true);
    const leaf = block(head, '#477848', [0.13, 0.84, 0.07], [0.2, 0.035, 0.1]);
    leaf.rotation.z = 0.35;
  } else if (profile.accessory === 'flower') {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      block(head, '#fff3d6', [Math.sin(a) * 0.13 + 0.25, 0.51, Math.cos(a) * 0.13], [0.13, 0.06, 0.13], true);
    }
    block(head, '#f5bc4e', [0.25, 0.56, 0], [0.1, 0.08, 0.1], true);
  }
  const heart = new THREE.Group();
  block(heart, '#ed927e', [-0.14, 0.1, 0], [0.25, 0.27, 0.1], true);
  block(heart, '#ed927e', [0.14, 0.1, 0], [0.25, 0.27, 0.1], true);
  const tip = block(heart, '#ed927e', [0, -0.08, 0], [0.32, 0.32, 0.1]);
  tip.rotation.z = Math.PI / 4;
  heart.position.y = 2.4;
  heart.visible = false;
  group.add(heart);
  return { group, legs, head, heart };
}
export function animateCapybara(model: CapyModel, time: number, moving: boolean, swimming: boolean, emote: boolean): void {
  model.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(time * 12 + i * 2.3) * 0.45 : 0; });
  model.head.rotation.z = moving ? Math.sin(time * 6) * 0.025 : Math.sin(time * 1.4) * 0.025;
  model.group.position.y = swimming ? -0.4 + Math.sin(time * 3) * 0.06 : moving ? Math.abs(Math.sin(time * 12)) * 0.065 : 0;
  model.heart.visible = emote;
  model.heart.position.y = 2.35 + Math.sin(time * 3) * 0.14;
  model.heart.rotation.y = Math.PI / 4;
}
