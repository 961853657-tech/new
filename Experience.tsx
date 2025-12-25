
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AppMode, ParticleData, State } from './types';
import { COLORS, PARTICLE_COUNT, DUST_COUNT } from './constants';

export class Experience {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  mainGroup: THREE.Group;
  particles: ParticleData[] = [];
  clock: THREE.Clock;
  
  constructor(container: HTMLDivElement) {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 50);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 2.2;
    container.appendChild(this.renderer.domElement);
    
    // Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    
    // Post-processing
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45, // strength
      0.4,  // radius
      0.7   // threshold
    );
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    
    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    
    const internalPoint = new THREE.PointLight(COLORS.ORANGE, 2, 15);
    internalPoint.position.set(0, 5, 0);
    this.scene.add(internalPoint);
    
    const spotGold = new THREE.SpotLight(COLORS.GOLD, 1200);
    spotGold.position.set(30, 40, 40);
    spotGold.angle = Math.PI / 4;
    this.scene.add(spotGold);
    
    const spotBlue = new THREE.SpotLight(COLORS.BLUE, 600);
    spotBlue.position.set(-30, 20, -30);
    this.scene.add(spotBlue);
    
    // Objects
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    
    this.createParticles();
    this.createPhotoWall();
    this.createDust();
    
    window.addEventListener('resize', this.onResize.bind(this));
  }
  
  createParticles() {
    const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
    
    const goldMat = new THREE.MeshStandardMaterial({ color: COLORS.GOLD, metalness: 0.9, roughness: 0.1 });
    const greenMat = new THREE.MeshStandardMaterial({ color: COLORS.DARK_GREEN, roughness: 0.8 });
    const redMat = new THREE.MeshPhysicalMaterial({ color: COLORS.RED, metalness: 0.5, roughness: 0.1, clearcoat: 1.0 });
    
    const caneMat = this.createCandyCaneTexture();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let geo = i % 2 === 0 ? boxGeo : sphereGeo;
      let mat = i % 3 === 0 ? goldMat : (i % 3 === 1 ? greenMat : redMat);
      
      // Special Candy Cane
      if (i % 20 === 0) {
        geo = this.createCandyCaneGeometry();
        mat = caneMat;
      }
      
      const mesh = new THREE.Mesh(geo, mat);
      this.mainGroup.add(mesh);
      
      this.particles.push({
        mesh,
        type: 'PARTICLE',
        targetPosition: new THREE.Vector3(),
        targetRotation: new THREE.Euler(),
        targetScale: new THREE.Vector3(1, 1, 1),
        velocity: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2),
        rotationSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.05)
      });
    }
  }

  createCandyCaneGeometry() {
    const points = [];
    for (let i = 0; i <= 10; i++) {
      const angle = (i / 10) * Math.PI * 0.7;
      const x = i < 5 ? 0 : Math.sin(angle - Math.PI/4) * 0.5;
      const y = i * 0.2;
      const z = i < 5 ? 0 : Math.cos(angle - Math.PI/4) * 0.5;
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
  }

  createCandyCaneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 15;
    for(let i=-128; i<256; i+=32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    return new THREE.MeshStandardMaterial({ map: texture });
  }

  createDust() {
    const dustGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const dustMat = new THREE.MeshBasicMaterial({ color: COLORS.CREAM, transparent: true, opacity: 0.6 });
    for(let i=0; i<DUST_COUNT; i++) {
      const mesh = new THREE.Mesh(dustGeo, dustMat);
      this.mainGroup.add(mesh);
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
      mesh.position.copy(pos);
      this.particles.push({
        mesh,
        type: 'DUST',
        targetPosition: pos,
        targetRotation: new THREE.Euler(),
        targetScale: new THREE.Vector3(1,1,1),
        velocity: new THREE.Vector3(0, -0.01, 0),
        rotationSpeed: new THREE.Vector3()
      });
    }
  }

  createPhotoWall() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 512, 512);
    ctx.font = '700 64px Cinzel';
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.fillText('JOYEUX NOEL', 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.addPhoto(texture);
  }

  addPhoto(texture: THREE.Texture) {
    const photoGroup = new THREE.Group();
    const frameGeo = new THREE.BoxGeometry(4.5, 4.5, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: COLORS.GOLD, metalness: 0.8, roughness: 0.2 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    
    const photoGeo = new THREE.PlaneGeometry(4, 4);
    const photoMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const photo = new THREE.Mesh(photoGeo, photoMat);
    photo.position.z = 0.11;
    
    photoGroup.add(frame);
    photoGroup.add(photo);
    this.mainGroup.add(photoGroup);
    
    this.particles.push({
      mesh: photoGroup as unknown as THREE.Mesh,
      type: 'PHOTO',
      targetPosition: new THREE.Vector3(),
      targetRotation: new THREE.Euler(),
      targetScale: new THREE.Vector3(1, 1, 1),
      velocity: new THREE.Vector3(),
      rotationSpeed: new THREE.Vector3()
    });
  }

  update(state: State) {
    const time = this.clock.getElapsedTime();
    
    // Root rotation mapping from Hand position
    this.mainGroup.rotation.y = THREE.MathUtils.lerp(this.mainGroup.rotation.y, state.handX * Math.PI, 0.1);
    this.mainGroup.rotation.x = THREE.MathUtils.lerp(this.mainGroup.rotation.x, state.handY * Math.PI * 0.5, 0.1);

    const photos = this.particles.filter(p => p.type === 'PHOTO');
    const activePhoto = photos[state.activePhotoIndex % photos.length];

    this.particles.forEach((p, i) => {
      if (p.type === 'DUST') {
        p.mesh.position.y -= 0.05;
        if (p.mesh.position.y < -30) p.mesh.position.y = 30;
        return;
      }

      const t = i / PARTICLE_COUNT;
      
      if (state.mode === AppMode.TREE) {
        if (p.type === 'PARTICLE') {
          const maxRadius = 12;
          const height = 25;
          const radius = maxRadius * (1 - t);
          const angle = t * 50 * Math.PI + time * 0.2;
          p.targetPosition.set(
            Math.cos(angle) * radius,
            t * height - 10,
            Math.sin(angle) * radius
          );
          p.targetRotation.set(0, angle, 0);
          p.targetScale.set(1, 1, 1);
        } else if (p.type === 'PHOTO') {
           const idx = photos.indexOf(p);
           const angle = (idx / photos.length) * Math.PI * 2 + time * 0.1;
           const radius = 15;
           p.targetPosition.set(Math.cos(angle) * radius, 5, Math.sin(angle) * radius);
           p.targetRotation.set(0, -angle, 0);
           p.targetScale.set(1, 1, 1);
        }
      } else if (state.mode === AppMode.SCATTER) {
        if (p.type === 'PARTICLE') {
           const angle = t * Math.PI * 2 + time * 0.1;
           const r = 15 + Math.sin(time + t * 10) * 5;
           p.targetPosition.set(
             Math.cos(angle) * r,
             Math.sin(time * 0.5 + t * 5) * 10,
             Math.sin(angle) * r
           );
           // Self rotation in scatter mode
           p.mesh.rotation.x += p.rotationSpeed.x;
           p.mesh.rotation.y += p.rotationSpeed.y;
           p.targetScale.set(1, 1, 1);
        } else if (p.type === 'PHOTO') {
           const idx = photos.indexOf(p);
           const angle = (idx / photos.length) * Math.PI * 2 - time * 0.05;
           p.targetPosition.set(Math.cos(angle) * 20, Math.sin(idx) * 10, Math.sin(angle) * 20);
           p.targetRotation.set(0, time, 0);
           p.targetScale.set(1, 1, 1);
        }
      } else if (state.mode === AppMode.FOCUS) {
        if (p === activePhoto) {
          p.targetPosition.set(0, 2, 35);
          p.targetRotation.set(0, 0, 0);
          p.targetScale.set(4.5, 4.5, 4.5);
        } else {
          // Background particles scatter
          const angle = t * Math.PI * 2;
          p.targetPosition.set(Math.cos(angle) * 40, (t - 0.5) * 60, Math.sin(angle) * 40);
          p.targetScale.set(0.5, 0.5, 0.5);
        }
      }

      // Smooth transition
      p.mesh.position.lerp(p.targetPosition, 0.05);
      p.mesh.scale.lerp(p.targetScale, 0.05);
      if (state.mode !== AppMode.SCATTER || p.type === 'PHOTO') {
        p.mesh.quaternion.slerp(new THREE.Quaternion().setFromEuler(p.targetRotation), 0.05);
      }
    });

    this.composer.render();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
