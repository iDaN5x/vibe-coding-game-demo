// Game tuning and text lists

export const MOVEMENT = {
  walkSpeed: 8,
  crouchSpeed: 3,
  jumpForce: 12,
  gravity: 28,
};

export const PLAYER = {
  maxHp: 100,
  healAmount: 20,
  teabagCrouchesRequired: 3,
};

export const WEAPON = {
  magazineSize: 3,
  reloadDurationMs: 1500,
  shootCooldownMs: 300,
  projectileSpeed: 35,
  damage: 25,
};

export const ENEMY = {
  count: 3,
  maxHp: 50,
  moveSpeed: 4,
  attackRange: 12,
  attackCooldownMs: 1500,
  damage: 10,
  projectileSpeed: 18,
  projectileLifetime: 3,
  tauntIntervalMinMs: 5000,
  tauntIntervalMaxMs: 15000,
  tauntDurationMs: 2500,
  spawnRadius: 25,
  deathWhisperDelayMs: 400,
};

export const MAX_CORPSES = 5;

export const CAMERA = {
  distance: 0,
  eyeHeight: 1.55,
  crouchEyeHeight: 0.95,
  lerp: 0.15,
  pitchMin: -1.45,
  pitchMax: 0.5,
  sensitivity: 0.0022,
};

export const KADOSH_NICKNAMES = [
  'The Lob King',
  'Double Fault Dave',
  'Net Cord Ned',
  'Slice Master',
  'Deuce Bruce',
  'Ace Face',
  'Love-Forty Lou',
  'Break Point Pete',
];

export const TAUNTS = [
  'Your backhand is weak!',
  'Love–forty!',
  'Net cord!',
  'Nice try, rookie!',
  'That was out!',
  'Deuce!',
  'Game, set, match!',
  'Unforced error!',
  'Where\'s your follow-through?',
  'Too slow!',
];

export const GROUND_SIZE = 80;
export const GROUND_Y = 0;
export const PLAYER_HEIGHT = 1.8;
export const CROUCH_HEIGHT = 1.0;
export const ENEMY_MODEL_HEIGHT = 1.85;
/** Teabag counts when crouching within this horizontal radius of a corpse (1.5× enemy height). */
export const TEABAG_DISTANCE = 1.5 * ENEMY_MODEL_HEIGHT;
/** Min ms between counting a "crouch" while holding Ctrl (so holding in range counts as multiple crouches). */
export const TEABAG_CROUCH_INTERVAL_MS = 280;
export const CORPSE_DURATION_MS = 30000;
