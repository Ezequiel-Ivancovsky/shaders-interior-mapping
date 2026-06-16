import Phaser from 'phaser';
import { PhaserInteriorMappingFilter } from './interior-mapping';

export * from './interior-mapping';

export const registerPhaserFilters = (scene: Phaser.Scene): void => {
  const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  const { renderNodes } = renderer;

  if (!renderNodes.hasNode('PhaserInteriorMappingFilter')) {
    renderNodes.addNodeConstructor('PhaserInteriorMappingFilter', PhaserInteriorMappingFilter);
  }
};
