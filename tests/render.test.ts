import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createCapybara, material } from '../src/render/capybara';
import { batchStaticMeshes } from '../src/render/batching';

describe('render resource ownership', () => {
  it('caches colors by value rather than collapsing all Color objects into one material', () => {
    const honey = material(new THREE.Color('#b88958'));
    const sand = material(new THREE.Color('#d9b985'));
    expect(honey).not.toBe(sand);
    expect(honey).toBe(material('#b88958'));
    expect(sand.color.getHexString()).toBe('d9b985');
  });
  it('batches immutable scenery without swallowing animated children', () => {
    const root = new THREE.Group(); const mat = new THREE.MeshStandardMaterial();
    const geometry = new THREE.BoxGeometry();
    for (let i = 0; i < 3; i++) { const mesh = new THREE.Mesh(geometry, mat); mesh.position.x = i; root.add(mesh); }
    const dynamic = new THREE.Mesh(geometry, mat); root.add(dynamic);
    batchStaticMeshes(root, new Set([dynamic]));
    expect(root.children).toHaveLength(2); expect(dynamic.parent).toBe(root);
    expect(geometry.getAttribute('position').count).toBe(24);
  });
  it('creates independently animated models with shared immutable materials', () => {
    const p = { name: 'Capy', gender: 'female' as const, fur: 'sand' as const, accessory: 'flower' as const };
    const first = createCapybara(p), second = createCapybara(p);
    expect(first.legs).toHaveLength(4); expect(first.group).not.toBe(second.group); expect(first.heart.visible).toBe(false);
    first.legs[0].rotation.x = 1; expect(second.legs[0].rotation.x).toBe(0);
  });
});
