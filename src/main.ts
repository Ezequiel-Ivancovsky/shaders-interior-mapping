import Phaser from 'phaser';
import { GUI } from 'lil-gui';
import '../node_modules/lil-gui/dist/lil-gui.css';
import './style.css';
import {
  addInteriorMappingFilter,
  InteriorMappingFilter,
  InteriorMappingFilterMetadata,
  InteriorMappingFilterOptions,
  registerPhaserFilters,
} from './filters';

const GRID_SIZE = 10;
const ROOM_SIZE = 240;
const ROOM_GAP = 0;
const ROOM_STRIDE = ROOM_SIZE + ROOM_GAP;
const WORLD_PADDING = 0;
const CAMERA_SPEED = 420;
const ZOOM_SPEED = 1.4;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.4;
const DEFAULT_ZOOM = 1.6;
const ASSET_BASE = '/assets/';
const SINGLE_ROOM_SIZE = ROOM_SIZE * 2;
const SINGLE_ROOM_BACKGROUND_COLOR = 0xb9ddff;

interface InteriorRoom {
  sprite: Phaser.GameObjects.Image;
  filter: InteriorMappingFilter;
}

interface DemoSettings {
  singleRoomMode: boolean;
}

type InteriorMappingGuiState = Required<InteriorMappingFilterOptions>;

const SINGLE_ROOM_DEFAULTS: InteriorMappingGuiState = {
  ...(InteriorMappingFilterMetadata.defaults as InteriorMappingGuiState),
  roomDepth: 1.65,
  midGroundY: 0.57,
  brightness: 1,
};

class DemoScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'Z' | 'X', Phaser.Input.Keyboard.Key>;
  private gui!: GUI;
  private demoSettings: DemoSettings = {
    singleRoomMode: false,
  };
  private singleRoomState: InteriorMappingGuiState = { ...SINGLE_ROOM_DEFAULTS };
  private singleRoomControllers: Array<{ updateDisplay: () => unknown }> = [];
  private rooms: InteriorRoom[] = [];
  private singleRoom!: InteriorRoom;
  private galaxyBackground!: Phaser.GameObjects.Image;
  private singleRoomBackground!: Phaser.GameObjects.Rectangle;
  private cameraReadout: HTMLElement | null = null;
  private fpsReadout: HTMLElement | null = null;
  private fpsUpdateTimer = 0;

  constructor() {
    super('DemoScene');
  }

  preload(): void {
    this.load.image('interiorAtlas', `${ASSET_BASE}boxwindow-shader.png`);
    this.load.image('galaxyBackground', `${ASSET_BASE}galaxy-background.webp`);
  }

  create(): void {
    registerPhaserFilters(this);
    this.cameras.main.setForceComposite(true);
    this.game.canvas.tabIndex = 0;
    this.cameraReadout = document.querySelector('#camera-readout');
    this.fpsReadout = document.querySelector('#fps-readout');

    this.cameras.main.setBackgroundColor(0x111319);
    this.addBackdrop();
    this.createRoomGrid();
    this.createSingleRoom();
    this.configureCamera();
    this.createGui();
    this.applyMode();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,Z,X') as Record<'W' | 'A' | 'S' | 'D' | 'Z' | 'X', Phaser.Input.Keyboard.Key>;
  }

  update(_time: number, delta: number): void {
    const seconds = delta / 1000;

    this.moveCamera(seconds);
    this.zoomCamera(seconds);
    this.updateActiveRoomFilters();
    this.updateCameraReadout();
    this.updateFpsReadout(delta);
  }

  private addBackdrop(): void {
    const worldSize = this.getWorldSize();
    this.galaxyBackground = this.add.image(0, 0, 'galaxyBackground').setOrigin(0);
    this.singleRoomBackground = this.add.rectangle(
      0,
      0,
      worldSize,
      worldSize,
      SINGLE_ROOM_BACKGROUND_COLOR,
      1,
    ).setOrigin(0).setVisible(false);

    this.galaxyBackground.setDisplaySize(worldSize, worldSize);

    // graphics.lineStyle(1, 0x2e5160, 0.26);
    // for (let line = 0; line <= GRID_SIZE; line += 1) {
    //   const position = WORLD_PADDING - ROOM_GAP * 0.5 + line * ROOM_STRIDE;
    //   graphics.lineBetween(WORLD_PADDING - ROOM_GAP * 0.5, position, worldSize - WORLD_PADDING + ROOM_GAP * 0.5, position);
    //   graphics.lineBetween(position, WORLD_PADDING - ROOM_GAP * 0.5, position, worldSize - WORLD_PADDING + ROOM_GAP * 0.5);
    // }

    // graphics.lineStyle(2, 0xf2d07b, 0.4);
    // graphics.strokeRect(
    //   WORLD_PADDING - ROOM_GAP * 0.5,
    //   WORLD_PADDING - ROOM_GAP * 0.5,
    //   GRID_SIZE * ROOM_STRIDE,
    //   GRID_SIZE * ROOM_STRIDE,
    // );
  }

  private createRoomGrid(): void {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
        const x = ROOM_SIZE/2 + column * ROOM_STRIDE;
        const y = ROOM_SIZE/2 + row * ROOM_STRIDE;
        const sprite = this.add.image(x, y, 'interiorAtlas');

        sprite.setDisplaySize(ROOM_SIZE, ROOM_SIZE);
        sprite.enableFilters();

        const filter = addInteriorMappingFilter(sprite, {
          viewWidth: 1,
          viewHeight: 1,
          roomDepth: 1.65,
          midGroundDepth: Phaser.Math.FloatBetween(0.2, 0.85),
          midGroundX: Phaser.Math.FloatBetween(-0.5, 0.5),
          midGroundY: 0.57,
          midGroundScale: 0.72,
          midGroundAlpha: 0.92,
          frontWallAlpha: 1,
          brightness: Phaser.Math.FloatBetween(0.1, 1.5),
        });

        this.rooms.push({ sprite, filter });
      }
    }
  }

  private createSingleRoom(): void {
    const worldSize = this.getWorldSize();
    const sprite = this.add.image(worldSize * 0.5, worldSize * 0.5, 'interiorAtlas');

    sprite.setDisplaySize(SINGLE_ROOM_SIZE, SINGLE_ROOM_SIZE);
    sprite.enableFilters();
    sprite.setVisible(false);

    const filter = addInteriorMappingFilter(sprite, this.singleRoomState);
    this.singleRoom = { sprite, filter };
    this.applySingleRoomFilterState();
  }

  private createGui(): void {
    this.gui = new GUI({ title: 'Interior Mapping' });
    this.gui.add(this.demoSettings, 'singleRoomMode')
      .name('Single room mode')
      .onChange(() => {
        this.applyMode();
        this.returnKeyboardFocus();
      });
    this.gui.add({ reset: () => this.resetSingleRoomConfig() }, 'reset').name('Reset single room');

    const filterFolder = this.gui.addFolder('Single room filter');

    for (const control of InteriorMappingFilterMetadata.controls) {
      const key = control.key as keyof InteriorMappingGuiState;

      if (control.type === 'color') {
        const controller = filterFolder.addColor(this.singleRoomState, key).name(control.key).onChange(() => this.applySingleRoomFilterState());
        this.singleRoomControllers.push(controller);
        continue;
      }

      if (control.type === 'number') {
        const controller = filterFolder.add(
          this.singleRoomState,
          key,
          control.min,
          control.max,
          control.step,
        ).name(control.key).onChange(() => this.applySingleRoomFilterState());
        this.singleRoomControllers.push(controller);
      }
    }
  }

  private applyMode(): void {
    if (!this.singleRoom) {
      return;
    }

    for (const room of this.rooms) {
      room.sprite.setVisible(!this.demoSettings.singleRoomMode);
    }

    this.galaxyBackground.setVisible(!this.demoSettings.singleRoomMode);
    this.singleRoomBackground.setVisible(this.demoSettings.singleRoomMode);
    this.singleRoom.sprite.setVisible(this.demoSettings.singleRoomMode);
    this.singleRoom.sprite.setActive(this.demoSettings.singleRoomMode);
    this.cameras.main.centerOn(this.getWorldSize() * 0.5, this.getWorldSize() * 0.5);
    this.updateActiveRoomFilters();
    this.returnKeyboardFocus();
  }

  private applySingleRoomFilterState(): void {
    if (!this.singleRoom) {
      return;
    }

    Object.assign(this.singleRoom.filter, this.singleRoomState);
    this.singleRoom.sprite.setDisplaySize(
      SINGLE_ROOM_SIZE * this.singleRoomState.viewWidth,
      SINGLE_ROOM_SIZE * this.singleRoomState.viewHeight,
    );
  }

  private resetSingleRoomConfig(): void {
    Object.assign(this.singleRoomState, SINGLE_ROOM_DEFAULTS);
    this.applySingleRoomFilterState();

    for (const controller of this.singleRoomControllers) {
      controller.updateDisplay();
    }

    this.returnKeyboardFocus();
  }

  private returnKeyboardFocus(): void {
    window.setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      this.game.canvas.focus({ preventScroll: true });
      this.input.keyboard!.enabled = true;
    }, 0);
  }

  private configureCamera(): void {
    const worldSize = this.getWorldSize();

    this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    this.cameras.main.setZoom(DEFAULT_ZOOM);
    this.cameras.main.centerOn(worldSize * 0.5, worldSize * 0.5);
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
  }

  private moveCamera(seconds: number): void {
    const camera = this.cameras.main;
    let xDirection = 0;
    let yDirection = 0;

    if (this.keys.A.isDown || this.cursors.left?.isDown) {
      xDirection -= 1;
    }

    if (this.keys.D.isDown || this.cursors.right?.isDown) {
      xDirection += 1;
    }

    if (this.keys.W.isDown || this.cursors.up?.isDown) {
      yDirection -= 1;
    }

    if (this.keys.S.isDown || this.cursors.down?.isDown) {
      yDirection += 1;
    }

    if (xDirection !== 0 && yDirection !== 0) {
      const diagonalScale = Math.SQRT1_2;
      xDirection *= diagonalScale;
      yDirection *= diagonalScale;
    }

    camera.scrollX += xDirection * CAMERA_SPEED * seconds;
    camera.scrollY += yDirection * CAMERA_SPEED * seconds;
  }

  private zoomCamera(seconds: number): void {
    const camera = this.cameras.main;
    const previousZoom = camera.zoom;
    let zoomDirection = 0;

    if (this.keys.X.isDown) {
      zoomDirection -= 1;
    }

    if (this.keys.Z.isDown) {
      zoomDirection += 1;
    }

    if (zoomDirection === 0) {
      return;
    }

    const nextZoom = Phaser.Math.Clamp(previousZoom + zoomDirection * ZOOM_SPEED * seconds, MIN_ZOOM, MAX_ZOOM);

    if (nextZoom === previousZoom) {
      return;
    }

    const centerX = camera.worldView.centerX;
    const centerY = camera.worldView.centerY;
    camera.setZoom(nextZoom);
    camera.centerOn(centerX, centerY);
  }

  private updateActiveRoomFilters(): void {
    if (this.demoSettings.singleRoomMode) {
      this.applySingleRoomFilterState();
      return;
    }

    const camera = this.cameras.main;
    const cameraCenterX = camera.worldView.centerX;
    const cameraCenterY = camera.worldView.centerY;
    const view = camera.worldView;
    const cullPadding = ROOM_SIZE;
    const influence = ROOM_SIZE * 1.45;
    const zoomPerspectiveScale = Phaser.Math.Clamp(camera.zoom / DEFAULT_ZOOM, 0.35, 0.5);

    for (const room of this.rooms) {
      const isVisible = room.sprite.x + ROOM_SIZE * 0.5 >= view.left - cullPadding
        && room.sprite.x - ROOM_SIZE * 0.5 <= view.right + cullPadding
        && room.sprite.y + ROOM_SIZE * 0.5 >= view.top - cullPadding
        && room.sprite.y - ROOM_SIZE * 0.5 <= view.bottom + cullPadding;

      room.sprite.setVisible(isVisible);

      if (!isVisible) {
        continue;
      }

      const offsetX = ((cameraCenterX - room.sprite.x) / influence) * zoomPerspectiveScale;
      const offsetY = ((cameraCenterY - room.sprite.y) / influence) * zoomPerspectiveScale;
      const offsetLength = Math.hypot(offsetX, offsetY);
      const offsetScale = offsetLength > 1 ? 1 / offsetLength : 1;

      room.filter.cameraX = offsetX * offsetScale;
      room.filter.cameraY = offsetY * offsetScale;
    }
  }

  private updateCameraReadout(): void {
    if (!this.cameraReadout) {
      return;
    }

    const camera = this.cameras.main;
    this.cameraReadout.textContent = `x ${Math.round(camera.scrollX)} y ${Math.round(camera.scrollY)} zoom ${camera.zoom.toFixed(2)}`;
  }

  private updateFpsReadout(delta: number): void {
    if (!this.fpsReadout) {
      return;
    }

    this.fpsUpdateTimer += delta;

    if (this.fpsUpdateTimer < 250) {
      return;
    }

    this.fpsUpdateTimer = 0;
    this.fpsReadout.textContent = `fps ${Math.round(this.game.loop.actualFps)}`;
  }

  private getWorldSize(): number {
    return WORLD_PADDING * 2 + (GRID_SIZE - 1) * ROOM_STRIDE + ROOM_SIZE;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#111319',
  pixelArt: false,
  roundPixels: false,
  scene: DemoScene,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
