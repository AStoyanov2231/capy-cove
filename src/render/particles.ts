import * as THREE from 'three';
interface Spark { life: number; x: number; y: number; z: number; vx: number; vy: number; vz: number }
/** Fixed-size visual pool. Pickups never allocate an unbounded trail of meshes. */
export class GatherParticles {
  readonly mesh: THREE.InstancedMesh;
  private sparks: Spark[] = Array.from({ length: 96 }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
  private next = 0;
  private dummy = new THREE.Object3D();
  constructor() {
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), this.sparks.length);
    this.mesh.frustumCulled = false; this.mesh.visible = false;
    for (let i = 0; i < this.sparks.length; i++) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix); }
  }
  emit(x: number, y: number, z: number, color: string): void {
    for (let i = 0; i < 9; i++) {
      const index = this.next++ % this.sparks.length, angle = i * 2.399;
      Object.assign(this.sparks[index], { life: 0.65, x, y: y + 0.45, z, vx: Math.cos(angle) * (0.6 + i % 3 * 0.3), vy: 1.5 + i % 3 * 0.6, vz: Math.sin(angle) * (0.6 + i % 3 * 0.3) });
      this.mesh.setColorAt(index, new THREE.Color(i % 3 ? color : '#fff0b4'));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt: number, visible: boolean): void {
    let active = false;
    this.sparks.forEach((p, i) => {
      p.life = Math.max(0, p.life - dt); this.dummy.scale.setScalar(p.life ? Math.min(1, p.life * 4) : 0);
      if (p.life) { active = true; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= dt * 5; this.dummy.position.set(p.x, p.y, p.z); this.dummy.rotation.set(p.life * 5, p.life * 3, 0); }
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.visible = active && visible; this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose(): void { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.dispose(); }
}
