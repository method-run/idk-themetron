// Motion: durations, curves, and a spring, from two feels.
//
// Energy sets the pace and the force: how long things take, and how hard they speed up and
// brake. Playfulness sets the character: how much moves, how far, and how much it bounces.
//
// A trip that the eye sees whole eases in and out (standard). A part that arrives is seen only
// at the end of a longer trip, so it is already at speed and only brakes (enter). A part that
// leaves is seen only at the start, so it only speeds up, and brakes out of view (exit). The
// halves of an ease-in-out curve of power p are the ease-out and ease-in curves of the same
// power, so the three curves are one trip, seen through three windows.
//
// Bigger parts take longer, but much less than physics says: a cube root of the size at the
// middle of playfulness, so four times the size takes about one and a half times as long.
// Sober themes feel heavier (size matters more), and giddy ones lighter.
//
// The theme's animation decides what kind of motion there is: none, fades only (parts do not
// travel or grow), or moves. The feels tune what is left.

const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const lerp = (a, b, t) => a + (b - a) * t;

// Close cubic-bezier fits of the power curves, for p = 2, 3, and 4.
// See easings.net: quad, cubic, quart.
const FITS = {
  standard: [[0.45, 0, 0.55, 1], [0.65, 0, 0.35, 1], [0.76, 0, 0.24, 1]],
  enter: [[0.5, 1, 0.89, 1], [0.33, 1, 0.68, 1], [0.25, 1, 0.5, 1]],
  exit: [[0.11, 0, 0.5, 0], [0.32, 0, 0.67, 0], [0.5, 0, 0.75, 0]],
};
function fit(kind, power) {
  const p = Math.min(4, Math.max(2, power));
  const i = Math.min(1, Math.floor(p - 2));
  const t = p - 2 - i;
  return FITS[kind][i].map((v, k) => round(lerp(v, FITS[kind][i + 1][k], t)));
}

// The size steps, in px: the larger of a part's longest side and how far it moves.
// xs: an icon or a switch thumb. sm: a tooltip, menu, or chip. md: a popover, card, or small
// dialog. lg: a drawer, sheet, or page.
export const MOTION_SIZES = { xs: 25, sm: 100, md: 400, lg: 1600 };

// A spring in Apple's model: a perceived duration T (s) and a bounce from 0 to 1. Mass is 1.
// `velocity` is the speed it starts with, as a share of the spring's own speed (2π / T): 0 starts
// at rest, as a part that pops in place does. Near 1 starts at speed, as a part that arrives from
// out of view does: at 1 with no bounce, that is a pure ease-out. Returns the CSS linear() curve, the time
// it takes to settle as a share of T (the CSS duration is T times it), and the same spring in the
// terms other tools use.
export function spring(T, bounce, velocity = 0) {
  // No time, no motion: a theme with no animation jumps to the end.
  if (!(T > 0)) return { css: 'linear(0, 1)', settle: 1, duration: 0, bounce: round(bounce, 2), velocity, stiffness: 0, damping: 0, dampingRatio: round(1 - bounce, 2) };
  const zeta = 1 - bounce;
  const w = (2 * Math.PI) / T;
  const v0 = velocity * w;
  const stiffness = w * w;
  const damping = 2 * zeta * w;
  const wd = w * Math.sqrt(Math.max(0, 1 - zeta * zeta));
  const x = (t) => (zeta >= 1
    ? 1 - Math.exp(-w * t) * (1 + (w - v0) * t)
    : 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w - v0) / wd) * Math.sin(wd * t)));
  // Settled: the last moment it is more than 0.1% from the end.
  let settle = 0;
  for (let t = 0; t <= 10 * T; t += T / 200) if (Math.abs(1 - x(t)) > 0.001) settle = t;
  settle += T / 200;
  const n = 48;
  const points = Array.from({ length: n + 1 }, (_, i) => (i === n ? 1 : round(x((settle * i) / n))));
  return {
    css: `linear(${points.join(', ')})`,
    settle: round(settle / T, 2),
    duration: Math.round(T * 1000),
    bounce: round(bounce, 2),
    velocity,
    stiffness: round(stiffness, 1),
    damping: round(damping, 2),
    dampingRatio: round(zeta, 2),
  };
}

// The motion primitives of a theme, from its energy and playfulness (each 0 to 1), and its
// animation: none, fade, or move.
export function motionFor({ energy, playfulness }, animation = 'move') {
  const e = energy;
  const p = playfulness;
  // Whether there is any motion, and whether parts travel.
  const presence = animation === 'none' ? 0 : 1;
  const travel = animation === 'move' ? 1 : 0;
  // The medium step: 450 ms at slow, 225 at brisk, 113 at zippy. Sober is a little slower, and
  // giddy a little quicker, at the same energy.
  const md = 450 * 4 ** -e * lerp(1.15, 0.85, p) * presence;
  // How much size slows a part: heavy when sober, light when giddy.
  const weight = lerp(0.45, 0.22, p);
  const duration = Object.fromEntries(Object.entries(MOTION_SIZES).map(([k, s]) => [k, Math.round(md * (s / MOTION_SIZES.md) ** weight)]));
  // The power of the curves: soft (2) when slow, firm (4) when zippy. Exits stop at 4.
  const power = 2 + 2 * e;
  // Bounce, for the springs only: none up to calm, a hint at casual (0.12), and a silly
  // 0.6 at giddy, which overshoots by about a quarter of the trip.
  const bounce = 0.6 * Math.max(0, (p - 0.25) / 0.75) ** 1.5;
  // A bounce needs time to be seen, so a bouncy spring takes at least this long, however
  // energetic the theme.
  const floor = 260 * (bounce / 0.6) * presence;
  const pop = spring(1, bounce, 0);
  const arrive = spring(1, bounce, 0.8);
  const springTime = (shape) => Object.fromEntries(Object.keys(MOTION_SIZES).map((k) => [k, Math.round(Math.max(duration[k], floor) * shape.settle)]));
  return {
    duration: {
      ...duration,
      // The older names: fast, base, and slow are the sm, md, and lg steps.
      fast: duration.sm,
      base: duration.md,
      slow: duration.lg,
    },
    easing: {
      standard: fit('standard', power),
      enter: fit('enter', power),
      exit: fit('exit', Math.min(power, 4)),
      // Fades and colors never overshoot, so they settle before a bouncing part does.
      fade: [0.2, 0, 0, 1],
    },
    // The springs, for position and scale only, never opacity or color. Pop starts at rest, for
    // a part that appears in place, such as a dialog or a menu. Arrive starts at speed, for a part
    // that comes in from out of view, such as a drawer or a toast. Each size step has its own
    // CSS duration: the time the spring takes to settle.
    spring: {
      pop: { css: pop.css, duration: springTime(pop) },
      arrive: { css: arrive.css, duration: springTime(arrive) },
      bounce: round(bounce, 2),
      // The medium pop, in the terms of other tools: SwiftUI's duration and bounce, and the
      // stiffness and damping of Motion, Compose, and React Spring (mass 1).
      md: spring(Math.max(duration.md, floor) / 1000, bounce),
    },
    // How much moves. A sober theme moves parts a little, does not squeeze buttons, shake
    // fields, or stagger lists. A giddy one does all of it, a lot.
    // A fading theme keeps the press and the shake: they are feedback, not a part that comes or
    // goes. A theme with no animation has none of it.
    distance: Math.round((4 + 44 * p ** 2) * travel),
    scale: round(1 - (0.02 + 0.28 * p ** 2) * travel),
    press: round(1 - 0.08 * p ** 1.5 * presence),
    stagger: Math.round(90 * p ** 1.3 * presence),
    shake: Math.round(8 * p ** 2 * presence),
    // 1 when parts travel in and out of view, such as a drawer; 0 when they only fade.
    travel,
    // How much size slows a part, as a power: duration = md × (size / 400 px) ^ weight.
    weight: round(weight, 2),
    amount: round(p, 2),
  };
}
