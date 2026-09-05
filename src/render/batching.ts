import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Collapse immutable scenery by material; animated/reward subtrees stay independent. */
export function batchStaticMeshes(root: THREE.Group, dynamic: Set<THREE.Object3D>): void {
  root.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  function visit(object: THREE.Object3D): void {
    if (dynamic.has(object)) return;
    if (object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh) && !Array.isArray(object.material)) {
      const list = batches.get(object.material) || []; list.push(object); batches.set(object.material, list);
    }
    [...object.children].forEach(visit);
  }
  visit(root);
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld); return geometry;
    });
    const geometry = mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    if (!geometry) continue;
    geometry.userData.owned = true;
    const combined = new THREE.Mesh(geometry, material);
    combined.castShadow = meshes.some(m => m.castShadow); combined.receiveShadow = meshes.some(m => m.receiveShadow);
    meshes.forEach(mesh => mesh.removeFromParent()); root.add(combined);
  }
}
