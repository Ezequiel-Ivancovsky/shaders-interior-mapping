#pragma phaserTemplate(shaderName)
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uCameraX;
uniform float uCameraY;
uniform float uViewWidth;
uniform float uViewHeight;
uniform float uRoomDepth;
uniform float uMidGroundDepth;
uniform float uMidGroundX;
uniform float uMidGroundY;
uniform float uMidGroundScale;
uniform float uMidGroundAlpha;
uniform float uFrontWallAlpha;
uniform float uChromaKeyColorR;
uniform float uChromaKeyColorG;
uniform float uChromaKeyColorB;
uniform float uChromaKeyTolerance;
uniform float uBrightness;
uniform float uLeftWallTiled;
uniform float uLeftWallTileSizeX;
uniform float uLeftWallTileSizeY;
uniform float uRightWallTiled;
uniform float uRightWallTileSizeX;
uniform float uRightWallTileSizeY;
uniform float uCeilingTiled;
uniform float uCeilingTileSizeX;
uniform float uCeilingTileSizeY;
uniform float uFloorTiled;
uniform float uFloorTileSizeX;
uniform float uFloorTileSizeY;

varying vec2 outTexCoord;

#pragma phaserTemplate(fragmentHeader)

vec4 sampleCell(vec2 cell, vec2 uv) {
  vec2 safeUv = clamp(uv, vec2(0.002), vec2(0.998));
  vec2 atlasUv = vec2(
    (cell.x + safeUv.x) / 3.0,
    1.0 - (cell.y + 1.0 - safeUv.y) / 3.0
  );

  return texture2D(uMainSampler, atlasUv);
}

float keyedAlpha(vec3 color) {
  vec3 keyColor = vec3(uChromaKeyColorR, uChromaKeyColorG, uChromaKeyColorB);
  float distanceToKey = distance(color, keyColor);
  float tolerance = max(uChromaKeyTolerance, 0.001);

  return smoothstep(tolerance * 0.35, tolerance, distanceToKey);
}

float rectMask(vec2 uv) {
  return step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
}

vec2 tileSurfaceUv(vec2 uv, float tiled, vec2 tileSize) {
  if (tiled < 0.5) {
    return uv;
  }

  return fract(uv / max(tileSize, vec2(0.001)));
}

vec3 roomRay(vec2 uv) {
  vec2 surface = vec2(uv.x * 2.0 - 1.0, (1.0 - uv.y) * 2.0 - 1.0);
  vec3 origin = vec3(uCameraX, uCameraY, -1.0);
  vec3 target = vec3(surface, 0.0);

  return normalize(target - origin);
}

vec4 sampleRoom(vec2 uv) {
  vec3 origin = vec3(uCameraX, uCameraY, -1.0);
  vec3 direction = roomRay(uv);
  float depth = max(uRoomDepth, 0.001);
  float bestT = 9999.0;
  vec2 bestUv = uv;
  vec2 bestCell = vec2(1.0, 1.0);
  float bestShade = 1.0;

  float tBack = (depth - origin.z) / max(direction.z, 0.0001);
  vec3 hitBack = origin + direction * tBack;

  if (tBack > 0.0 && abs(hitBack.x) <= 1.0 && abs(hitBack.y) <= 1.0 && tBack < bestT) {
    bestT = tBack;
    bestUv = vec2(hitBack.x * 0.5 + 0.5, 0.5 - hitBack.y * 0.5);
    bestCell = vec2(1.0, 1.0);
    bestShade = 0.82;
  }

  if (direction.x < -0.0001) {
    float tLeft = (-1.0 - origin.x) / direction.x;
    vec3 hitLeft = origin + direction * tLeft;

    if (tLeft > 0.0 && hitLeft.z >= 0.0 && hitLeft.z <= depth && abs(hitLeft.y) <= 1.0 && tLeft < bestT) {
      bestT = tLeft;
      bestUv = tileSurfaceUv(
        vec2(hitLeft.z / depth, 0.5 - hitLeft.y * 0.5),
        uLeftWallTiled,
        vec2(uLeftWallTileSizeX, uLeftWallTileSizeY)
      );
      bestCell = vec2(0.0, 1.0);
      bestShade = 0.72;
    }
  }

  if (direction.x > 0.0001) {
    float tRight = (1.0 - origin.x) / direction.x;
    vec3 hitRight = origin + direction * tRight;

    if (tRight > 0.0 && hitRight.z >= 0.0 && hitRight.z <= depth && abs(hitRight.y) <= 1.0 && tRight < bestT) {
      bestT = tRight;
      bestUv = tileSurfaceUv(
        vec2(1.0 - hitRight.z / depth, 0.5 - hitRight.y * 0.5),
        uRightWallTiled,
        vec2(uRightWallTileSizeX, uRightWallTileSizeY)
      );
      bestCell = vec2(2.0, 1.0);
      bestShade = 0.72;
    }
  }

  if (direction.y > 0.0001) {
    float tFloor = (1.0 - origin.y) / direction.y;
    vec3 hitFloor = origin + direction * tFloor;

    if (tFloor > 0.0 && hitFloor.z >= 0.0 && hitFloor.z <= depth && abs(hitFloor.x) <= 1.0 && tFloor < bestT) {
      bestT = tFloor;
      bestUv = tileSurfaceUv(
        vec2(hitFloor.x * 0.5 + 0.5, 1.0 - hitFloor.z / depth),
        uFloorTiled,
        vec2(uFloorTileSizeX, uFloorTileSizeY)
      );
      bestCell = vec2(1.0, 2.0);
      bestShade = 0.86;
    }
  }

  if (direction.y < -0.0001) {
    float tCeiling = (-1.0 - origin.y) / direction.y;
    vec3 hitCeiling = origin + direction * tCeiling;

    if (tCeiling > 0.0 && hitCeiling.z >= 0.0 && hitCeiling.z <= depth && abs(hitCeiling.x) <= 1.0 && tCeiling < bestT) {
      bestT = tCeiling;
      bestUv = tileSurfaceUv(
        vec2(hitCeiling.x * 0.5 + 0.5, hitCeiling.z / depth),
        uCeilingTiled,
        vec2(uCeilingTileSizeX, uCeilingTileSizeY)
      );
      bestCell = vec2(1.0, 0.0);
      bestShade = 0.64;
    }
  }

  vec4 color = sampleCell(bestCell, bestUv);

  color.rgb *= bestShade * uBrightness;

  return color;
}

vec4 overlayBlackKey(vec4 base, vec4 overlay, float alpha) {
  float mask = keyedAlpha(overlay.rgb) * overlay.a * clamp(alpha, 0.0, 1.0);

  return vec4(mix(base.rgb, overlay.rgb, mask), max(base.a, mask));
}

void main(void) {
  vec2 uv = outTexCoord;
  vec4 room = sampleRoom(uv);
  float depth = max(uRoomDepth, 0.001);
  float midDepth = clamp(uMidGroundDepth, 0.0, 1.0) * depth;
  vec3 origin = vec3(uCameraX, uCameraY, -1.0);
  vec3 direction = roomRay(uv);
  float tMid = (midDepth - origin.z) / max(direction.z, 0.0001);
  vec3 midHit = origin + direction * tMid;
  vec2 midBaseUv = vec2(midHit.x * 0.5 + 0.5, 0.5 - midHit.y * 0.5);
  float viewAspect = max(uViewWidth, 0.001) / max(uViewHeight, 0.001);
  vec2 midDelta = midBaseUv - vec2(0.5) - vec2(uMidGroundX, -uMidGroundY) * 0.5;

  midDelta.x *= viewAspect;

  vec2 midUv = midDelta / max(uMidGroundScale, 0.001) + vec2(0.5);
  float midPlaneMask = step(0.0, tMid) * step(abs(midHit.x), 1.0) * step(abs(midHit.y), 1.0);
  vec4 midGround = sampleCell(vec2(0.0, 2.0), midUv);

  midGround.rgb *= uBrightness;
  room = overlayBlackKey(room, midGround, uMidGroundAlpha * rectMask(midUv) * midPlaneMask);

  vec4 frontWall = sampleCell(vec2(0.0, 0.0), uv);

  room = overlayBlackKey(room, frontWall, uFrontWallAlpha);

  gl_FragColor = vec4(room.rgb, room.a);
}
