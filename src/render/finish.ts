import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/** One bounded finishing pipeline. Slow devices fall back to the lit scene, not a lower-fidelity game. */
export class SceneFinish {
  private composer: EffectComposer;
  private ambient: SSAOPass;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private output: OutputPass;
  private renderPass: RenderPass;
  private enabled = true;
  private disposed = false;
  private antialias: ShaderPass;
  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera); this.composer.addPass(this.renderPass);
    this.ambient = new SSAOPass(scene, camera, 512, 512);
    this.ambient.kernelRadius = 1.3; this.ambient.minDistance = 0.001; this.ambient.maxDistance = 0.06;
    this.ambient.enabled = !matchMedia('(pointer: coarse)').matches;
    this.composer.addPass(this.ambient);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.16, 0.45, 1.12); this.composer.addPass(this.bloom);
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.2126,.7152,.0722));
        c.rgb=mix(vec3(l),c.rgb,1.075);float edge=smoothstep(.3,.79,length(vUv-.5));
        gl_FragColor=vec4(c.rgb*(1.-edge*.075),c.a);}`,
    });
    this.composer.addPass(this.grade); this.output = new OutputPass(); this.composer.addPass(this.output);
    this.antialias = new ShaderPass(FXAAShader); this.composer.addPass(this.antialias);
  }
  resize(width: number, height: number): void {
    if (this.disposed) return;
    this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(width, height);
    const ratio = this.renderer.getPixelRatio();
    this.antialias.uniforms.resolution.value.set(1 / Math.max(1, width * ratio), 1 / Math.max(1, height * ratio));
    this.ambient.setSize(Math.max(1, Math.floor(width * ratio * 0.65)), Math.max(1, Math.floor(height * ratio * 0.65)));
  }
  lowPower(): void { this.enabled = false; this.dispose(); }
  render(dt: number): void { if (this.enabled) this.composer.render(dt); else this.renderer.render(this.scene, this.camera); }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.ambient.dispose(); this.bloom.dispose(); this.grade.dispose(); this.output.dispose(); this.antialias.dispose(); this.composer.dispose(); }
}

export function waterMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: '#50bcb4', roughness: 0.25, metalness: 0.12, side: THREE.DoubleSide });
  const clock = { value: 0 }; material.userData.clock = clock; material.userData.owned = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.coveTime = clock;
    shader.vertexShader = 'varying vec3 coveWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n coveWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader = 'uniform float coveTime; varying vec3 coveWorld;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float ripple=sin(coveWorld.x*3.1+coveWorld.z*1.5-coveTime*1.8)*sin(coveWorld.z*3.8-coveTime*1.3);
      float sparkle=smoothstep(.82,.98,ripple);
      float broad=sin(coveWorld.x*.8+coveWorld.z*.55-coveTime*.6)*.035;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.88,.78),sparkle*.32)+broad;`);
  };
  material.customProgramCacheKey = () => 'capy-water-v1'; return material;
}
export function windMaterial(color: string, strength = 0.09): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
  const clock = { value: 0 }; material.userData.clock = clock; material.userData.owned = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.coveTime = clock;
    shader.vertexShader = 'uniform float coveTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 windOrigin=vec3(0.);
      #ifdef USE_INSTANCING
      windOrigin=instanceMatrix[3].xyz;
      #endif
      float tip=max(0.,position.y+.5);
      transformed.x+=sin(coveTime*1.5+windOrigin.x*.45+windOrigin.z*.3)*tip*${strength.toFixed(3)};`);
  };
  material.customProgramCacheKey = () => `capy-wind-${strength}`; return material;
}
