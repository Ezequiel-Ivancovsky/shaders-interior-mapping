import Phaser from 'phaser';
import { hexToRgb } from './color';

export type FilterSpace = 'internal' | 'external';

export type FilterUniformValue =
  | number
  | boolean
  | string
  | number[]
  | Float32Array
  | undefined;

export type PhaserFilterTarget = Phaser.GameObjects.GameObject & {
  enableFilters?: () => PhaserFilterTarget;
  filters?: {
    internal?: { add: (controller: Phaser.Filters.Controller, index?: number) => Phaser.Filters.Controller };
    external?: { add: (controller: Phaser.Filters.Controller, index?: number) => Phaser.Filters.Controller };
  } | null;
  filterCamera?: Phaser.Cameras.Scene2D.Camera;
  scene?: Phaser.Scene;
};

export interface FilterMetadata {
  id: string;
  displayName: string;
  source: 'custom';
  interiorOnly?: boolean;
  defaults: Record<string, FilterUniformValue>;
  controls: FilterControl[];
}

export interface FilterControl {
  key: string;
  type: 'number' | 'boolean' | 'color' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export type FilterControllerConstructor<T extends BaseFilterController = BaseFilterController> = new (
  camera: Phaser.Cameras.Scene2D.Camera,
  options?: Record<string, unknown>,
) => T;

type Manager = Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager;
type DrawingContext = Phaser.Renderer.WebGL.DrawingContext;

const setUniformValue = (programManager: Phaser.Renderer.WebGL.ProgramManager, name: string, value: unknown): void => {
  programManager.setUniform(name, value);
};

export class BaseFilterController extends Phaser.Filters.Controller {
  readonly metadata: FilterMetadata;
  readonly uniforms: Record<string, FilterUniformValue>;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    renderNodeName: string,
    metadata: FilterMetadata,
    options: Record<string, unknown> = {},
  ) {
    super(camera, renderNodeName);
    this.metadata = metadata;
    this.uniforms = { ...metadata.defaults, ...options } as Record<string, FilterUniformValue>;
    Object.assign(this, this.uniforms);
  }

  syncUniforms(): void {
    for (const key of Object.keys(this.metadata.defaults)) {
      this.uniforms[key] = (this as unknown as Record<string, FilterUniformValue>)[key];
    }
  }
}

export class GeneratedFilterNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  readonly metadata: FilterMetadata;

  constructor(name: string, manager: Manager, metadata: FilterMetadata, fragmentSource: string) {
    super(name, manager, undefined, fragmentSource);
    this.metadata = metadata;
  }

  setupUniforms(controller: BaseFilterController, drawingContext: DrawingContext): void {
    controller.syncUniforms();

    const programManager = this.programManager;
    setUniformValue(programManager, 'uMainSampler', 0);
    setUniformValue(programManager, 'uResolution', [drawingContext.width || 1, drawingContext.height || 1]);

    for (const [key, value] of Object.entries(controller.uniforms)) {
      if (key.toLowerCase().includes('color')) {
        const [r, g, b] = hexToRgb(value);
        const uniformBase = `u${key[0].toUpperCase()}${key.slice(1)}`;
        setUniformValue(programManager, `${uniformBase}R`, r);
        setUniformValue(programManager, `${uniformBase}G`, g);
        setUniformValue(programManager, `${uniformBase}B`, b);
      } else if (typeof value === 'boolean') {
        setUniformValue(programManager, `u${key[0].toUpperCase()}${key.slice(1)}`, value ? 1 : 0);
      } else if (typeof value === 'number') {
        setUniformValue(programManager, `u${key[0].toUpperCase()}${key.slice(1)}`, value);
      }
    }
  }
}

export const addControllerToTarget = <T extends BaseFilterController>(
  target: PhaserFilterTarget | Phaser.Cameras.Scene2D.Camera,
  Controller: FilterControllerConstructor<T>,
  options: Record<string, unknown> = {},
  space: FilterSpace = 'internal',
): T => {
  const camera = 'filterCamera' in target && target.filterCamera
    ? target.filterCamera
    : 'scene' in target && target.scene
      ? target.scene.cameras.main
      : target as Phaser.Cameras.Scene2D.Camera;

  const controller = new Controller(camera, options);

  if ('enableFilters' in target && typeof target.enableFilters === 'function') {
    target.enableFilters();
  }

  const filterList = 'filters' in target ? target.filters : undefined;
  const destination = filterList?.[space] ?? filterList?.internal ?? filterList?.external;

  if (destination?.add) {
    destination.add(controller);
  }

  return controller;
};
