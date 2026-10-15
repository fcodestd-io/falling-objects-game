export const GAME_CONFIG = {
  width: 800,
  height: 450,
  arena: { left: 140, right: 660, top: 110, bottom: 410 },
  player: { baseSpeed: 450, maxSpeed: 570, halfWidth: 36 },
  spawn: { baseInterval: 900, minInterval: 450 },
  levels: { level2: 10, level3: 25, level4: 50 },
} as const;
