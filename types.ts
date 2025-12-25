
import * as THREE from 'three';

export enum AppMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  FOCUS = 'FOCUS'
}

export interface State {
  mode: AppMode;
  handX: number;
  handY: number;
  isPinching: boolean;
  isFist: boolean;
  isOpen: boolean;
  activePhotoIndex: number;
  loading: boolean;
  uiHidden: boolean;
}

export interface ParticleData {
  mesh: THREE.Mesh;
  type: 'PARTICLE' | 'PHOTO' | 'DUST';
  targetPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  targetScale: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
}
