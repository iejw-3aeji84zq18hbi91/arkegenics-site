// The intro's clock, shared by the picture (hero.js) and the score (sound.js).
// Plates come out of the dark one at a time and are struck home; the gaps tighten like a
// shipwright finding the rhythm, and the i's dot lands last, alone.

export const LIT = .35;        // seconds in: the lantern catches
export const APPROACH = .38;   // seconds a plate takes to come out of the dark and strike
export const START = 1.15;     // the first strike

// Plate numbers from plates.json (sorted left to right): the A's body, crossbar and feet,
// the r, the k's stems and arm, e g e n, the i's stem, c s, and the i's dot.
const ORDER = [2, 1, 0, 3, 4, 6, 5, 7, 8, 9, 10, 11, 12, 14, 15, 13];
const GAPS = [0, .34, .3, .27, .25, .23, .21, .2, .19, .18, .17, .16, .16, .15, .15, .52];

let at = START;
export const STRIKES = ORDER.map((plate, i) => {
  at += GAPS[i];
  return { plate, t: at, final: i === ORDER.length - 1 };
});
export const FINAL = STRIKES[STRIKES.length - 1].t;
