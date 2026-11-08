// node slice.js <part|all>  — slices the support-free locker-box v2 parts with FlashPrint's ffslicer and wraps them into .gx
// Needs preview_<part>.png (tools/render_preview.py) for the printer-screen thumbnail.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ENG = 'C:/Program Files/FlashForge/FlashPrint 5/engine';
const DIR = __dirname, TMP = path.join(require('os').tmpdir(), 'locker2-slice');
fs.mkdirSync(TMP, { recursive: true });

// Matte PLA 215/55. 0.5 mm lines, so the 2 mm walls are 4 solid perimeters.
const common = {
  '': { layerHeight: 0.2, firstLayerHeight: 0.3, pathWidth: 0.5, extrusionRatio: 1.0, firstExtrusionRatio: 1.0,
        baseSpeed: 90, travelSpeed: 200, rightTemp: 215, platTemp: 55 },
  platform: { sizeX: 220, sizeY: 200, sizeZ: 250, centerX: 0, centerY: 0 },
  shell: { count: 4, outerMaxSpeed: 50, firstExtrusionRatio: 1.0 },
  infill: { density: 0.15, shape: 'line', topSolidCnt: 4, bottomSolidCnt: 3, topMaxSpeed: 60, sparseCombineCnt: 2,
            solidExtrusionRatio: 1.0, sparseExtrusionRatio: 1.0, firstExtrusionRatio: 1.0 },
  raft: { topExtrusionRatio: 1.0 },
  acceleration: { enable: true, general: 10000, outerShell: 5000, innerShell: 5000, solidInfill: 8000, sparseInfill: 10000, travel: 8000 },
  speed: { firstLayerMax: 30 },
};
const jobs = {      // box, lid and stand need supports: sliced in FlashPrint with its own support tools
  cover_white: { shell: { count: 3 } },
  panel_white: { shell: { count: 3 } },
  cover_panel_white: { shell: { count: 3 } },  // cover + panel on one plate (merge_plate.js)
  tray_black: {},
  doors_red: { shell: { count: 3 }, infill: { density: 0.3 } },
};

function buildCfg(over) {
  let sec = '';
  const merged = JSON.parse(JSON.stringify(common));
  for (const [s, kv] of Object.entries(over)) merged[s] = Object.assign(merged[s] || {}, kv);
  return fs.readFileSync(path.join(ENG, 'default-fdm.cfg'), 'utf8').split(/\r?\n/).map(l => {
    const m = l.match(/^\[(\w+)\]/); if (m) { sec = m[1]; return l; }
    const k = l.match(/^(\w+)\s*=/); if (!k) return l;
    const v = (merged[sec] || {})[k[1]]; return v === undefined ? l : `${k[1]} = ${v}`;
  }).join('\n');
}

const names = process.argv[2] === 'all' ? Object.keys(jobs) : [process.argv[2]];
for (const name of names) {
  const cfg = path.join(TMP, name + '.cfg'), g = path.join(TMP, name + '.gcode');
  fs.writeFileSync(cfg, buildCfg(jobs[name]));
  execFileSync(path.join(ENG, 'ffslicer.exe'), ['--config', cfg, '--model', 'file:' + path.win32.normalize(path.join(DIR, `locker_${name}.stl`)),
    '--gcode', g, '--machineType', 'Adventurer 4 Pro'], { encoding: 'utf8' });
  const bmp = path.join(TMP, name + '.bmp');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(DIR, `preview_${name}.png`), '-vf',
    'scale=80:60:force_original_aspect_ratio=decrease,pad=80:60:(ow-iw)/2:(oh-ih)/2:color=0xEEEEF2', '-pix_fmt', 'bgr24', bmp]);
  console.log(execFileSync('node', [path.join(DIR, '../pingpong-trophy/make_gx.js'), g, bmp, path.join(DIR, `locker_${name}.gx`)], { encoding: 'utf8' }).trim());
}
