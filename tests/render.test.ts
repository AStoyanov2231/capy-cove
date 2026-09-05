import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createCapybara, material } from '../src/render/capybara';
import { batchStaticMeshes } from '../src/render/batching';
import { BUILDINGS, buildingDefinition, furnitureAccess } from '../src/game/content';
import { buildingPoint, initialState } from '../src/game/engine';
import { createBuilding, createInterior, disposeWorldObject, updateInterior } from '../src/render/world';
import type { Building } from '../src/game/schema';

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
  it('applies the authoritative clockwise transform to entire building models', () => {
    for (const def of BUILDINGS) for (const rotation of [0, 90, 180, 270] as const) {
      const b: Building = { id: 'render-fixture', kind: def.id, x: -30, z: 20, rotation, storage: {}, plots: [], jobs: [] };
      const model = createBuilding(b, 7241), local = { x: 1, z: def.depth / 2 + 1.5 }, expected = buildingPoint(b, local);
      const point = model.localToWorld(new THREE.Vector3(local.x, 0, local.z));
      expect(point.x).toBeCloseTo(expected.x); expect(point.z).toBeCloseTo(expected.z);
      disposeWorldObject(model);
    }
  });
  it('retains independent greenhouse growth meshes and functional access markers after batching', () => {
    const def = buildingDefinition('greenhouse'), room = def.rooms[0], first = createInterior(def, room), second = createInterior(def, room), state = initialState();
    const b: Building = { id: 'render-greenhouse', kind: 'greenhouse', x: 0, z: 0, rotation: 0, storage: {}, jobs: [], plots: [{ furnitureId: 'bed-0-0', kind: 'carrot', plantedAt: 0 }] };
    state.time = 50; updateInterior(first, b, state, 'bed-0-0');
    expect(first.getObjectByName('growth-bed-0-0')?.visible).toBe(true); expect(second.getObjectByName('growth-bed-0-0')?.visible).toBe(false);
    const marker = first.getObjectByName('use-bed-0-0')!, access = furnitureAccess(room.furniture[0]);
    expect(marker.visible).toBe(true); expect(marker.position.x).toBe(access.x); expect(marker.position.z).toBe(access.z);
    disposeWorldObject(first); disposeWorldObject(second);
  });
});
