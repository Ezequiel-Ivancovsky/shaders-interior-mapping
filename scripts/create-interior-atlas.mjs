#!/usr/bin/env node

const CELL_FLAGS = {
  frontWall: ['--frontWall', '--front', '--curtains'],
  ceiling: ['--ceiling'],
  leftWall: ['--leftWall', '--left'],
  backWall: ['--backWall', '--back'],
  rightWall: ['--rightWall', '--right'],
  midGround: ['--midGround', '--midground', '--mid'],
  floor: ['--floor'],
};

const CELLS = {
  frontWall: { x: 0, y: 0, label: 'front wall' },
  ceiling: { x: 1, y: 0, label: 'ceiling' },
  leftWall: { x: 0, y: 1, label: 'left wall' },
  backWall: { x: 1, y: 1, label: 'back wall' },
  rightWall: { x: 2, y: 1, label: 'right wall' },
  midGround: { x: 0, y: 2, label: 'mid ground' },
  floor: { x: 1, y: 2, label: 'floor' },
};

const HELP_TEXT = `Create a 3x3 interior-mapping atlas PNG.

Usage:
  node scripts/create-interior-atlas.mjs [options]

Required:
  --out <file>                 Output PNG path.

Room image inputs:
  --frontWall <file>           Row 0, column 0. Alias: --front, --curtains.
  --ceiling <file>             Row 0, column 1.
  --leftWall <file>            Row 1, column 0. Alias: --left.
  --backWall <file>            Row 1, column 1. Alias: --back.
  --rightWall <file>           Row 1, column 2. Alias: --right.
  --midGround <file>           Row 2, column 0. Alias: --midground, --mid.
  --floor <file>               Row 2, column 1.

Options:
  --size <px>                  Cell size in pixels. Defaults to the first input image width.
  --fit <mode>                 Resize mode: contain, cover, or fill. Default: contain.
  --background <color>         Atlas background: transparent or #RRGGBB. Default: transparent.
  -h, -help, --help            Show this help text.

Atlas layout:
  row 0: [ frontWall ] [ ceiling  ] [ empty ]
  row 1: [ leftWall  ] [ backWall ] [ rightWall ]
  row 2: [ midGround ] [ floor    ] [ empty ]

Example:
  node scripts/create-interior-atlas.mjs \\
    --frontWall ./front.png \\
    --ceiling ./ceiling.png \\
    --leftWall ./left.png \\
    --backWall ./back.png \\
    --rightWall ./right.png \\
    --midGround ./mid.png \\
    --floor ./floor.png \\
    --size 256 \\
    --out ./room-atlas.png
`;

function printHelp() {
  console.log(HELP_TEXT);
}

function parseArgs(argv) {
  const options = {
    inputs: {},
    out: '',
    size: 0,
    fit: 'contain',
    background: 'transparent',
  };

  const aliases = new Map();
  for (const [cell, flags] of Object.entries(CELL_FLAGS)) {
    for (const flag of flags) {
      aliases.set(flag, cell);
    }
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-h' || arg === '-help' || arg === '--help') {
      options.help = true;
      continue;
    }

    const takeValue = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} expects a value.`);
      }
      i += 1;
      return value;
    };

    if (aliases.has(arg)) {
      options.inputs[aliases.get(arg)] = takeValue();
      continue;
    }

    if (arg === '--out') {
      options.out = takeValue();
      continue;
    }

    if (arg === '--size') {
      const size = Number.parseInt(takeValue(), 10);
      if (!Number.isFinite(size) || size <= 0) {
        throw new Error('--size must be a positive integer.');
      }
      options.size = size;
      continue;
    }

    if (arg === '--fit') {
      const fit = takeValue();
      if (!['contain', 'cover', 'fill'].includes(fit)) {
        throw new Error('--fit must be contain, cover, or fill.');
      }
      options.fit = fit;
      continue;
    }

    if (arg === '--background') {
      options.background = takeValue();
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function parseColor(value) {
  if (value === 'transparent') {
    return { r: 0, g: 0, b: 0, alpha: 0 };
  }

  const match = /^#?([a-fA-F0-9]{6})$/.exec(value);
  if (!match) {
    throw new Error('--background must be transparent or a #RRGGBB color.');
  }

  const hex = match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    alpha: 1,
  };
}

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error('This CLI requires sharp. Install it with: npm install --save-dev sharp');
    }
    throw error;
  }
}

async function resolveCellSize(sharp, options) {
  if (options.size > 0) {
    return options.size;
  }

  const firstInput = Object.values(options.inputs)[0];
  if (!firstInput) {
    throw new Error('At least one room image input is required.');
  }

  const metadata = await sharp(firstInput).metadata();
  if (!metadata.width) {
    throw new Error(`Could not read image width from ${firstInput}.`);
  }

  return metadata.width;
}

async function buildComposite(sharp, imagePath, cellSize, fit, background) {
  const resizeOptions =
    fit === 'fill'
      ? { width: cellSize, height: cellSize, fit: 'fill' }
      : { width: cellSize, height: cellSize, fit, background };

  return {
    input: await sharp(imagePath)
      .ensureAlpha()
      .resize(resizeOptions)
      .png()
      .toBuffer(),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.out) {
    throw new Error('--out is required. Use -h to see all options.');
  }

  const sharp = await loadSharp();
  const background = parseColor(options.background);
  const cellSize = await resolveCellSize(sharp, options);
  const atlasSize = cellSize * 3;
  const composites = [];

  for (const [cell, imagePath] of Object.entries(options.inputs)) {
    const position = CELLS[cell];
    if (!position) {
      continue;
    }

    composites.push({
      ...(await buildComposite(sharp, imagePath, cellSize, options.fit, background)),
      left: position.x * cellSize,
      top: position.y * cellSize,
    });
  }

  await sharp({
    create: {
      width: atlasSize,
      height: atlasSize,
      channels: 4,
      background,
    },
  })
    .composite(composites)
    .png()
    .toFile(options.out);

  console.log(`Created ${options.out} (${atlasSize}x${atlasSize})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
