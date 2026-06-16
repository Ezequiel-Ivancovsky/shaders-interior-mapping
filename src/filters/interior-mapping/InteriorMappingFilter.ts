import Phaser from 'phaser';
import fragmentSource from './interior-mapping.frag?raw';
import {
  addControllerToTarget,
  BaseFilterController,
  FilterMetadata,
  FilterSpace,
  GeneratedFilterNode,
  PhaserFilterTarget,
} from '../runtime';

type Manager = Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager;

export interface InteriorMappingFilterOptions {
  cameraX?: number;
  cameraY?: number;
  viewWidth?: number;
  viewHeight?: number;
  roomDepth?: number;
  midGroundDepth?: number;
  midGroundX?: number;
  midGroundY?: number;
  midGroundScale?: number;
  midGroundAlpha?: number;
  frontWallAlpha?: number;
  chromaKeyColor?: number | string | number[];
  chromaKeyTolerance?: number;
  brightness?: number;
  leftWallTiled?: boolean;
  leftWallTileSizeX?: number;
  leftWallTileSizeY?: number;
  rightWallTiled?: boolean;
  rightWallTileSizeX?: number;
  rightWallTileSizeY?: number;
  ceilingTiled?: boolean;
  ceilingTileSizeX?: number;
  ceilingTileSizeY?: number;
  floorTiled?: boolean;
  floorTileSizeX?: number;
  floorTileSizeY?: number;
}

export const InteriorMappingFilterMetadata = {
  id: 'InteriorMappingFilter',
  displayName: 'Interior Mapping',
  source: 'custom',
  interiorOnly: true,
  defaults: {
    cameraX: 0,
    cameraY: 0,
    viewWidth: 1,
    viewHeight: 1,
    roomDepth: 1.6,
    midGroundDepth: 0.45,
    midGroundX: 0,
    midGroundY: 0,
    midGroundScale: 0.7,
    midGroundAlpha: 1,
    frontWallAlpha: 1,
    chromaKeyColor: 0x000000,
    chromaKeyTolerance: 0.12,
    brightness: 1,
    leftWallTiled: false,
    leftWallTileSizeX: 1,
    leftWallTileSizeY: 1,
    rightWallTiled: false,
    rightWallTileSizeX: 1,
    rightWallTileSizeY: 1,
    ceilingTiled: false,
    ceilingTileSizeX: 1,
    ceilingTileSizeY: 1,
    floorTiled: false,
    floorTileSizeX: 1,
    floorTileSizeY: 1,
  },
  controls: [
    { key: 'cameraX', type: 'number', min: -1, max: 1, step: 0.01 },
    { key: 'cameraY', type: 'number', min: -1, max: 1, step: 0.01 },
    { key: 'viewWidth', type: 'number', min: 0.25, max: 3, step: 0.01 },
    { key: 'viewHeight', type: 'number', min: 0.25, max: 3, step: 0.01 },
    { key: 'roomDepth', type: 'number', min: 0.25, max: 5, step: 0.01 },
    { key: 'midGroundDepth', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'midGroundX', type: 'number', min: -2, max: 2, step: 0.01 },
    { key: 'midGroundY', type: 'number', min: -2, max: 2, step: 0.01 },
    { key: 'midGroundScale', type: 'number', min: 0.1, max: 3, step: 0.01 },
    { key: 'midGroundAlpha', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'frontWallAlpha', type: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'chromaKeyColor', type: 'color' },
    { key: 'chromaKeyTolerance', type: 'number', min: 0.01, max: 1.0, step: 0.01 },
    { key: 'brightness', type: 'number', min: 0.2, max: 2, step: 0.01 },
    { key: 'leftWallTiled', type: 'boolean' },
    { key: 'leftWallTileSizeX', type: 'number', min: 0.05, max: 1, step: 0.01 },
    { key: 'leftWallTileSizeY', type: 'number', min: 0.05, max: 1, step: 0.01 },
    { key: 'rightWallTiled', type: 'boolean' },
    { key: 'rightWallTileSizeX', type: 'number', min: 0.05, max: 1, step: 0.01 },
    { key: 'rightWallTileSizeY', type: 'number', min: 0.05, max: 1, step: 0.01 },
    { key: 'ceilingTiled', type: 'boolean' },
    { key: 'ceilingTileSizeX', type: 'number', min: 0.05, max: 1, step: 0.01 },
    { key: 'ceilingTileSizeY', type: 'number', min: 0.05, max: 1, step: 0.01 },
    { key: 'floorTiled', type: 'boolean' },
    { key: 'floorTileSizeX', type: 'number', min: 0.05, max: 1, step: 0.01 },
    { key: 'floorTileSizeY', type: 'number', min: 0.05, max: 1, step: 0.01 },
  ],
} satisfies FilterMetadata;

export class PhaserInteriorMappingFilter extends GeneratedFilterNode {
  constructor(manager: Manager) {
    super('PhaserInteriorMappingFilter', manager, InteriorMappingFilterMetadata, fragmentSource);
  }
}

export class InteriorMappingFilter extends BaseFilterController {
  declare cameraX: number;
  declare cameraY: number;
  declare viewWidth: number;
  declare viewHeight: number;
  declare roomDepth: number;
  declare midGroundDepth: number;
  declare midGroundX: number;
  declare midGroundY: number;
  declare midGroundScale: number;
  declare midGroundAlpha: number;
  declare frontWallAlpha: number;
  declare chromaKeyColor: number | string | number[];
  declare chromaKeyTolerance: number;
  declare brightness: number;
  declare leftWallTiled: boolean;
  declare leftWallTileSizeX: number;
  declare leftWallTileSizeY: number;
  declare rightWallTiled: boolean;
  declare rightWallTileSizeX: number;
  declare rightWallTileSizeY: number;
  declare ceilingTiled: boolean;
  declare ceilingTileSizeX: number;
  declare ceilingTileSizeY: number;
  declare floorTiled: boolean;
  declare floorTileSizeX: number;
  declare floorTileSizeY: number;

  constructor(camera: Phaser.Cameras.Scene2D.Camera, options: InteriorMappingFilterOptions = {}) {
    super(camera, 'PhaserInteriorMappingFilter', InteriorMappingFilterMetadata, options as Record<string, unknown>);
  }
}

export const addInteriorMappingFilter = (
  target: PhaserFilterTarget | Phaser.Cameras.Scene2D.Camera,
  options: InteriorMappingFilterOptions = {},
  space: FilterSpace = 'internal',
): InteriorMappingFilter => addControllerToTarget(target, InteriorMappingFilter, options as Record<string, unknown>, space);
