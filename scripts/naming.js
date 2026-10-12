/**
 * Naming rules shared by the code generator and the tests.
 *
 * They reproduce the Android/Compose surface: `sdp`, `sdpa`, `sdpi`, `sdpia`, `sdpPh`, `sdpLha`,
 * `hdpLw`, `wdpPh`, `ssp`, `sem`, `sdpPx`, `sdpaPx`, `sdpPxaLh`, `sspPxa`, … and the same names
 * with a strategy prefix (`psdp`, `pwsdp`, `fsdp`, `asdp`, `dgsdp`, `flsdp`, `ftsdp`, `isdp`,
 * `logsdp`, `prsdp`, `dsdp`).
 */
'use strict';

const STRATEGIES = [
  {
    dir: 'scaled',
    name: 'Scaled',
    prefix: '',
    id: 'SCALED',
    dpBuilder: 'DimenScaled',
    spBuilder: 'ScaledSp',
  },
  {dir: 'percent', name: 'Percent', prefix: 'p', id: 'PERCENT'},
  {dir: 'power', name: 'Power', prefix: 'pw', id: 'POWER'},
  {dir: 'fluid', name: 'Fluid', prefix: 'f', id: 'FLUID'},
  {dir: 'auto', name: 'Auto', prefix: 'a', id: 'AUTO'},
  {dir: 'diagonal', name: 'Diagonal', prefix: 'dg', id: 'DIAGONAL'},
  {dir: 'fill', name: 'Fill', prefix: 'fl', id: 'FILL'},
  {dir: 'fit', name: 'Fit', prefix: 'ft', id: 'FIT'},
  {dir: 'interpolated', name: 'Interpolated', prefix: 'i', id: 'INTERPOLATED'},
  {dir: 'logarithmic', name: 'Logarithmic', prefix: 'log', id: 'LOGARITHMIC'},
  {dir: 'perimeter', name: 'Perimeter', prefix: 'pr', id: 'PERIMETER'},
  {dir: 'density', name: 'Density', prefix: 'd', id: 'DENSITY'},
].map(s => ({
  dpBuilder: `Dimen${s.name}`,
  spBuilder: `${s.name}Sp`,
  ...s,
  lower: s.dir,
}));

/** Axis stems with the inverter tokens Compose exposes for them. */
const AXES = [
  {
    axis: 's',
    q: 'SW',
    qualifier: 'SMALL_WIDTH',
    inverters: [
      ['', 'DEFAULT'],
      ['Ph', 'SW_TO_PH'],
      ['Lh', 'SW_TO_LH'],
      ['Pw', 'SW_TO_PW'],
      ['Lw', 'SW_TO_LW'],
    ],
  },
  {
    axis: 'h',
    q: 'H',
    qualifier: 'HEIGHT',
    inverters: [
      ['', 'DEFAULT'],
      ['Lw', 'PH_TO_LW'],
      ['Pw', 'LH_TO_PW'],
    ],
  },
  {
    axis: 'w',
    q: 'W',
    qualifier: 'WIDTH',
    inverters: [
      ['', 'DEFAULT'],
      ['Lh', 'PW_TO_LH'],
      ['Ph', 'LW_TO_PH'],
    ],
  },
];

const FLAGS = [
  ['', 0],
  ['a', 1],
  ['i', 2],
  ['ia', 3],
];

/** unit token → [kind, pxKind] */
const FAMILIES = [
  {unit: 'dp', kind: 'DP', pxKind: 'PX'},
  {unit: 'sp', kind: 'SP', pxKind: 'SP_PX'},
  {unit: 'em', kind: 'EM', pxKind: 'EM_PX'},
];

const INVERTER_DOC = {
  DEFAULT: '',
  SW_TO_PH: 'height in portrait',
  SW_TO_LH: 'height in landscape',
  SW_TO_PW: 'width in portrait',
  SW_TO_LW: 'width in landscape',
  PH_TO_LW: 'width in landscape',
  LH_TO_PW: 'width in portrait',
  PW_TO_LH: 'height in landscape',
  LW_TO_PH: 'height in portrait',
};

/**
 * Every kernel name of a strategy.
 * @returns {Array<{name:string, axis:object, inv:string[], flag:Array, family:object, px:boolean}>}
 */
function kernelSpecs(strategy) {
  const out = [];
  for (const family of FAMILIES) {
    for (const axis of AXES) {
      const stem = `${strategy.prefix}${axis.axis}${family.unit}`;
      for (const inv of axis.inverters) {
        for (const flag of FLAGS) {
          out.push({name: `${stem}${inv[0]}${flag[0]}`, axis, inv, flag, family, px: false});
          let pxName;
          if (inv[0] === '') {
            pxName = family.unit === 'dp' ? `${stem}${flag[0]}Px` : `${stem}Px${flag[0]}`;
          } else {
            pxName = `${stem}Px${flag[0]}${inv[0]}`;
          }
          out.push({name: pxName, axis, inv, flag, family, px: true});
        }
      }
    }
  }
  return out;
}

/** Facilitator names of a strategy (Rotate / Mode / Qualifier / Screen × normal/Px/Plain/PlainPx). */
function facilitatorSpecs(strategy) {
  const out = [];
  for (const unit of ['dp', 'sp']) {
    for (const axis of AXES) {
      const stem = `${strategy.prefix}${axis.axis}${unit}`;
      for (const fam of ['Rotate', 'Mode', 'Qualifier', 'Screen']) {
        for (const [suffix, plain, px] of [
          ['', false, false],
          ['Px', false, true],
          ['Plain', true, false],
          ['PlainPx', true, true],
        ]) {
          out.push({name: `${stem}${fam}${suffix}`, axis, unit, fam, plain, px});
        }
      }
    }
  }
  return out;
}

module.exports = {STRATEGIES, AXES, FLAGS, FAMILIES, INVERTER_DOC, kernelSpecs, facilitatorSpecs};
