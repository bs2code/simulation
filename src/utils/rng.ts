/**
 * All engine randomness must flow through this interface instead of Math.random(),
 * so a seeded RNG can make battles fully reproducible for tests and replays.
 */
export interface RNG {
  /** Returns a float in [0, 1). */
  random(): number;
  /** Returns an integer in [min, max], inclusive on both ends. */
  integer(min: number, max: number): number;
  /** Returns true with the given probability (0-1). */
  chance(probability: number): boolean;
}

/** Deterministic PRNG (mulberry32) seeded with a 32-bit integer. Same seed -> same sequence. */
export class SeededRNG implements RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  random(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  integer(min: number, max: number): number {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.random() < probability;
  }
}

/** Non-deterministic RNG backed by Math.random(), for casual/UI use outside of tests and replays. */
export class RealRNG implements RNG {
  random(): number {
    return Math.random();
  }

  integer(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return Math.random() < probability;
  }
}
