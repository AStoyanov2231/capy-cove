import * as THREE from 'three';
import type { BuildingKind, GameState, PlayerId, Profile } from '../game/schema';
import { CROP_SECONDS, CROPS, buildingDefinition } from '../game/content';
import { buildPosition, canAfford, nodeCovered, placementIssue } from '../game/engine';
import { generateWorld, isWater, riverX, terrainHeight, waterHeight } from '../game/geography';
import { animateCapybara, block, createCapybara, type CapyModel } from './capybara';
import { createBuilding, createInterior, createWorld, disposeWorldObject, type WorldScene } from './world';

export class IslandRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-30, 30, 30, -30, 0.1, 240);
  private sun = new THREE.DirectionalLight('#fff0cf', 3);
  private world: WorldScene;
  private worldSeed = 7241;
  private structures = new THREE.Group();
  private crops = new THREE.Group();
  private buildingModels = new Map<string, THREE.Group>();
  private cropModels = new Map<string, THREE.Group>();
  private interior: THREE.Group | null = null;
  private viewKey = 'outside';
  private ghost: THREE.Mesh;
  private selectedBuilding: BuildingKind | null = null;
  private fishingLine: THREE.Line;
  private bobber: THREE.Mesh;
  private models = new Map<PlayerId, { model: CapyModel; key: string; location: string }>();
  private target = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();
  private cameraOffset = new THREE.Vector3(26, 42, 34);
  private state: GameState | null = null;
  private localId: PlayerId = 'p1';
  private lobby = true;
  private zoom = 1;
  private frame = 0;
  private lastTime = 0;
  private slowFrames = 0;
  private lowPower = false;
  private lastShadowUpdate = 0;
  private width = 0;
  private height = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private resizeObserver: ResizeObserver;
  onFrame?: (project: (id: PlayerId) => { x: number; y: number } | null) => void;
  onContextLost?: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene.background = new THREE.Color('#b8cbb7'); this.scene.fog = new THREE.Fog('#b8cbb7', 85, 155);
    this.scene.add(new THREE.HemisphereLight('#f7f1d9', '#657a65', 2.2));
    this.sun.position.set(-20, 45, 15); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 110 });
    this.sun.shadow.normalBias = 0.08; this.sun.shadow.bias = -0.0002;
    this.scene.add(this.sun, this.sun.target, this.structures, this.crops);
    this.world = createWorld(this.worldSeed); this.scene.add(this.world.group);
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 6), new THREE.MeshBasicMaterial({ color: '#83b99b', transparent: true, opacity: 0.5, depthWrite: false }));
    this.ghost.visible = false; this.scene.add(this.ghost);
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    this.fishingLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#eee2bf' })); this.fishingLine.frustumCulled = false; this.fishingLine.visible = false; this.scene.add(this.fishingLine);
    this.bobber = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshStandardMaterial({ color: '#e1a37a' })); this.bobber.visible = false; this.scene.add(this.bobber);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.onContextLost?.(); });
    canvas.addEventListener('wheel', event => { if (this.lobby) return; event.preventDefault(); this.zoom = THREE.MathUtils.clamp(this.zoom - event.deltaY * 0.001, 0.72, 1.5); this.resize(); }, { passive: false });
    this.resize(); this.frame = requestAnimationFrame(time => this.animate(time));
  }
  preview(profile: Profile): void {
    if (!this.lobby || this.state) return;
    const own = this.ensureModel('p1', profile); own.group.position.set(-2, 0, 8); own.group.rotation.y = 0.6; own.group.scale.setScalar(1.65);
    const friend = this.ensureModel('p2', { name: 'Friend', gender: 'female', fur: 'sand', accessory: 'flower' }); friend.group.position.set(1.1, 0, 7.6); friend.group.rotation.y = 0.4; friend.group.scale.setScalar(1.65);
  }
  selectBuilding(kind: BuildingKind | null): void { this.selectedBuilding = kind; }
  update(state: GameState, localId: PlayerId): void {
    this.state = state; this.localId = localId;
    if (state.seed !== this.worldSeed) {
      this.scene.remove(this.world.group); disposeWorldObject(this.world.group); this.worldSeed = state.seed;
      this.world = createWorld(state.seed); this.scene.add(this.world.group); this.renderer.shadowMap.needsUpdate = true;
    }
    const lobby = state.phase === 'lobby'; if (lobby !== this.lobby) { this.lobby = lobby; this.resize(); }
    const local = state.players[localId], nextView = local?.location ? `${local.location.buildingId}:${local.location.room}` : 'outside';
    if (nextView !== this.viewKey) {
      this.viewKey = nextView;
      if (this.interior) { this.scene.remove(this.interior); disposeWorldObject(this.interior); this.interior = null; }
      if (local?.location) {
        const b = state.buildings.find(b => b.id === local.location!.buildingId);
        if (b) { const def = buildingDefinition(b.kind); this.interior = createInterior(def, def.rooms[local.location.room], local.location.room); this.scene.add(this.interior); }
      }
      this.target.set(local?.location ? 0 : local?.x || 0, local?.location ? 0 : terrainHeight(local?.x || 0, local?.z || 0, state.seed), local?.location ? 0 : local?.z || 0);
      this.scene.background = new THREE.Color(this.interior ? '#354840' : '#b8cbb7');
      this.scene.fog = this.interior ? null : new THREE.Fog('#b8cbb7', 85, 155);
      if (!this.reduced) this.canvas.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 380, easing: 'cubic-bezier(0.16,1,0.3,1)' });
      this.resize(); this.renderer.shadowMap.needsUpdate = true;
    }
    this.world.group.visible = !this.interior; this.structures.visible = !this.interior; this.crops.visible = !this.interior;
    for (const id of ['p1', 'p2'] as const) {
      const p = state.players[id];
      if (p) {
        const model = this.ensureModel(id, p.profile), view = p.location ? `${p.location.buildingId}:${p.location.room}` : 'outside';
        const entry = this.models.get(id)!;
        if (entry.location !== view) { model.group.position.set(p.x, p.location ? 0 : terrainHeight(p.x, p.z, state.seed), p.z); entry.location = view; }
        model.group.visible = p.connected && view === this.viewKey; model.group.scale.setScalar(lobby ? 1.65 : 1);
      } else if (this.models.has(id)) this.models.get(id)!.model.group.visible = false;
    }
    const radius = this.lobby ? 58 : 48;
    for (const node of generateWorld(state.seed).items) {
      const object = this.world.items.get(node.id)!;
      object.visible = !state.depleted[node.id] && !nodeCovered(state, node) && Math.hypot(node.x - (local?.x || 0), node.z - (local?.z || 0)) < radius;
      const ring = object.getObjectByName('resource-ring'); if (ring) ring.visible = !lobby && Math.hypot(node.x - (local?.x || 0), node.z - (local?.z || 0)) < 10;
    }
    for (const b of state.buildings) if (!this.buildingModels.has(b.id)) { const object = createBuilding(b, state.seed); this.buildingModels.set(b.id, object); this.structures.add(object); this.renderer.shadowMap.needsUpdate = true; }
    for (const [id, object] of this.buildingModels) if (!state.buildings.some(b => b.id === id)) { object.removeFromParent(); disposeWorldObject(object); this.buildingModels.delete(id); this.renderer.shadowMap.needsUpdate = true; }
    for (const c of state.crops) {
      let object = this.cropModels.get(c.id);
      if (!object) {
        object = new THREE.Group(); block(object, '#826b4b', [0, 0.04, 0], [1.7, 0.1, 1.7]);
        const plants = new THREE.Group(); plants.name = 'plants'; object.add(plants);
        for (let i = 0; i < 6; i++) { const x = (i % 2 - 0.5) * 0.65, z = (Math.floor(i / 2) - 1) * 0.5;
          block(plants, '#729361', [x, 0.4, z], [0.08, 0.7, 0.08]); block(plants, CROPS[c.kind].color, [x, c.kind === 'wheat' ? 0.75 : 0.23, z], [0.16, 0.28, 0.16], true);
        }
        object.position.set(c.x, terrainHeight(c.x, c.z, state.seed) + 0.06, c.z); this.crops.add(object); this.cropModels.set(c.id, object);
      }
      const growth = Math.min(1, (state.time - c.plantedAt) / CROP_SECONDS); object.getObjectByName('plants')!.scale.y = 0.2 + growth * 0.8;
    }
    for (const [id, object] of this.cropModels) if (!state.crops.some(c => c.id === id)) { object.removeFromParent(); this.cropModels.delete(id); this.renderer.shadowMap.needsUpdate = true; }
  }
  reset(profile: Profile): void {
    this.state = null; this.lobby = true; this.zoom = 1; this.viewKey = 'outside'; this.selectedBuilding = null;
    if (this.interior) { this.scene.remove(this.interior); disposeWorldObject(this.interior); this.interior = null; }
    for (const object of this.buildingModels.values()) disposeWorldObject(object);
    this.structures.clear(); this.crops.clear(); this.buildingModels.clear(); this.cropModels.clear();
    this.world.group.visible = true; this.structures.visible = true; this.crops.visible = true;
    this.world.items.forEach(object => { object.visible = Math.hypot(object.position.x, object.position.z) < 58; });
    this.scene.background = new THREE.Color('#b8cbb7'); this.scene.fog = new THREE.Fog('#b8cbb7', 85, 155);
    this.preview(profile); this.resize(); this.renderer.shadowMap.needsUpdate = true;
  }
  private ensureModel(id: PlayerId, profile: Profile): CapyModel {
    const key = `${profile.fur}/${profile.gender}/${profile.accessory}`, existing = this.models.get(id);
    if (existing?.key === key) { existing.model.group.visible = true; return existing.model; }
    if (existing) { this.scene.remove(existing.model.group); (existing.model.group.children[0] as THREE.Mesh).geometry.dispose(); }
    const model = createCapybara(profile); model.group.position.set(id === 'p1' ? -2 : 0, 0, 8); this.scene.add(model.group);
    this.models.set(id, { model, key, location: 'outside' }); this.renderer.shadowMap.needsUpdate = true; return model;
  }
  private resize(): void {
    this.width = this.canvas.clientWidth; this.height = this.canvas.clientHeight; if (!this.width || !this.height) return;
    this.renderer.setSize(this.width, this.height, false);
    const aspect = this.width / this.height, half = this.lobby ? (aspect < 1 ? 30 : 24) : this.interior ? Math.max(8.5, 9 / aspect) : 13 / this.zoom;
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
      if (this.slowFrames > 24) { this.lowPower = true; this.renderer.setPixelRatio(Math.min(devicePixelRatio, 0.9)); this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; this.renderer.shadowMap.needsUpdate = true; }
    }
    const local = this.state?.players[this.localId], indoors = !!this.interior;
    const x = this.lobby || indoors ? 0 : local?.x || 0, z = this.lobby || indoors ? 0 : local?.z || 0;
    this.desiredTarget.set(x, indoors ? 0 : terrainHeight(x, z, this.worldSeed), z);
    this.target.lerp(this.desiredTarget, 1 - Math.exp(-dt * 5));
    this.camera.position.copy(this.target).add(this.cameraOffset); this.camera.lookAt(this.target);
    const smooth = 1 - Math.exp(-dt * 15);
    for (const [id, { model }] of this.models) {
      const p = this.state?.players[id];
      if (p) { model.group.position.x = THREE.MathUtils.lerp(model.group.position.x, p.x, smooth); model.group.position.z = THREE.MathUtils.lerp(model.group.position.z, p.z, smooth);
        model.group.rotation.y += Math.atan2(Math.sin(p.angle - model.group.rotation.y), Math.cos(p.angle - model.group.rotation.y)) * smooth;
      }
      animateCapybara(model, this.reduced && !p?.moving ? 0 : time, p?.moving || false, !!p && !p.location && isWater(p.x, p.z, this.worldSeed), !!p && p.emoteUntil > (this.state?.time || 0));
      model.group.position.y += p?.location ? 0.12 : terrainHeight(model.group.position.x, model.group.position.z, this.worldSeed);
    }
    this.ghost.visible = !!this.selectedBuilding && !!local && !local.location && !this.lobby;
    if (this.ghost.visible && local && this.state && this.selectedBuilding) {
      const pos = buildPosition(local); this.ghost.position.set(pos.x, terrainHeight(pos.x, pos.z, this.worldSeed) + 0.2, pos.z);
      const valid = !placementIssue(this.state, local, this.selectedBuilding) && canAfford(this.state, buildingDefinition(this.selectedBuilding).cost);
      (this.ghost.material as THREE.MeshBasicMaterial).color.set(valid ? '#81b796' : '#d68b74');
    }
    this.fishingLine.visible = this.bobber.visible = !!local?.fishing && !indoors;
    if (local?.fishing) {
      const bx = riverX(local.z, this.worldSeed), by = waterHeight(local.z, this.worldSeed) + 0.1;
      this.bobber.position.set(bx, by + (this.reduced ? 0 : Math.sin(time * (this.state!.time >= local.fishing.biteAt ? 18 : 3)) * 0.09), local.z);
      const positions = this.fishingLine.geometry.getAttribute('position'); positions.setXYZ(0, local.x, terrainHeight(local.x, local.z, this.worldSeed) + 1.7, local.z);
      positions.setXYZ(1, (local.x + bx) / 2, by + 1.1, local.z); positions.setXYZ(2, bx, this.bobber.position.y, local.z); positions.needsUpdate = true;
    }
    if (!this.reduced) {
      this.world.foam.position.z = Math.sin(time * 0.8) * 0.2;
      this.buildingModels.forEach(object => { const sails = object.getObjectByName('sails'); if (sails) sails.rotation.z = time * 0.28; });
    }
    if (time - this.lastShadowUpdate > (this.lowPower ? 0.5 : 0.2)) {
      this.sun.position.copy(this.target).add(new THREE.Vector3(-20, 45, 15)); this.sun.target.position.copy(this.target);
      this.renderer.shadowMap.needsUpdate = true; this.lastShadowUpdate = time;
    }
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.(id => { const model = this.models.get(id)?.model; if (!model?.group.visible) return null;
      const point = model.group.position.clone(); point.y += 2.05; point.project(this.camera);
      if (Math.abs(point.x) > 1.1 || Math.abs(point.y) > 1.1) return null;
      return { x: (point.x + 1) * this.width / 2, y: (1 - point.y) * this.height / 2 };
    });
  }
  dispose(): void { cancelAnimationFrame(this.frame); this.resizeObserver.disconnect(); disposeWorldObject(this.scene); this.fishingLine.geometry.dispose(); this.ghost.geometry.dispose(); this.bobber.geometry.dispose(); this.renderer.dispose(); }
}
