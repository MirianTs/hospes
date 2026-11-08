// node merge_plate.js <out.stl> <a.stl> <b.stl> ...  — puts binary STLs on one plate, stacked along Y
// with a 6 mm gap, each with its bottom at Z=0, the whole plate centred on X/Y = 0.
const fs = require('fs');
const [out, ...ins] = process.argv.slice(2);
const GAP = 6;

const parts = ins.map(f => {
  const b = fs.readFileSync(f), n = b.readUInt32LE(80);
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let v = 0; v < 3; v++) for (let k = 0; k < 3; k++) {
    const x = b.readFloatLE(84 + i * 50 + 12 + v * 12 + k * 4);
    if (x < mn[k]) mn[k] = x; if (x > mx[k]) mx[k] = x;
  }
  return { b, n, mn, mx };
});

const totalY = parts.reduce((s, p) => s + p.mx[1] - p.mn[1], 0) + GAP * (parts.length - 1);
let y = -totalY / 2;
const tris = parts.reduce((s, p) => s + p.n, 0);
const o = Buffer.alloc(84 + tris * 50);
o.writeUInt32LE(tris, 80);
let at = 84;
for (const p of parts) {
  const d = [-(p.mn[0] + p.mx[0]) / 2, y - p.mn[1], -p.mn[2]];
  for (let i = 0; i < p.n; i++) {
    const src = 84 + i * 50;
    p.b.copy(o, at, src, src + 50);
    for (let v = 0; v < 3; v++) for (let k = 0; k < 3; k++) {
      const q = at + 12 + v * 12 + k * 4;
      o.writeFloatLE(o.readFloatLE(q) + d[k], q);
    }
    at += 50;
  }
  y += p.mx[1] - p.mn[1] + GAP;
}
fs.writeFileSync(out, o);
console.log(`${out}: ${tris} triangles, plate ${totalY.toFixed(1)} mm in Y`);
