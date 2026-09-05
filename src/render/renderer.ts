import * as THREE from 'three';
import type { GameState, PlayerId, Profile } from '../game/schema';
import { isWater } from '../game/content';
import { animateCapybara, createCapybara, type CapyModel } from './capybara';
import { createWorld, randomGenerator, type WorldScene } from './world';

export class IslandRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-30, 30, 30, -30, 0.1, 200);
  private world: WorldScene;
  private models = new Map<PlayerId, { model: CapyModel; key: string }>();
  private target = new THREE.Vector3(0, 0, 0);
  private desiredTarget = new THREE.Vector3();
  private cameraOffset = new THREE.Vector3(26, 34, 34);
  private state: GameState | null = null;
  private localId: PlayerId = 'p1';
  private lobby = true;
  private zoom = 1;
  private frame = 0;
  private lastTime = 0;
  private slowFrames = 0;
  private lowPower = false;
  private lastShadowUpdate = 0;
  private shadowRoster = '';
  private width = 0;
  private height = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private ripples: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private resizeObserver: ResizeObserver;
  private resizeHandler = () => this.resize();
  onFrame?: (project: (id: PlayerId) => { x: number; y: number } | null) => void;
  onContextLost?: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // The island and light are static. Redraw shadows only for moving characters/rewards.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.scene.background = new THREE.Color('#9bcab9');
    this.scene.fog = new THREE.Fog('#9bcab9', 85, 160);
    this.scene.add(new THREE.HemisphereLight('#fff5d8', '#7d9a78', 2.5));
    const sun = new THREE.DirectionalLight('#fff0ce', 3.2);
    sun.position.set(-20, 35, 15); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -35; sun.shadow.camera.right = 35; sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 100;
    sun.shadow.normalBias = 0.07; sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(350, 350), new THREE.MeshStandardMaterial({ color: '#86bfb0', roughness: 0.75 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -1.08; sea.receiveShadow = true; this.scene.add(sea);
    this.ripples = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.09), new THREE.MeshBasicMaterial({ color: '#d5e8d1', transparent: true, opacity: 0.38 }), 200);
    const random = randomGenerator(113);
    for (let i = 0; i < 200; i++) {
      const angle = random() * Math.PI * 2, radius = 28 + random() * 55;
      this.dummy.position.set(Math.cos(angle) * radius, -1.06, Math.sin(angle) * radius);
      this.dummy.rotation.set(-Math.PI / 2, 0, 0); this.dummy.scale.set(0.5 + random() * 2, 1, 1); this.dummy.updateMatrix();
      this.ripples.setMatrixAt(i, this.dummy.matrix);
    }
    this.scene.add(this.ripples);
    this.world = createWorld(); this.scene.add(this.world.group);
    this.resizeObserver = new ResizeObserver(this.resizeHandler); this.resizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.onContextLost?.(); });
    canvas.addEventListener('wheel', event => {
      if (this.lobby) return;
      event.preventDefault(); this.zoom = THREE.MathUtils.clamp(this.zoom - event.deltaY * 0.001, 0.72, 1.5); this.resize();
    }, { passive: false });
    this.resize();
    this.frame = requestAnimationFrame(time => this.animate(time));
  }
  preview(profile: Profile): void {
    if (!this.lobby || this.state) return;
    const own = this.ensureModel('p1', profile);
    own.group.position.set(-2, 0, 8); own.group.rotation.y = 0.6; own.group.scale.setScalar(1.65);
    const friend = this.ensureModel('p2', { name: 'Friend', gender: 'female', fur: 'sand', accessory: 'flower' });
    friend.group.position.set(1.1, 0, 7.6); friend.group.rotation.y = 0.4; friend.group.scale.setScalar(1.65);
  }
  update(state: GameState, localId: PlayerId): void {
    this.state = state; this.localId = localId;
    const roster = `${state.phase}:${Object.values(state.players).map(player => player?.connected || false).join(',')}`;
    if (roster !== this.shadowRoster) { this.shadowRoster = roster; this.renderer.shadowMap.needsUpdate = true; }
    const lobby = state.phase === 'lobby';
    if (this.lobby !== lobby) { this.lobby = lobby; this.resize(); }
    for (const id of ['p1', 'p2'] as const) {
      const player = state.players[id];
      if (player) { const model = this.ensureModel(id, player.profile); model.group.visible = player.connected; model.group.scale.setScalar(lobby ? 1.65 : 1); }
      else if (this.models.has(id)) this.models.get(id)!.model.group.visible = false;
    }
    for (const [id, object] of this.world.items) {
      object.visible = !state.collected.includes(id);
      const currentKind = ['orange', 'seed', 'stone'][state.quest];
      object.children[object.children.length - 1].visible = id.startsWith(currentKind || '__none');
    }
    this.world.questMarkers.forEach((m, i) => { m.visible = i === state.quest; });
    this.world.picnic.visible = state.quest >= 1;
    this.world.flowers.visible = state.quest >= 2;
    this.world.steam.visible = state.quest >= 3;
    if (state.quest !== this.world.group.userData.quest) {
      this.world.group.userData.quest = state.quest;
      this.renderer.shadowMap.needsUpdate = true;
    }
  }
  reset(profile: Profile): void {
    this.state = null; this.lobby = true; this.zoom = 1;
    for (const object of this.world.items.values()) { object.visible = true; object.children[object.children.length - 1].visible = true; }
    this.world.picnic.visible = false; this.world.flowers.visible = false; this.world.steam.visible = false;
    this.world.questMarkers.forEach((m, i) => { m.visible = i === 0; });
    this.preview(profile); this.resize(); this.renderer.shadowMap.needsUpdate = true;
  }
  private ensureModel(id: PlayerId, profile: Profile): CapyModel {
    const key = `${profile.fur}/${profile.gender}/${profile.accessory}`;
    const existing = this.models.get(id);
    if (existing?.key === key) { existing.model.group.visible = true; return existing.model; }
    if (existing) {
      this.scene.remove(existing.model.group);
      // Only the cylinder is unique; the other geometries/materials are shared.
      (existing.model.group.children[0] as THREE.Mesh).geometry.dispose();
    }
    const model = createCapybara(profile); model.group.position.set(id === 'p1' ? -2 : 0, 0, 8); this.scene.add(model.group);
    this.models.set(id, { model, key }); this.renderer.shadowMap.needsUpdate = true; return model;
  }
  private resize(): void {
    this.width = this.canvas.clientWidth; this.height = this.canvas.clientHeight;
    if (!this.width || !this.height) return;
    this.renderer.setSize(this.width, this.height, false);
    const aspect = this.width / this.height;
    const half = this.lobby ? (aspect < 1 ? 33 : 27) : 13 / this.zoom;
    this.camera.left = -half * aspect; this.camera.right = half * aspect; this.camera.top = half; this.camera.bottom = -half;
    this.camera.clearViewOffset();
    if (this.lobby && aspect > 1.1) this.camera.setViewOffset(this.width, this.height, -this.width * 0.19, -this.height * 0.02, this.width, this.height);
    else if (this.lobby) this.camera.setViewOffset(this.width, this.height, 0, -this.height * 0.1, this.width, this.height);
    this.camera.updateProjectionMatrix();
  }
  private animate(ms: number): void {
    this.frame = requestAnimationFrame(t => this.animate(t));
    const time = ms / 1000, elapsed = time - this.lastTime, dt = Math.min(elapsed, 0.05); this.lastTime = time;
    if (!this.lowPower && time > 3) {
      this.slowFrames = Math.max(0, this.slowFrames + (elapsed > 0.05 ? 1 : -1));
      if (this.slowFrames > 24) {
        this.lowPower = true;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 0.8));
        this.renderer.shadowMap.needsUpdate = true;
        this.scene.traverse(object => {
          if (object instanceof THREE.DirectionalLight && object.castShadow) {
            object.shadow.mapSize.set(512, 512); object.shadow.map?.dispose(); object.shadow.map = null;
          }
        });
      }
    }
    const smooth = 1 - Math.exp(-dt * 13);
    const local = this.state?.players[this.localId];
    this.desiredTarget.set(this.lobby ? 0 : local?.x || 0, 0, this.lobby ? 0 : local?.z || 0);
    this.target.lerp(this.desiredTarget, 1 - Math.exp(-dt * 3.5));
    this.camera.position.copy(this.target).add(this.cameraOffset); this.camera.lookAt(this.target);
    for (const [id, { model }] of this.models) {
      const player = this.state?.players[id];
      if (player) {
        model.group.position.x = THREE.MathUtils.lerp(model.group.position.x, player.x, smooth);
        model.group.position.z = THREE.MathUtils.lerp(model.group.position.z, player.z, smooth);
        const delta = Math.atan2(Math.sin(player.angle - model.group.rotation.y), Math.cos(player.angle - model.group.rotation.y));
        model.group.rotation.y += delta * smooth;
      }
      animateCapybara(model, this.reduced && !player?.moving ? 0 : time, player?.moving || false, !!player && isWater(player.x, player.z), !!player && player.emoteUntil > (this.state?.time || 0));
    }
    if (!this.reduced) {
      this.world.items.forEach((object, id) => { object.position.y = 0.38 + Math.sin(time * 2 + id.length + object.position.x) * 0.075; });
      this.world.questMarkers.forEach((m, i) => { m.position.y = 3.9 + Math.sin(time * 2 + i) * 0.16; m.rotation.y = time * 0.5; });
      this.world.butterflies.forEach((b, i) => {
        const origin = b.userData.origin as THREE.Vector3;
        b.position.set(origin.x + Math.sin(time * 0.4 + i) * 1.5, origin.y + Math.sin(time * 1.2 + i) * 0.3, origin.z + Math.cos(time * 0.4 + i));
        b.children.forEach((wing, j) => { wing.rotation.z = Math.sin(time * 13) * (j ? -0.7 : 0.7); });
      });
      this.world.steam.children.forEach((p, i) => { p.position.y = 0.5 + ((time * 0.5 + i * 0.4) % 3); p.scale.setScalar(0.5 + p.position.y * 0.35); });
      this.ripples.position.x = Math.sin(time * 0.2) * 0.5;
    }
    if (time - this.lastShadowUpdate > (this.lowPower ? 0.5 : 0.1) && Object.values(this.state?.players || {}).some(player => player?.moving)) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadowUpdate = time;
    }
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.(id => {
      const model = this.models.get(id)?.model;
      if (!model?.group.visible) return null;
      const p = model.group.position.clone(); p.y += 2.05; p.project(this.camera);
      return { x: (p.x + 1) * this.width / 2, y: (1 - p.y) * this.height / 2 };
    });
  }
  dispose(): void {
    cancelAnimationFrame(this.frame); this.resizeObserver.disconnect();
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => { if ('map' in m) (m.map as THREE.Texture | null)?.dispose(); m.dispose(); });
    this.renderer.dispose();
  }
}
