/**
 * ============================================================================
 *  AVATAR 3D  (v17.6)
 * ============================================================================
 *  The exercise avatar's LOOK, taken from the MotionRx Rehab Coach character:
 *  sculpted head with hair and full beard, black training tee and shorts,
 *  wristbands, dark trainers, its skin / fabric materials and studio lighting
 *  (Three.js r128, bundled in vendor/three.min.js).
 *
 *  Only the appearance comes from MotionRx. The avatar is driven entirely by
 *  ReMotion's own angles: exercise-figures.js passes the same (exercise,
 *  angle, direction) it uses for its marks, and mapAngles() below — the one
 *  mapping function — turns them into rig joints. No MotionRx angles,
 *  targets, timeline, ROM arcs, gauge, parser or camera logic are used.
 *
 *  Loaded on demand by exercise-figures.js. If WebGL is not available the
 *  figures stay in their 2D drawing.
 * ========================================================================== */

/* ===== Sculpted head (from MotionRx) ===== */
(function (root) {
  const T = root.THREE;
  const BEARD = 0; // clean-shaven: no beard or moustache (head hair and brows kept)
  const HX = 0.074, HY = 0.106, HZ = 0.096;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const g2 = (x, y, cx, cy, sx, sy) => { const a = (x - cx) / sx, b = (y - cy) / sy; return Math.exp(-a * a - b * b); };
  const lin = c => new T.Color(c).convertSRGBToLinear();

  // value noise
  function hash(x, y, z) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); }
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let xf = x - xi, yf = y - yi, zf = z - zi;
    xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
      l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }

  // Base skull shape from a unit direction (squarer face, tapered jaw, nape)
  function basePoint(dx, dy, dz, o) {
    const rxz = Math.hypot(dx, dz), phi = Math.atan2(dx, dz), s = Math.sin(phi), c = Math.cos(phi);
    const n = c > 0 ? 2.55 : 2.1;
    let x = HX * Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * rxz;
    let z = HZ * Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rxz;
    const y = HY * dy;
    const ty = smooth(-0.012, -0.105, y);
    x *= 1 - 0.3 * ty;
    if (z < 0) z *= 1 - 0.3 * smooth(-0.025, -0.1, y); else z *= 1 - 0.05 * ty;
    x *= 1 - 0.07 * smooth(0.04, 0.106, y);
    if (z > 0) z -= 0.006 * smooth(0.03, 0.1, y) * (z / HZ); // forehead slopes back
    o.x = x; o.y = y; o.z = z;
    return o;
  }

  // Facial features and region masks at a base point
  function features(p, dz) {
    const x = p.x, y = p.y, ax = Math.abs(x);
    const fm = smooth(0.22, 0.72, dz), sm = smooth(-0.15, 0.45, dz);
    let disp = 0;
    // brow ridge, sockets, cheeks
    disp += fm * (0.0042 * g2(ax, y, 0.029, 0.031, 0.021, 0.0075) + 0.002 * g2(x, y, 0, 0.027, 0.01, 0.01)
      - 0.0105 * g2(ax, y, 0.031, 0.012, 0.0155, 0.0105)
      + 0.0042 * g2(ax, y, 0.043, -0.014, 0.017, 0.012)
      + 0.0028 * g2(x, y, 0, 0.062, 0.04, 0.03));
    // nose: ramp from bridge to tip, then alae and columella
    const ny = clamp((0.022 - y) / 0.05, 0, 1.2);
    const nsx = 0.0052 + 0.0058 * ny;
    const nose = (0.005 + 0.0165 * Math.pow(ny, 1.25)) * Math.exp(-(x / nsx) * (x / nsx)) * smooth(0.032, 0.016, y) * smooth(-0.035, -0.025, y);
    disp += fm * (nose + 0.003 * g2(x, y, 0, -0.024, 0.0085, 0.006)
      + 0.0062 * g2(ax, y, 0.0128, -0.0285, 0.006, 0.0055) - 0.0025 * g2(x, y, 0, -0.0352, 0.012, 0.0028));
    // mouth and chin
    disp += fm * (0.0028 * g2(x, y, 0, -0.0385, 0.011, 0.0055) + 0.0052 * g2(x, y, 0, -0.0432, 0.019, 0.0042)
      - 0.0036 * g2(x, y, 0, -0.0484, 0.021, 0.0015) + 0.0052 * g2(x, y, 0, -0.0532, 0.017, 0.0043)
      - 0.0022 * g2(x, y, 0, -0.064, 0.015, 0.004) + 0.011 * g2(x, y, 0, -0.085, 0.027, 0.012)
      - 0.0015 * g2(ax, y, 0.024, -0.0484, 0.004, 0.006));
    // cheekbones, temples, jaw angle
    disp += sm * (1 - 0.5 * fm) * (0.0042 * g2(ax, y, 0.058, -0.002, 0.014, 0.016) - 0.0028 * g2(ax, y, 0.066, 0.04, 0.012, 0.02)
      + 0.0035 * g2(ax, y, 0.052, -0.068, 0.013, 0.013));

    // ---- masks
    const bow = 0.0012 * Math.exp(-Math.pow(x / 0.006, 2)); // cupid's bow dip at the centre of the upper lip
    const ly = y + 0.0485, lh = ly > 0 ? 0.0055 - bow : 0.0072;
    const le = Math.pow(x / 0.0218, 2) + Math.pow(ly / lh, 2);
    const lip = fm * smooth(1.08, 0.82, le);
    const f = -0.013 - 0.021 * (1 - smooth(0.024, 0.068, ax)) + 0.034 * smooth(0.056, 0.076, ax);
    let beard = BEARD * smooth(f + 0.0045, f - 0.0045, y) * smooth(-0.3, 0.05, dz) * (1 - lip);
    beard *= 1 - smooth(0.02, 0.035, y) * smooth(0.06, 0.07, ax) * 0; // sideburns meet hair
    const wf = smooth(0.15, 0.6, dz), wb = smooth(0.0, -0.55, dz);
    const yhF = 0.061 + 0.009 * smooth(0.018, 0.05, ax);
    const yh = wf * yhF + (1 - wf) * (0.012 * (1 - wb) - 0.078 * wb);
    // full head of hair: hairline runs around the ear and down to the nape
    const earD = Math.pow(y / 0.03, 2) + Math.pow((p.z + 0.006) / 0.026, 2);
    const earCut = 1 - smooth(0.045, 0.062, ax) * smooth(1.35, 0.85, earD);
    const hair = smooth(yh - 0.003, yh + 0.004, y) * earCut;
    const top = smooth(0.045, 0.09, y);
    const yb = 0.0365 + 0.0036 * (1 - Math.pow((ax - 0.031) / 0.019, 2));
    const bth = 0.0038 + 0.0018 * (1 - smooth(0.012, 0.045, ax));
    const brow = fm * smooth(0.0095, 0.0145, ax) * smooth(0.054, 0.045, ax) * Math.exp(-Math.pow((y - yb) / bth, 2));
    const beardTh = 0.0026 + 0.0028 * g2(x, y, 0, -0.092, 0.028, 0.018) + 0.0012 * g2(x, y, 0, -0.038, 0.02, 0.005);
    const hairTh = hair * (0.0062 + 0.0115 * top * (0.6 + 0.4 * smooth(-0.6, 0.4, dz)) + 0.005 * top * wf);
    return { disp, lip, beard, beardTh, hair, hairTh, top, brow, fm };
  }

  // ---- paint the head texture (color, roughness, bump) in sphere UV space
  function paint(W, H) {
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const cc = mk(), rc = mk(), bc = mk();
    const ci = cc.getContext('2d').createImageData(W, H), ri = rc.getContext('2d').createImageData(W, H), bi = bc.getContext('2d').createImageData(W, H);
    const p = { x: 0, y: 0, z: 0 };
    const SK = [180, 117, 85], HC = [15, 11, 9], LP = [150, 90, 78];
    for (let j = 0; j < H; j++) {
      const theta = (j + 0.5) / H * Math.PI, st = Math.sin(theta), dy = Math.cos(theta);
      for (let i = 0; i < W; i++) {
        const phi = 1.5 * Math.PI + (i + 0.5) / W * 2 * Math.PI;
        const dx = -Math.cos(phi) * st, dz = Math.sin(phi) * st;
        basePoint(dx, dy, dz, p);
        const F = features(p, dz);
        const ax = Math.abs(p.x), y = p.y;
        const low = noise(p.x * 70, p.y * 70, p.z * 70) - 0.5;
        const pore = noise(p.x * 1500, p.y * 1500, p.z * 1500) - 0.5;
        const fine = noise(p.x * 3800, p.y * 3800, p.z * 3800) - 0.5;
        // skin
        const red = F.fm * (0.9 * g2(ax, y, 0.045, -0.016, 0.02, 0.015) + 1.0 * g2(p.x, y, 0, -0.018, 0.01, 0.016)) + 0.6 * smooth(0.6, 0.0, Math.abs(p.z) / HZ) * smooth(0.06, 0.07, ax) * (1 - F.hair);
        const under = F.fm * g2(ax, y, 0.031, 0.0005, 0.015, 0.0055);
        const lid = F.fm * g2(ax, y, 0.031, 0.021, 0.014, 0.005);
        let r = SK[0] + 16 * low + 7 * pore + 7 * red - 12 * under - 6 * lid;
        let gg = SK[1] + 12 * low + 5 * pore - 4 * red - 13 * under - 10 * lid;
        let b = SK[2] + 9 * low + 4 * pore - 4 * red - 8 * under - 4 * lid;
        // lips
        const mouth = F.fm * g2(p.x, y, 0, -0.0484, 0.019, 0.0011);
        const lipK = clamp(F.lip);
        r += (LP[0] - r) * lipK; gg += (LP[1] - gg) * lipK; b += (LP[2] - b) * lipK;
        r *= 1 - 0.5 * mouth; gg *= 1 - 0.56 * mouth; b *= 1 - 0.54 * mouth;
        const nostril = F.fm * g2(ax, y, 0.0082, -0.0318, 0.0033, 0.0019);
        r *= 1 - 0.35 * nostril; gg *= 1 - 0.4 * nostril; b *= 1 - 0.4 * nostril;
        // beard: shadowed skin under, strands on top, stubbly edge
        const strandB = noise(p.x * 2600, p.y * 520, p.z * 2600);
        const beardCov = F.beard <= 0 ? 0 : smooth(0.22, 0.78, F.beard + fine * 0.5) * (0.82 + 0.3 * (strandB - 0.5));
        // hair: strands swept back on top, faded short sides
        const strandH = noise(p.x * 2600, p.y * 2600 * (1 - F.top * 0.7), p.z * 600 + p.y * 900);
        const hairCov = smooth(0.2, 0.8, F.hair + fine * 0.35) * (0.9 + 0.2 * (strandH - 0.5));
        const browCov = clamp(F.brow * (0.85 + 0.9 * (noise(p.x * 2400, p.y * 900, p.z * 900) - 0.5)) * 1.5);
        const shade = Math.max(beardCov, hairCov * 0.8);
        r *= 1 - 0.25 * shade; gg *= 1 - 0.28 * shade; b *= 1 - 0.25 * shade;
        const cov = clamp(Math.max(beardCov, hairCov, browCov));
        const sv = (Math.max(beardCov > hairCov ? strandB : strandH, 0) - 0.5) * 30;
        r += (HC[0] + sv - r) * cov; gg += (HC[1] + sv * 0.8 - gg) * cov; b += (HC[2] + sv * 0.7 - b) * cov;
        const k = (j * W + i) * 4;
        ci.data[k] = clamp(r, 0, 255); ci.data[k + 1] = clamp(gg, 0, 255); ci.data[k + 2] = clamp(b, 0, 255); ci.data[k + 3] = 255;
        const tz = F.fm * (g2(p.x, y, 0, 0.05, 0.03, 0.03) + g2(p.x, y, 0, -0.01, 0.012, 0.02));
        const rough = 0.56 - 0.12 * tz - 0.08 * lipK + 0.24 * cov + 0.05 * pore;
        ri.data[k] = ri.data[k + 1] = ri.data[k + 2] = clamp(rough * 255, 0, 255); ri.data[k + 3] = 255;
        const bump = 128 + 30 * pore * (1 - cov) + 70 * (cov * ((beardCov > hairCov ? strandB : strandH) - 0.5)) - 10 * mouth + 6 * lipK * (pore + 0.5);
        bi.data[k] = bi.data[k + 1] = bi.data[k + 2] = clamp(bump, 0, 255); bi.data[k + 3] = 255;
      }
    }
    cc.getContext('2d').putImageData(ci, 0, 0); rc.getContext('2d').putImageData(ri, 0, 0); bc.getContext('2d').putImageData(bi, 0, 0);
    return { color: cc, rough: rc, bump: bc };
  }

  function irisTexture() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#efe9e2'; x.fillRect(0, 0, 512, 256);
    const sc = x.createRadialGradient(256, 128, 40, 256, 128, 200);
    sc.addColorStop(0, 'rgba(0,0,0,0)'); sc.addColorStop(1, 'rgba(190,120,110,0.35)');
    x.fillStyle = sc; x.fillRect(0, 0, 512, 256);
    for (let k = 0; k < 40; k++) { // faint vessels
      x.strokeStyle = 'rgba(170,60,55,0.12)'; x.lineWidth = 0.8; x.beginPath();
      let px = Math.random() < 0.5 ? 120 + Math.random() * 60 : 330 + Math.random() * 60, py = 60 + Math.random() * 140; x.moveTo(px, py);
      for (let s = 0; s < 6; s++) { px += (px < 256 ? 1 : -1) * (6 + Math.random() * 6); py += (Math.random() - 0.5) * 10; x.lineTo(px, py); }
      x.stroke();
    }
    const ir = 44;
    const ig = x.createRadialGradient(256, 128, 6, 256, 128, ir);
    ig.addColorStop(0, '#4a2c17'); ig.addColorStop(0.45, '#5b3a1e'); ig.addColorStop(0.85, '#3a2312'); ig.addColorStop(1, '#1d120a');
    x.fillStyle = ig; x.beginPath(); x.arc(256, 128, ir, 0, Math.PI * 2); x.fill();
    for (let a = 0; a < 140; a++) { // iris fibres
      const t = a / 140 * Math.PI * 2, r0 = 16 + Math.random() * 6, r1 = ir - 2 - Math.random() * 10;
      x.strokeStyle = `rgba(${120 + Math.random() * 60},${80 + Math.random() * 40},${40 + Math.random() * 20},0.35)`; x.lineWidth = 1;
      x.beginPath(); x.moveTo(256 + Math.cos(t) * r0, 128 + Math.sin(t) * r0); x.lineTo(256 + Math.cos(t + 0.05) * r1, 128 + Math.sin(t + 0.05) * r1); x.stroke();
    }
    x.fillStyle = '#060404'; x.beginPath(); x.arc(256, 128, 15, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(20,12,8,0.9)'; x.lineWidth = 3; x.beginPath(); x.arc(256, 128, ir, 0, Math.PI * 2); x.stroke();
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }

  function build(skinColor) {
    const group = new T.Group();
    // ---- head mesh
    const geo = new T.SphereGeometry(1, 200, 150, 1.5 * Math.PI, 2 * Math.PI);
    const pos = geo.attributes.position, p = { x: 0, y: 0, z: 0 }, n = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i), dy = pos.getY(i), dz = pos.getZ(i);
      basePoint(dx, dy, dz, p);
      const F = features(p, dz);
      n.set(p.x / (HX * HX), p.y / (HY * HY), p.z / (HZ * HZ)).normalize();
      const d = F.disp + F.beard * F.beardTh + F.hairTh + F.brow * 0.0011;
      pos.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d);
    }
    geo.computeVertexNormals();
    // weld the UV seam normals (back of head)
    const nor = geo.attributes.normal, W = 200;
    for (let row = 0; row <= 150; row++) {
      const a = row * (W + 1), b = a + W;
      const x = nor.getX(a) + nor.getX(b), y = nor.getY(a) + nor.getY(b), z = nor.getZ(a) + nor.getZ(b), l = Math.hypot(x, y, z) || 1;
      nor.setXYZ(a, x / l, y / l, z / l); nor.setXYZ(b, x / l, y / l, z / l);
    }
    const tex = paint(1024, 512);
    const mk = (c, srgb) => { const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
    const headMat = new T.MeshPhysicalMaterial({ map: mk(tex.color, true), roughnessMap: mk(tex.rough), roughness: 1, bumpMap: mk(tex.bump), bumpScale: 0.0006,
      clearcoat: 0.08, clearcoatRoughness: 0.6, sheen: lin(0x2a140e) });
    const head = new T.Mesh(geo, headMat); group.add(head);

    // surface depth sampler for placing eyes and ears
    const surfZ = (sx, sy) => { let best = 1e9, z = 0; for (let i = 0; i < pos.count; i++) { const vz = pos.getZ(i); if (vz < 0.02) continue; const d = (pos.getX(i) - sx) ** 2 + (pos.getY(i) - sy) ** 2; if (d < best) { best = d; z = vz; } } return z; };

    // ---- eyes with lids and lash lines
    const skinMat = new T.MeshPhysicalMaterial({ color: skinColor, roughness: 0.55, sheen: lin(0x3a1a10) });
    const eyeMat = new T.MeshPhysicalMaterial({ map: irisTexture(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 });
    const lashMat = new T.MeshStandardMaterial({ color: lin(0x120d0a), roughness: 0.8 });
    const ER = 0.0116;
    [-1, 1].forEach(sg => {
      const ex = sg * 0.031, ey = 0.0125, S = surfZ(ex, ey);
      const eye = new T.Group(); eye.position.set(ex, ey, S + 0.0034 - ER); group.add(eye);
      const ball = new T.Mesh(new T.SphereGeometry(ER, 40, 28, 0, Math.PI * 2), eyeMat);
      ball.rotation.y = -Math.PI / 2; // iris painted at u=.5 (+x); turn it to face +z
      eye.add(ball);
      const up = new T.Mesh(new T.SphereGeometry(ER * 1.06, 32, 16, 0, Math.PI, 0, Math.PI * 0.33), skinMat);
      up.rotation.x = 0.05; eye.add(up);
      const lo = new T.Mesh(new T.SphereGeometry(ER * 1.045, 32, 10, 0, Math.PI, Math.PI * 0.73, Math.PI * 0.27), skinMat);
      lo.rotation.x = -0.05; eye.add(lo);
      const lashR = ER * 1.06 * Math.sin(Math.PI * 0.33);
      const lash = new T.Mesh(new T.TorusGeometry(lashR, 0.0007, 6, 40, Math.PI), lashMat);
      lash.rotation.x = Math.PI / 2; lash.position.y = ER * 1.06 * Math.cos(Math.PI * 0.33);
      const lashG = new T.Group(); lashG.rotation.x = 0.05; lashG.add(lash); eye.add(lashG);
    });

    // ---- ears
    [-1, 1].forEach(sg => {
      const ear = new T.Group(); ear.position.set(sg * 0.071, 0.004, -0.01); ear.rotation.set(0, sg * 0.18, sg * -0.06); group.add(ear);
      const lobe = new T.Mesh(new T.SphereGeometry(1, 28, 20), skinMat); lobe.scale.set(0.009, 0.029, 0.018); lobe.position.x = sg * 0.003; ear.add(lobe);
      const helix = new T.Mesh(new T.TorusGeometry(0.0155, 0.0036, 10, 36, Math.PI * 1.45), skinMat);
      helix.rotation.set(0, sg * Math.PI / 2, -Math.PI * 0.35); helix.scale.set(1, 1.6, 1.05); helix.position.set(sg * 0.0085, 0.004, -0.002); ear.add(helix);
      const concha = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshStandardMaterial({ color: lin(0x8c573e), roughness: 0.7 }));
      concha.scale.set(0.004, 0.011, 0.008); concha.position.set(sg * 0.0095, -0.002, 0.002); ear.add(concha);
      if (sg > 0) { const ring = new T.Mesh(new T.TorusGeometry(0.0035, 0.0009, 8, 20), new T.MeshStandardMaterial({ color: 0xd6d9dd, metalness: 1, roughness: 0.2 })); ring.position.set(sg * 0.008, -0.026, 0.004); ring.rotation.y = Math.PI / 2; ear.add(ring); }
    });
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return group;
  }

  root.AVATAR_HEAD = { build, smooth, noise, lin };
})(window);


/* ===== Rigged body (from MotionRx), trainers added ===== */
(function (root) {
  const T = root.THREE;
  const rad = d => d * Math.PI / 180;
  const lin = c => new T.Color(c).convertSRGBToLinear();

  function smoothInterp(cs, t) {
    const f = t * (cs.length - 1), i = Math.min(cs.length - 2, Math.floor(f)), u = f - i;
    const w = (1 - Math.cos(u * Math.PI)) / 2;
    return cs[i] * (1 - w) + cs[i + 1] * w;
  }
  // Tapered capsule hanging down from the origin along -Y
  function limbGeo(len, cs, opts = {}) {
    const pts = [], N = 26, rb = cs[cs.length - 1], rt = cs[0];
    if (opts.capBot !== false) for (let k = 0; k <= 7; k++) { const a = -Math.PI / 2 + k / 7 * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, rb * Math.cos(a)), -len + rb * Math.sin(a))); }
    for (let i = N - 1; i >= 1; i--) { const t = i / N; pts.push(new T.Vector2(smoothInterp(cs, t), -len * t)); }
    if (opts.capTop !== false) for (let k = 0; k <= 7; k++) { const a = k / 7 * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, rt * Math.cos(a)), rt * Math.sin(a))); }
    else pts.push(new T.Vector2(rt, 0));
    return new T.LatheGeometry(pts, opts.seg || 36);
  }
  function lathe(points, seg = 48) { return new T.LatheGeometry(points.map(p => new T.Vector2(Math.max(1e-4, p[0]), p[1])), seg); }
  function ell(r, sx, sy, sz, mat, ws = 32, hs = 24) { const m = new T.Mesh(new T.SphereGeometry(r, ws, hs), mat); m.scale.set(sx, sy, sz); return m; }
  function add(parent, mesh, x = 0, y = 0, z = 0) { mesh.position.set(x, y, z); parent.add(mesh); return mesh; }

  // Tiling detail textures (skin pores and mottling, fabric knit)
  function tileTex(size, fn, srgb) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'), im = ctx.createImageData(size, size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const v = fn(i / size, j / size), k = (j * size + i) * 4; im.data[k] = v[0]; im.data[k + 1] = v[1]; im.data[k + 2] = v[2]; im.data[k + 3] = 255; }
    ctx.putImageData(im, 0, 0);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  // periodic noise so tiles have no seams
  function pnoise(u, v, f) {
    const N = AVATAR_HEAD.noise, a = u * Math.PI * 2, b = v * Math.PI * 2;
    return N(Math.cos(a) * f, Math.sin(a) * f, Math.cos(b) * f + Math.sin(b) * f * 0.7 + 11.3);
  }

  function build() {
    const SKIN = 0xb57454;
    const skinCol = tileTex(256, (u, v) => {
      const n = pnoise(u, v, 3) - 0.5, m = pnoise(u, v, 9) - 0.5;
      return [181 + 9 * n + 4 * m, 116 + 7 * n + 3 * m, 84 + 5 * n + 2 * m];
    }, true);
    const skinBump = tileTex(256, (u, v) => { const n = 128 + 50 * (pnoise(u, v, 60) - 0.5) + 40 * (pnoise(u, v, 140) - 0.5); return [n, n, n]; });
    const knit = tileTex(128, (u, v) => {
      const rib = Math.sin(u * Math.PI * 2 * 32) * 0.5 + 0.5, row = Math.sin(v * Math.PI * 2 * 48) * 0.5 + 0.5;
      const n = 128 + 70 * (rib * 0.6 + row * 0.4 - 0.5) + 40 * (pnoise(u, v, 30) - 0.5); return [n, n, n];
    });
    const fabric = (col, rough, sheenCol) => new T.MeshPhysicalMaterial({ color: lin(col), roughness: rough, sheen: lin(sheenCol), bumpMap: knit, bumpScale: 0.0006, side: T.DoubleSide });
    const skinMat = (rep) => {
      const m = new T.MeshPhysicalMaterial({ color: lin(SKIN), roughness: 0.55, bumpMap: skinBump.clone(), bumpScale: 0.0004, sheen: lin(0x3a1a10), clearcoat: 0.05, clearcoatRoughness: 0.6 });
      [m.bumpMap].forEach(t => { t.needsUpdate = true; t.repeat.set(rep[0], rep[1]); });
      return m;
    };
    const mats = {
      skin: skinMat([3, 4]), skinHand: skinMat([2, 2]),
      shirt: fabric(0x1f2024, 0.86, 0x3a3d44),
      shorts: fabric(0x18191c, 0.8, 0x34373e),
      rib: fabric(0x141518, 0.9, 0x2d3036),
      shoe: new T.MeshPhysicalMaterial({ color: lin(0x2b2f36), roughness: 0.62, sheen: lin(0x30343b), bumpMap: knit, bumpScale: 0.0005 }),
      shoeTrim: new T.MeshPhysicalMaterial({ color: lin(0x3f454f), roughness: 0.4, clearcoat: 0.3 }),
      sole: new T.MeshPhysicalMaterial({ color: lin(0xc9cdd2), roughness: 0.75 }),
      lace: new T.MeshStandardMaterial({ color: lin(0x1c1e22), roughness: 0.9 }),
      band: new T.MeshPhysicalMaterial({ color: lin(0x111214), roughness: 0.95, sheen: lin(0x2a2c30), bumpMap: knit, bumpScale: 0.0008 }),
      nail: new T.MeshPhysicalMaterial({ color: lin(0xd9aa94), roughness: 0.3, clearcoat: 0.6 }),
      metal: new T.MeshStandardMaterial({ color: lin(0xb9bec4), roughness: 0.28, metalness: 1 }),
      iron: new T.MeshStandardMaterial({ color: lin(0x26292e), roughness: 0.5, metalness: 0.7 })
    };
    const J = {};
    const root = new T.Group(); root.name = 'avatar';
    const hips = new T.Group(); root.add(hips); J.hips = hips;

    // ---- pelvis / shorts
    const pelvis = new T.Mesh(lathe([[0.0, -0.062], [0.1, -0.058], [0.15, -0.035], [0.163, 0.0], [0.163, 0.04], [0.156, 0.1], [0.0, 0.1]]), mats.shorts);
    pelvis.scale.set(1.13, 1, 0.78); hips.add(pelvis);
    add(hips, ell(0.075, 1.25, 0.8, 0.7, mats.shorts), 0, -0.035, -0.07); // seat
    const waist = new T.Mesh(new T.CylinderGeometry(0.156, 0.158, 0.035, 48, 1, true), mats.rib);
    waist.scale.set(1.13, 1, 0.79); add(hips, waist, 0, 0.083, 0);

    // ---- torso (athletic tee)
    const spine = new T.Group(); spine.position.set(0, 0.07, 0); spine.rotation.order = 'YXZ'; hips.add(spine); J.spine = spine;
    const torso = new T.Mesh(lathe([[0.0, -0.025], [0.149, -0.025], [0.15, 0.06], [0.156, 0.16], [0.172, 0.27], [0.184, 0.36], [0.18, 0.41], [0.16, 0.45], [0.115, 0.485], [0.07, 0.502], [0.0, 0.506]]), mats.shirt);
    torso.scale.set(1.13, 1, 0.64); spine.add(torso);
    [-1, 1].forEach(sg => {
      add(spine, ell(0.085, 1.05, 0.62, 0.5, mats.shirt), sg * 0.07, 0.36, 0.06);   // pecs
      add(spine, ell(0.085, 1.0, 0.95, 0.45, mats.shirt), sg * 0.075, 0.34, -0.055); // lats / scapula
      const trap = ell(0.06, 1.6, 0.45, 0.85, mats.shirt); trap.rotation.z = sg * -0.36; add(spine, trap, sg * 0.105, 0.455, -0.012);
    });
    const collar = new T.Mesh(lathe([[0.083, -0.012], [0.08, -0.004], [0.072, 0.006], [0.0665, 0.012]]), mats.rib);
    collar.scale.set(1.08, 1, 0.92); collar.rotation.x = -0.12; add(spine, collar, 0, 0.497, 0.006);

    // ---- neck & head
    const neck = new T.Group(); neck.position.set(0, 0.5, 0); neck.rotation.order = 'YXZ'; spine.add(neck); J.neck = neck;
    const neckMesh = new T.Mesh(limbGeo(0.07, [0.056, 0.059, 0.068]), mats.skin); neckMesh.scale.set(1.02, 1, 0.9); neckMesh.rotation.x = -0.12; add(neck, neckMesh, 0, 0.07, 0.004);
    const head = new T.Group(); head.position.set(0, 0.128, 0.016); neck.add(head); J.head = head;
    head.add(AVATAR_HEAD.build(lin(SKIN)));

    // ---- arms & hands
    J.fingers = { L: [], R: [] }; J.thumb = {}; J.dumbbell = {};
    const FING = [[0.026, [0.041, 0.025, 0.021]], [0.009, [0.045, 0.028, 0.023]], [-0.008, [0.043, 0.027, 0.022]], [-0.024, [0.034, 0.021, 0.019]]];
    ['L', 'R'].forEach(s => {
      const sg = s === 'L' ? 1 : -1, px = -sg;
      const ua = new T.Group(); ua.position.set(sg * 0.192, 0.418, -0.005); ua.rotation.order = 'ZXY'; spine.add(ua); J[s + '_upperArm'] = ua;
      add(ua, ell(0.057, 1.05, 1.15, 1.0, mats.shirt), sg * 0.004, -0.03, 0); // deltoid under sleeve
      add(ua, new T.Mesh(limbGeo(0.29, [0.047, 0.051, 0.048, 0.041, 0.036]), mats.skin));
      add(ua, ell(0.03, 1, 1.9, 1.05, mats.skin), 0, -0.155, 0.017);  // biceps
      add(ua, ell(0.031, 1.02, 2.0, 0.95, mats.skin), 0, -0.13, -0.016); // triceps
      ua.add(new T.Mesh(lathe([[0.058, -0.16], [0.06, -0.1], [0.062, -0.04], [0.056, 0.015], [0.036, 0.048], [0.0, 0.058]]), mats.shirt));
      add(ua, new T.Mesh(new T.TorusGeometry(0.0595, 0.0028, 8, 40), mats.rib), 0, -0.158, 0).rotation.x = Math.PI / 2;

      const fa = new T.Group(); fa.position.set(0, -0.29, 0); fa.rotation.order = 'XYZ'; ua.add(fa); J[s + '_forearm'] = fa;
      add(fa, new T.Mesh(limbGeo(0.258, [0.037, 0.042, 0.037, 0.029, 0.025]), mats.skin));
      add(fa, ell(0.027, 1.1, 2.3, 1.0, mats.skin), sg * 0.008, -0.06, 0.006); // brachioradialis
      const band = new T.Mesh(lathe([[0.0285, -0.024], [0.0305, -0.02], [0.031, 0.02], [0.0295, 0.024]]), mats.band); add(fa, band, 0, -0.218, 0);

      const hand = new T.Group(); hand.position.set(0, -0.258, 0); fa.add(hand); J[s + '_hand'] = hand;
      const palm = ell(1, 0.0155, 0.05, 0.04, mats.skinHand, 32, 24); add(hand, palm, px * 0.001, -0.05, 0.001);
      add(hand, ell(1, 0.014, 0.022, 0.016, mats.skinHand), px * 0.007, -0.047, 0.022);   // thenar
      add(hand, ell(1, 0.012, 0.026, 0.012, mats.skinHand), px * 0.005, -0.06, -0.026);   // hypothenar
      FING.forEach(([z, L], i) => {
        const r0 = [0.0092, 0.0095, 0.009, 0.008][i];
        const f1 = new T.Group(); f1.position.set(0, -0.092, z); f1.rotation.order = 'XYZ'; hand.add(f1);
        f1.add(new T.Mesh(limbGeo(L[0], [r0, r0 * 0.9], { seg: 16 }), mats.skinHand));
        add(f1, ell(r0 * 1.05, 1, 1, 1, mats.skinHand, 16, 12), 0, 0, 0); // knuckle
        const f2 = new T.Group(); f2.position.set(0, -L[0], 0); f1.add(f2);
        f2.add(new T.Mesh(limbGeo(L[1], [r0 * 0.88, r0 * 0.8], { seg: 16 }), mats.skinHand));
        const f3 = new T.Group(); f3.position.set(0, -L[1], 0); f2.add(f3);
        f3.add(new T.Mesh(limbGeo(L[2], [r0 * 0.78, r0 * 0.7], { seg: 16 }), mats.skinHand));
        const nail = ell(1, 0.0018, L[2] * 0.36, r0 * 0.62, mats.nail, 16, 12); add(f3, nail, -px * r0 * 0.66, -L[2] * 0.62, 0);
        J.fingers[s].push({ f1, f2, f3, spreadK: [-1.3, -0.4, 0.4, 1.3][i] });
      });
      // thumb: two phalanges placed by explicit kinematics in applyPose
      const t1 = new T.Group(), t2 = new T.Group(); hand.add(t1); hand.add(t2);
      t1.add(new T.Mesh(limbGeo(0.033, [0.0115, 0.0102], { seg: 16 }), mats.skinHand));
      t2.add(new T.Mesh(limbGeo(0.029, [0.0098, 0.0082], { seg: 16 }), mats.skinHand));
      add(t2, ell(1, 0.0019, 0.0105, 0.0068, mats.nail, 16, 12), -px * 0.0072, -0.018, 0);
      J.thumb[s] = { t1, t2, px };
      const db = new T.Group(); db.position.set(px * 0.03, -0.085, -0.002); hand.add(db);
      const handle = new T.Mesh(new T.CylinderGeometry(0.0135, 0.0135, 0.15, 20), mats.metal); handle.rotation.x = Math.PI / 2; db.add(handle);
      [-1, 1].forEach(e => { const pl = new T.Mesh(new T.CylinderGeometry(0.043, 0.043, 0.045, 6), mats.iron); pl.rotation.x = Math.PI / 2; pl.position.z = e * 0.088; db.add(pl); });
      db.visible = false; J.dumbbell[s] = db;
      // soft therapy ball for the finger squeeze, held in the palm
      J.ball = J.ball || {};
      const ball = new T.Mesh(new T.SphereGeometry(0.031, 32, 24), new T.MeshPhysicalMaterial({ color: lin(0x5b8db0), roughness: 0.55, sheen: lin(0x9cc4de), clearcoat: 0.2 }));
      ball.position.set(px * 0.036, -0.085, 0.004); ball.castShadow = true; ball.visible = false; hand.add(ball); J.ball[s] = ball;

      // ---- legs
      const th = new T.Group(); th.position.set(sg * 0.093, -0.03, 0); th.rotation.order = 'ZXY'; hips.add(th); J[s + '_thigh'] = th;
      const thighMesh = new T.Mesh(limbGeo(0.44, [0.088, 0.086, 0.078, 0.065, 0.054, 0.0488, 0.0475]), mats.skin);
      thighMesh.scale.set(1, 1, 0.95); th.add(thighMesh);
      const patella = ell(0.021, 1.0, 1.15, 0.55, mats.skin); add(th, patella, 0, -0.438, 0.035);  // kneecap
      th.add(new T.Mesh(lathe([[0.094, -0.25], [0.091, -0.16], [0.092, -0.05], [0.092, 0.03], [0.088, 0.075]]), mats.shorts));
      add(th, new T.Mesh(new T.TorusGeometry(0.0935, 0.0026, 8, 44), mats.rib), 0, -0.248, 0).rotation.x = Math.PI / 2;
      const shin = new T.Group(); shin.position.set(0, -0.44, 0); th.add(shin); J[s + '_shin'] = shin;
      const shinMesh = new T.Mesh(limbGeo(0.43, [0.0475, 0.0478, 0.0485, 0.045, 0.038, 0.0325, 0.029]), mats.skin);
      shinMesh.scale.set(1, 1, 0.95); shin.add(shinMesh);
      const calf = ell(0.044, 1.0, 2.4, 0.95, mats.skin); add(shin, calf, -sg * 0.004, -0.13, -0.017); // calf
      const calfIn = ell(0.03, 1.0, 2.2, 0.9, mats.skin); add(shin, calfIn, -sg * 0.012, -0.11, -0.02);  // inner calf head
      const foot = new T.Group(); foot.position.set(0, -0.43, 0); shin.add(foot); J[s + '_foot'] = foot;
      buildTrainer(foot, sg, mats);
      J[s + '_footPts'] = { heel: new T.Vector3(0, -0.097, -0.075), toe: new T.Vector3(0, -0.097, 0.188), ball: new T.Vector3(0, -0.097, 0.12) };
    });

    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { root, J, mats };
  }

  // Dark trainers (character sheet): knit upper, light sole, heel counter, padded collar and laces.
  // Built in the foot group's frame: ankle at the origin, ground contact at y = -0.097 (as the bare foot was).
  function buildTrainer(foot, sg, mats) {
    const prof = (zs, vs, z) => { if (z <= zs[0]) return vs[0]; for (let i = 1; i < zs.length; i++) if (z <= zs[i]) { const u = (z - zs[i - 1]) / (zs[i] - zs[i - 1]), w = (1 - Math.cos(u * Math.PI)) / 2; return vs[i - 1] * (1 - w) + vs[i] * w; } return vs[vs.length - 1]; };
    // shape a sphere into a shoe-like volume: per-z half width, top and bottom heights
    function shaped(zs, halfW, topY, botY, flat, seg) {
      const Z0 = zs[0], Z1 = zs[zs.length - 1], ZC = (Z0 + Z1) / 2, ZL = (Z1 - Z0) / 2;
      const geo = new T.SphereGeometry(1, seg || 56, 36), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const dx = pos.getX(i), dy = pos.getY(i), dz = pos.getZ(i);
        const z = ZC + ZL * Math.sign(dz) * Math.pow(Math.abs(dz), 0.7);
        const w = prof(zs, halfW, z), top = prof(zs, topY, z), bot = typeof botY === 'number' ? botY : prof(zs, botY, z);
        const mid = (top + bot) / 2, half = (top - bot) / 2;
        const yy = dy < 0 ? -Math.pow(-dy, flat) : Math.pow(dy, dy > 0 ? 0.8 : 1);
        const outer = 1 + 0.06 * Math.max(0, dx * sg);
        pos.setXYZ(i, Math.sign(dx) * Math.pow(Math.abs(dx), 0.85) * w * outer, mid + half * yy, z);
      }
      geo.computeVertexNormals();
      return geo;
    }
    const zs = [-0.102, -0.07, -0.02, 0.04, 0.095, 0.14, 0.178];
    // upper: knit body rising to the collar at the heel and the tongue at the instep
    const upper = new T.Mesh(shaped(zs, [0.031, 0.039, 0.04, 0.042, 0.048, 0.049, 0.04],
      [-0.012, 0.004, 0.022, -0.02, -0.05, -0.066, -0.076], -0.086, 0.35), mats.shoe);
    foot.add(upper);
    // midsole / outsole: a light slab that wraps a little up the sides, slight toe spring
    const sole = new T.Mesh(shaped([-0.106, -0.07, -0.02, 0.04, 0.095, 0.14, 0.184], [0.034, 0.042, 0.042, 0.044, 0.051, 0.052, 0.043],
      [-0.08, -0.081, -0.082, -0.083, -0.083, -0.081, -0.074], [-0.104, -0.104, -0.104, -0.104, -0.104, -0.102, -0.095], 0.25), mats.sole);
    foot.add(sole);
    const tread = new T.Mesh(shaped([-0.104, -0.07, -0.02, 0.04, 0.095, 0.14, 0.182], [0.033, 0.041, 0.041, 0.043, 0.05, 0.051, 0.042],
      [-0.1, -0.1, -0.1, -0.1, -0.1, -0.099, -0.093], [-0.106, -0.106, -0.106, -0.106, -0.106, -0.104, -0.097], 0.25), mats.lace);
    foot.add(tread);
    // heel counter
    const counter = new T.Mesh(new T.SphereGeometry(1, 32, 16, Math.PI * 0.62, Math.PI * 0.76, Math.PI * 0.35, Math.PI * 0.4), mats.shoeTrim);
    counter.scale.set(0.034, 0.05, 0.036); counter.position.set(0, -0.052, -0.07); foot.add(counter);
    // padded collar round the ankle
    const collar = new T.Mesh(new T.TorusGeometry(0.036, 0.0075, 10, 40), mats.shoe);
    collar.rotation.x = Math.PI / 2 + 0.22; collar.scale.set(0.92, 1.18, 1); collar.position.set(0, 0.002, -0.03); foot.add(collar);
    // tongue and laces across the instep
    const tongue = ell(1, 0.02, 0.006, 0.05, mats.shoeTrim, 20, 12); tongue.rotation.x = 0.62; add(foot, tongue, 0, -0.012, 0.03);
    for (let k = 0; k < 4; k++) {
      const z = 0.012 + k * 0.022, y = -0.018 - k * 0.0135;
      const lace = new T.Mesh(new T.BoxGeometry(0.036 - k * 0.002, 0.0024, 0.0042), mats.lace);
      lace.position.set(0, y + 0.004, z); lace.rotation.x = 0.55; foot.add(lace);
    }
    // side stripe
    const stripe = new T.Mesh(new T.TorusGeometry(0.06, 0.0022, 6, 30, Math.PI * 0.5), mats.shoeTrim);
    stripe.rotation.set(0, sg * Math.PI / 2, Math.PI * 0.08); stripe.position.set(sg * 0.044, -0.088, 0.03); foot.add(stripe);
    const stripe2 = stripe.clone(); stripe2.position.x = -sg * 0.042; foot.add(stripe2);
  }

  // Bare foot: one sculpted mesh for heel, arch and forefoot, plus five toes with joints and toenails
  function buildFoot(foot, sg, mats) {
    const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const prof = (zs, vs, z) => { if (z <= zs[0]) return vs[0]; for (let i = 1; i < zs.length; i++) if (z <= zs[i]) { const u = (z - zs[i - 1]) / (zs[i] - zs[i - 1]), w = (1 - Math.cos(u * Math.PI)) / 2; return vs[i - 1] * (1 - w) + vs[i] * w; } return vs[vs.length - 1]; };
    const Z0 = -0.088, Z1 = 0.158, ZC = (Z0 + Z1) / 2, ZL = (Z1 - Z0) / 2;
    const zs = [-0.088, -0.05, -0.01, 0.04, 0.09, 0.125, 0.158];
    const halfW = [0.024, 0.031, 0.032, 0.034, 0.04, 0.044, 0.041];
    const topY = [-0.058, -0.014, 0.014, -0.03, -0.058, -0.072, -0.078];
    const geo = new T.SphereGeometry(1, 64, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i), dy = pos.getY(i), dz = pos.getZ(i);
      const z = ZC + ZL * Math.sign(dz) * Math.pow(Math.abs(dz), 0.8);
      const w = prof(zs, halfW, z), top = prof(zs, topY, z);
      const medial = sm(0, -0.8, dx * sg);           // inner edge of the foot
      const arch = 0.011 * Math.exp(-Math.pow((z - 0.035) / 0.05, 2)) * medial;
      const bot = -0.097 + arch;
      const mid = (top + bot) / 2, half = (top - bot) / 2;
      const yy = dy < 0 ? -Math.pow(-dy, 0.45) : dy;   // flatter sole
      const outer = 1 + 0.08 * Math.max(0, dx * sg);  // slightly wider outer edge
      pos.setXYZ(i, dx * w * outer + sg * 0.002 * (z - 0.04) / 0.1, mid + half * yy, z);
    }
    geo.computeVertexNormals();
    foot.add(new T.Mesh(geo, mats.skin));
    // ankle: bridge into the shin, inner and outer ankle bones, achilles
    add(foot, ell(0.0075, 0.8, 1.3, 1, mats.skin, 18, 14), sg * 0.0205, -0.016, -0.006);
    add(foot, ell(0.007, 0.8, 1.3, 1, mats.skin, 18, 14), -sg * 0.0195, -0.01, -0.003);
    add(foot, ell(1, 0.011, 0.04, 0.01, mats.skin), 0, -0.022, -0.02);
    // toes: [x, base z, radius, proximal length, distal length, splay]
    const TOES = [[-0.024, 0.15, 0.0118, 0.022, 0.019, -0.06], [-0.002, 0.152, 0.0085, 0.017, 0.013, 0.0],
      [0.0135, 0.146, 0.0081, 0.015, 0.012, 0.05], [0.0275, 0.137, 0.0076, 0.013, 0.011, 0.1], [0.04, 0.125, 0.0071, 0.011, 0.01, 0.16]];
    const toenail = new T.MeshPhysicalMaterial({ color: lin(0xc9967f), roughness: 0.45, clearcoat: 0.3 });
    TOES.forEach(([x, z0, r, l1, l2, splay]) => {
      const t1 = new T.Group(); t1.position.set(sg * x, -0.097 + r * 0.85 + 0.0008, z0); t1.rotation.set(-Math.PI / 2 + 0.06, sg * splay, 0); t1.scale.set(1.08, 1, 0.85); foot.add(t1);
      t1.add(new T.Mesh(limbGeo(l1, [r, r * 0.93], { seg: 18 }), mats.skinHand));
      add(t1, ell(r * 1.08, 1, 1, 1, mats.skinHand, 18, 14), 0, 0, 0); // joint at the ball of the foot
      const t2 = new T.Group(); t2.position.set(0, -l1, 0); t2.rotation.x = 0.14; t1.add(t2);
      t2.add(new T.Mesh(limbGeo(l2, [r * 0.93, r * 0.86], { seg: 18 }), mats.skinHand));
      add(t2, ell(1, r * 0.72, l2 * 0.42, 0.0017, toenail, 16, 12), 0, -l2 * 0.6, r * 0.8);
      add(t2, ell(1, r * 0.95, l2 * 0.38, r * 0.7, mats.skinHand, 16, 12), 0, -l2 * 0.55, -r * 0.18); // toe pad
    });
  }

  const _a = new T.Vector3(), _b = new T.Vector3(), _down = new T.Vector3(0, -1, 0);
  function applyPose(J, p) {
    J.spine.rotation.set(rad(p.trunkFlex), rad(p.trunkRot), -rad(p.trunkLat));
    J.neck.rotation.set(rad(p.neckFlex), rad(p.neckRot), -rad(p.neckLat));
    ['L', 'R'].forEach(s => {
      const sg = s === 'L' ? 1 : -1, g = k => p[s + '_' + k] || 0;
      J[s + '_upperArm'].rotation.set(-rad(g('shFlex')), sg * rad(g('shRot')), sg * rad(g('shAbd')));
      J[s + '_forearm'].rotation.set(-rad(g('elFlex')), -sg * rad(g('pron')), 0);
      J[s + '_hand'].rotation.set(0, 0, -sg * rad(g('wrFlex')));
      const curl = g('finCurl'), spread = g('finSpread');
      J.fingers[s].forEach(f => {
        f.f1.rotation.set(rad(spread) * f.spreadK, 0, -sg * rad(curl * 0.95));
        f.f2.rotation.set(0, 0, -sg * rad(curl * 1.12));
        f.f3.rotation.set(0, 0, -sg * rad(curl * 0.75));
      });
      // Thumb: opens forward-down beside the index; closes across the palm side, over the curled fingers
      const t = J.thumb[s], px = t.px, c = Math.max(0, Math.min(1.05, curl / 90)), sp = spread / 25;
      const P0 = _a.set(px * (0.011 + 0.01 * c), -0.044 - 0.008 * c, 0.033 - 0.008 * c);
      const d1 = _b.set(px * (0.28 + 0.5 * c), -0.6 - 0.02 * c, (0.74 + 0.2 * sp) * (1 - c) - 0.42 * c).normalize();
      t.t1.position.copy(P0); t.t1.quaternion.setFromUnitVectors(_down, d1);
      t.t2.position.copy(P0).addScaledVector(d1, 0.033);
      const d2 = d1.set(px * (0.2 + 0.25 * c), -0.8 + 0.42 * c, (0.56 + 0.15 * sp) * (1 - c) - 0.86 * c).normalize();
      t.t2.quaternion.setFromUnitVectors(_down, d2);
      J[s + '_thigh'].rotation.set(-rad(g('hipFlex')), 0, sg * rad(g('hipAbd')));
      J[s + '_shin'].rotation.set(rad(g('knFlex')), 0, 0);
      J[s + '_foot'].rotation.set(rad(g('hipFlex') - g('knFlex') + g('ankPF')), 0, -sg * rad(g('hipAbd')) * 0.8);
    });
  }

  // Keep feet on the floor: lowest foot point at y=0 and the planted foot's ball fixed in place
  const _v = new T.Vector3();
  function ground(av, plant, restBall) {
    const { root, J } = av;
    root.position.set(0, 1, 0);
    root.updateMatrixWorld(true);
    let minY = Infinity; const lows = {}, balls = {};
    ['L', 'R'].forEach(s => {
      const pts = J[s + '_footPts'], f = J[s + '_foot']; let m = Infinity;
      for (const k of ['heel', 'toe', 'ball']) { _v.copy(pts[k]); f.localToWorld(_v); m = Math.min(m, _v.y); }
      lows[s] = m; minY = Math.min(minY, m);
      balls[s] = f.localToWorld(_v.copy(pts.ball)).clone();
    });
    let anchors;
    if (plant) anchors = [plant];
    else if (Math.abs(lows.L - lows.R) < 0.012) anchors = ['L', 'R'];
    else anchors = [lows.L < lows.R ? 'L' : 'R'];
    let dx = 0, dz = 0;
    anchors.forEach(s => { dx += balls[s].x - restBall[s].x; dz += balls[s].z - restBall[s].z; });
    dx /= anchors.length; dz /= anchors.length;
    root.position.set(-dx, 1 - minY, -dz);
    root.updateMatrixWorld(true);
  }
  function restBalls(av) {
    av.root.position.set(0, 1, 0); av.root.updateMatrixWorld(true);
    const out = {};
    ['L', 'R'].forEach(s => { out[s] = av.J[s + '_foot'].localToWorld(av.J[s + '_footPts'].ball.clone()); out[s].y = 0; });
    return out;
  }

  root.AVATAR = { build, applyPose, ground, restBalls };
})(window);


/* ===== Studio, shared renderer and the angle mapping for ReMotion ===== */
(function (root) {
  'use strict';
  const T = root.THREE;
  const rad = d => d * Math.PI / 180;
  const lin = c => new T.Color(c).convertSRGBToLinear();

  const HEAD_SCALE = 1.18;
  /* sign that turns a wanted wrist angle into the rig's wrFlex with the palm down (solved numerically) */
  const WRIST_LEVEL = -1;

  /* MotionRx's relaxed standing pose: limbs that are not exercising rest like this. */
  const RELAXED = { neckFlex: 0, neckRot: 0, neckLat: 0, trunkFlex: 0, trunkRot: 0, trunkLat: 0 };
  ['L', 'R'].forEach(s => Object.assign(RELAXED, {
    [s + '_shAbd']: 9, [s + '_shFlex']: 0, [s + '_shRot']: 0, [s + '_elFlex']: 10, [s + '_pron']: 0,
    [s + '_wrFlex']: 0, [s + '_finCurl']: 15, [s + '_finSpread']: 0,
    [s + '_hipFlex']: 0, [s + '_hipAbd']: 2, [s + '_knFlex']: 0, [s + '_ankPF']: 0
  }));
  const both = (o) => { const r = {}; Object.keys(o).forEach(k => { r['L_' + k] = o[k]; r['R_' + k] = o[k]; }); return r; };

  /* ======================================================================
   *  THE MAPPING  — the only place where ReMotion meets the 3D rig.
   *
   *  Input:  the exercise id, the angle `th` and the direction `dir`, exactly
   *          as exercise-figures.js gives them to its own drawing (nothing is
   *          changed or re-scaled here: `th` is the angle the marks show).
   *  Output: pose   joint values in the rig's terms (degrees)
   *          hipTilt pelvis tilt inside the rig (squat only, see below)
   *          view   'front' | 'side'  — same view as the 2D figure
   *          anchor rig joint that must sit on the 2D figure's mark pivot,
   *                 `at` is that pivot in the figure's 200x200 space,
   *                 `scale` is figure units per metre.
   *
   *  Rig conventions handled here: the rig faces +Z; its L side is +X.
   *  Front view looks from +Z so the figure mirrors the patient (screen
   *  right = rig L), side view looks from -X so the figure faces screen right,
   *  as the 2D figures do. Screen directions in ReMotion therefore map to:
   *      neckRot  +  = face turns to screen right
   *      neckLat  +  = ear goes to screen right
   *      neckFlex +  = chin down (forward)
   *  How each joint moves (which joints share the motion, palm turned up for
   *  the curl, head turning on the neck axis, arms forward in the squat …)
   *  follows MotionRx; how FAR it moves is always ReMotion's `th`.
   * ==================================================================== */
  function mapAngles(exId, th, dir) {
    const p = Object.assign({}, RELAXED);
    let view = 'side', anchor = null, hipTilt = 0, iso = null, table = false, floor = false;
    const extra = {};
    switch (exId) {
      case 'neck_flexion':
        p.neckFlex = dir === 'extension' ? -th : th;
        anchor = { joint: 'neck', at: [100, 146], scale: 285 };
        break;
      case 'neck_rotation':
        view = 'front';
        p.neckRot = dir === 'left' ? -th : th;
        anchor = { joint: 'neck', at: [100, 154], scale: 285 };
        break;
      case 'neck_lateral_flexion':
        view = 'front';
        p.neckLat = dir === 'left' ? -th : th;
        anchor = { joint: 'neck', at: [100, 150], scale: 285 };
        break;
      case 'shoulder_abduction': {
        view = 'front';
        /* ReMotion's own visible arm angle (clears the body at rest) */
        const vis = th + 7 * Math.max(0, 1 - th / 30);
        Object.assign(p, both({ shAbd: vis, elFlex: 3, finCurl: 12 }));
        anchor = { joint: 'L_upperArm', at: [125, 84], scale: 150 };
        break;
      }
      case 'shoulder_flexion':
        Object.assign(p, both({ shFlex: th, elFlex: 4, shAbd: 4 }));
        anchor = { joint: 'R_upperArm', at: [100, 86], scale: 150 };
        break;
      case 'elbow_flexion':
        /* MotionRx curl: palm turned up, upper arm still */
        Object.assign(p, both({ shAbd: 5, shFlex: 0, elFlex: th, pron: -80, finCurl: 25 }));
        anchor = { joint: 'R_forearm', at: [100, 116], scale: 150 };
        break;
      case 'squat': {
        /* The body arrangement comes from ReMotion's squatGeometry() — the
           same one its 2D figure and knee marks use — so the knee bends by
           exactly th and the knee sits on the knee arc. Heels flat, hips
           back, trunk balanced over the feet, arms straight forward.
           Part of the trunk lean is carried by the pelvis (rig detail only;
           segment directions are unchanged by it). */
        const g = root.ExerciseFigures.squatGeometry(th);
        hipTilt = 0.4 * g.trunk;
        p.trunkFlex = g.trunk - hipTilt;
        p.neckFlex = g.head - g.trunk;
        Object.assign(p, both({
          hipFlex: g.thigh + hipTilt, knFlex: th, ankPF: -hipTilt, hipAbd: 4,
          shFlex: g.arm + g.trunk, shAbd: 6, elFlex: 6, finCurl: 15   // a forward trunk swings a hanging arm back: add it
        }));
        anchor = { joint: 'R_foot', at: [94, 180], scale: 88 };
        floor = true;
        break;
      }
      case 'wrist_flexion':
        /* MotionRx forearm-supported set-up (elbow at the side, forearm
           forward), palm turned up so flexion lifts the hand as in ReMotion */
        /* rig values solved so the forearm lies level and the wrist hinge
           faces the camera: the hand then turns by exactly th on screen */
        Object.assign(p, { R_shFlex: 12, R_shAbd: 0, R_elFlex: 78, R_pron: -91, R_finCurl: 8 });
        p.R_wrFlex = dir === 'extension' ? -th : th;
        anchor = { joint: 'R_hand', at: [118, 112], scale: 310 };
        table = true;
        break;
      case 'finger_flexion':
        /* hand up, palm to the camera; fingers and thumb close by MotionRx's
           kinematics. ReMotion's 0–100 % closure → 0–92° finger curl. */
        view = 'front';
        Object.assign(p, { R_shFlex: 90, R_shAbd: 0, R_elFlex: 90, R_pron: 90, R_finCurl: 92 * Math.max(0, Math.min(1, th / 100)) });
        anchor = { joint: 'R_hand', at: [100, 186], scale: 640 };
        iso = 'R_forearm';
        break;
      /* ================= v17.8 — new exercises =================
         Same rule as above: the joint that is measured sits on the 2D
         figure's mark pivot (anchor.at), and moves by exactly th on screen.
         v18: the patient's camera is always IN FRONT, so turns in the
         horizontal plane are shown from the front with the camera raised
         30° ('frontUp'): the goniometer lies flat and reads as an ellipse
         half as tall as wide (ExerciseFigures 'hz' marks). */
      case 'shoulder_external_rotation':
      case 'external_rotation_stick': {
        view = 'frontUp';
        const stick = exId === 'external_rotation_stick';
        Object.assign(p, both({ shAbd: 4, elFlex: 90, finCurl: stick ? 70 : 25 }));
        p.L_shRot = th;                                  // screen-right arm turns outward by th
        p.R_shRot = stick ? -0.6 * th : th;              // stick: the other forearm follows across
        anchor = { joint: 'L_forearm', at: [132, 110], scale: 150 };
        extra.props = stick ? { stick: true } : {};
        break;
      }
      case 'pendulum': {
        const g = dir === 'back' ? -th : th;
        p.trunkFlex = 68;                                 // MotionRx lean
        Object.assign(p, both({ hipFlex: 14, knFlex: 22 }));
        /* a forward trunk swings a hanging arm back, so its lean is added */
        Object.assign(p, { R_shFlex: g + 68, R_shAbd: 3, R_elFlex: 4, R_finCurl: 20,
                           L_shFlex: 55 + 68, L_shAbd: 6, L_elFlex: 12, L_pron: 70, L_finCurl: 10 });
        anchor = { joint: 'R_upperArm', at: [112, 96], scale: 95 };
        extra.props = { deskUnder: 'L_hand' };
        floor = true;
        break;
      }
      case 'assisted_shoulder_flexion':
        extra.rootRot = -90;                              // lying on the back, head to the screen's left
        Object.assign(p, both({ shFlex: th, shAbd: -12, elFlex: 8, finCurl: 40, hipFlex: 60, knFlex: 110, ankPF: 90 }));
        anchor = { joint: 'R_upperArm', at: [70, 128], scale: 100 };
        extra.props = { mat: true };
        break;
      case 'finger_walk': {
        const g = root.ExerciseFigures.geometry.fingerWalk(th);
        Object.assign(p, { R_shFlex: g.upper, R_shAbd: 2, R_elFlex: g.elbow, R_finCurl: 12, R_wrFlex: 0 });
        anchor = { joint: 'R_upperArm', at: [100, 86], scale: 103 };
        extra.props = { wall: 0.47 };
        break;
      }
      case 'table_slide': {
        const g = root.ExerciseFigures.geometry.tableSlide(th);
        p.trunkFlex = g.lean;
        p.neckFlex = -0.4 * g.lean;
        Object.assign(p, both({ hipFlex: 90, knFlex: 90 }));
        Object.assign(p, { R_shFlex: th, R_shAbd: 4, R_elFlex: g.elbow, R_pron: 88, R_finCurl: 8,   // shFlex = upper + lean = th
                           R_wrFlex: WRIST_LEVEL * (90 - (g.upper + g.elbow)),
                           L_shFlex: 30 + g.lean, L_elFlex: 45 });
        anchor = { joint: 'R_thigh', at: [50, 150], scale: 100 };
        extra.props = { desk: 0.23, stool: true, towel: true };
        break;
      }
      case 'cross_body_stretch': {
        view = 'frontUp';
        const up = Math.max(0, Math.min(1, th / 12));
        Object.assign(p, { L_shFlex: 90 * up + 9 * (1 - up), L_shAbd: 0, L_elFlex: 6, L_finCurl: 20,
                           R_shFlex: 50 * up, R_shAbd: 0, R_elFlex: 80 * up + 10, R_finCurl: 45 });
        extra.yaw = { L_upperArm: -th, R_upperArm: 55 * up };   // the other hand holds the arm near the elbow
        anchor = { joint: 'L_upperArm', at: [129, 75], scale: 137 };
        break;
      }
      case 'scapular_squeeze': {
        const ext = 0.3 * Math.max(0, Math.min(100, th));
        p.trunkFlex = -0.06 * th; p.neckFlex = 0.06 * th;
        Object.assign(p, both({ shFlex: -ext, shAbd: 6, elFlex: 90, shRot: 10, finCurl: 45 }));
        anchor = { joint: 'R_upperArm', at: [100, 86], scale: 150 };
        break;
      }
      case 'trunk_rotation':
        view = 'frontUp';
        p.trunkRot = dir === 'left' ? -th : th;
        Object.assign(p, both({ shFlex: 55, elFlex: 115, shRot: -55, shAbd: 12, finCurl: 45 }));
        anchor = { joint: 'spine', at: [100, 118], scale: 140 };
        break;
      case 'hip_abduction':
        view = 'front';
        Object.assign(p, { L_hipAbd: th, R_hipAbd: 2, R_shAbd: 24, R_elFlex: 18, R_finCurl: 55 });
        anchor = { joint: 'L_thigh', at: [109, 100], scale: 95 };
        extra.props = { postAt: 'R_hand' };
        floor = true;
        break;
      case 'standing_march': {
        const k = Math.max(0, Math.min(1, th / 90));
        const m = dir === 'left' ? 'L' : 'R', o = m === 'L' ? 'R' : 'L';
        p[m + '_hipFlex'] = th; p[m + '_knFlex'] = Math.min(125, th);
        p[o + '_shFlex'] = 25 * k; p[o + '_elFlex'] = 10 + 30 * k;  // opposite arm swings forward
        p[m + '_shFlex'] = -12 * k;
        anchor = { joint: 'R_thigh', at: [95, 100], scale: 95 };
        floor = true;
        break;
      }
      case 'standing_knee_flexion': {
        const m = dir === 'left' ? 'L' : 'R';
        p[m + '_knFlex'] = th; p[m + '_hipFlex'] = 0;
        Object.assign(p, both({ shFlex: 45, elFlex: 30, finCurl: 55, shAbd: 4 }));
        anchor = { joint: 'R_shin', at: [95, 145], scale: 95 };
        extra.props = { postAt: 'R_hand', postBoth: true };
        floor = true;
        break;
      }
      case 'forward_lunge': {
        const g = root.ExerciseFigures.geometry.lunge(th);
        p.trunkFlex = g.trunk;
        Object.assign(p, { R_hipFlex: g.thigh, R_knFlex: th, R_ankPF: 0,
                           L_hipFlex: g.backHip, L_knFlex: g.backKnee, L_ankPF: g.backAnkle,
                           L_shFlex: 12, R_shFlex: 6, L_elFlex: 20, R_elFlex: 20 });
        anchor = { joint: 'R_foot', at: [128, 180], scale: 88 };
        extra.contact = true;        // back toes on the floor
        floor = true;
        break;
      }
      case 'heel_raise':
        Object.assign(p, both({ ankPF: th, shAbd: 8, elFlex: 12 }));
        anchor = { joint: 'R_foot', local: [0, -0.106, 0.12], at: [110, 185], scale: 88 };
        floor = true;
        break;
      case 'finger_spread':
        view = 'front';
        Object.assign(p, { R_shFlex: 90, R_shAbd: 0, R_elFlex: 90, R_pron: 90, R_finCurl: 0, R_finSpread: th / 2.6 });
        anchor = { joint: 'R_hand', at: [100, 186], scale: 640 };
        iso = 'R_forearm';
        break;
      default:
        return null;
    }
    return Object.assign({ pose: p, hipTilt, view, anchor, iso, table, floor }, extra);
  }

  /* ======================================================================
   *  STUDIO  (MotionRx lighting: soft-box environment + key, rim, fill)
   * ==================================================================== */
  let R = null;   // { renderer, scene, camera, av, key, ... }

  function init() {
    if (R) return R;
    const canvas = document.createElement('canvas');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(1);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;
    renderer.physicallyCorrectLights = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer);
    const envScene = new T.Scene();
    envScene.add(new T.Mesh(new T.BoxGeometry(12, 7, 12), new T.MeshBasicMaterial({ color: new T.Color(0.32, 0.33, 0.35), side: T.BackSide })));
    const panel = (w, h, x, y, z, k, tint) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(tint[0] * k, tint[1] * k, tint[2] * k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1, 0); envScene.add(m); };
    panel(4, 2.5, 2.5, 3, 4, 4.5, [1, 0.95, 0.88]);      // key softbox
    panel(3, 3, -4.5, 2, 1.5, 3.2, [0.92, 0.96, 1]);     // fill
    panel(2, 4, -1, 3, -5, 5, [0.85, 0.92, 1]);          // rim
    panel(8, 8, 0, 3.4, 0, 0.9, [1, 1, 1]);              // ceiling bounce
    const floorBounce = new T.Mesh(new T.PlaneGeometry(12, 12), new T.MeshBasicMaterial({ color: new T.Color(0.45, 0.42, 0.4) })); floorBounce.rotation.x = -Math.PI / 2; floorBounce.position.y = -0.4; envScene.add(floorBounce);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;

    scene.add(new T.HemisphereLight(0xe4edf7, 0x40372f, 0.15));
    const key = new T.DirectionalLight(0xfff1e2, 1.9); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 0.5, far: 12 });
    key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015; key.shadow.radius = 3;
    scene.add(key); scene.add(key.target);
    const rim = new T.DirectionalLight(0xcfe0ff, 1.1); scene.add(rim); scene.add(rim.target);
    const fill = new T.DirectionalLight(0xffffff, 0.25); scene.add(fill); scene.add(fill.target);
    const KEY = new T.Vector3(2.0, 4.2, 3.4), RIM = new T.Vector3(-2.4, 3, -3.2), FILL = new T.Vector3(-3, 1.4, 2.2);

    const av = root.AVATAR.build();
    av.root.position.set(0, 1, 0);
    /* a slightly larger head so the face reads clearly at guide size;
       raised by the same amount so the chin still meets the neck */
    av.J.head.scale.setScalar(HEAD_SCALE);
    av.J.head.position.y += 0.1 * (HEAD_SCALE - 1);
    scene.add(av.root);

    /* contact shadow for the whole-body view */
    const floor = new T.Mesh(new T.PlaneGeometry(4, 4), new T.ShadowMaterial({ opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.visible = false; scene.add(floor);

    /* forearm support for the wrist exercise (ReMotion's table colours) */
    const tableG = new T.Group(); tableG.visible = false; scene.add(tableG);
    const wood = new T.MeshPhysicalMaterial({ color: lin(0xd8bc8a), roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const top = new T.Mesh(new T.BoxGeometry(0.5, 0.045, 0.3), wood); top.castShadow = top.receiveShadow = true;
    top.position.set(0, -0.0225, -0.15); tableG.add(top);       // front edge at the group origin

    /* v17.8 props */
    const propMat = (c, r) => new T.MeshPhysicalMaterial({ color: lin(c), roughness: r === undefined ? 0.7 : r });
    const box = (mat) => { const m = new T.Mesh(new T.BoxGeometry(1, 1, 1), mat); m.castShadow = m.receiveShadow = true; m.visible = false; scene.add(m); return m; };
    const props = {
      stick: (function () { const m = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 1, 16), propMat(0x8a6b47, 0.5)); m.castShadow = true; m.visible = false; scene.add(m); return m; })(),
      wall: box(propMat(0xe8e1d6, 0.95)),
      mat: box(propMat(0x9fb3c8, 0.85)),
      desk: box(wood),
      towel: box(propMat(0xf4f6f8, 0.95)),
      stool: box(propMat(0x6b5a48, 0.6)),
      post: box(propMat(0x9aa6b2, 0.4)),
      post2: box(propMat(0x9aa6b2, 0.4)),
      rail: box(propMat(0x9aa6b2, 0.4))
    };

    /* everything, for the isolated close-up views */
    const meshes = []; av.root.traverse(o => { if (o.isMesh) { o.userData.baseVisible = o.visible; meshes.push(o); } });
    /* MotionRx's props (dumbbells, therapy ball) are never shown: ReMotion's exercises use none */
    ['L', 'R'].forEach(s => { av.J.dumbbell[s].visible = false; av.J.ball[s].visible = false; av.J.ball[s].userData.baseVisible = false; });
    const under = {};
    function subtree(name) {
      if (!under[name]) { const set = new Set(); av.J[name].traverse(o => { if (o.isMesh) set.add(o); }); under[name] = set; }
      return under[name];
    }

    const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.05, 30);
    R = { renderer, canvas, scene, camera, av, key, rim, fill, KEY, RIM, FILL, floor, tableG, meshes, subtree, props, w: 0, h: 0, isoNow: null };
    return R;
  }

  const _v = new T.Vector3(), _c = new T.Vector3(), _dir = new T.Vector3();

  const _q = new T.Quaternion(), _yAxis = new T.Vector3(0, 1, 0);
  function pose(m) {
    const { av } = R;
    root.AVATAR.applyPose(av.J, m.pose);
    av.J.hips.rotation.set(rad(m.hipTilt || 0), 0, 0);
    av.root.rotation.set(rad(m.rootRot || 0), 0, 0);          // v17.8: lying down
    if (m.yaw) Object.keys(m.yaw).forEach(function (j) {        // v17.8: horizontal swing of an arm
      _q.setFromAxisAngle(_yAxis, rad(m.yaw[j]));
      av.J[j].quaternion.premultiply(_q);
    });
    av.root.updateMatrixWorld(true);
    if (m.contact) backToesOnFloor(m);
  }

  /* v17.8 lunge: tune the back hip so the back toes rest on the floor
     (the front foot defines the floor). Rig detail only — the front knee
     angle, which is the one measured, is untouched. */
  const _t1 = new T.Vector3(), _t2 = new T.Vector3();
  function backToesOnFloor(m) {
    const { av } = R;
    const floorY = () => av.J.R_foot.localToWorld(_t1.set(0, -0.106, 0.04)).y;
    const toeY = () => av.J.L_foot.localToWorld(_t2.set(0, -0.1, 0.17)).y;
    const base = m.pose.L_hipFlex;
    let lo = -40, hi = 40;
    const at = d => { m.pose.L_hipFlex = base + d; root.AVATAR.applyPose(av.J, m.pose); av.root.updateMatrixWorld(true); return toeY() - floorY(); };
    const flo = at(lo), fhi = at(hi);
    if (flo * fhi > 0) { at(Math.abs(flo) < Math.abs(fhi) ? lo : hi); m.pose.L_hipFlex = base; return; }
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2, v = at(mid); if ((v > 0) === (flo > 0)) lo = mid; else hi = mid; }
    at((lo + hi) / 2);
    m.pose.L_hipFlex = base;
  }

  /**
   * Draw the avatar for (exId, th, dir) into a 2D canvas that covers the
   * figure-space box [box.x, box.x + box.w] x [box.y, box.y + box.h].
   */
  function draw(target, exId, th, dir, box) {
    const m = mapAngles(exId, th, dir);
    if (!m) return false;
    init();
    const { renderer, scene, camera, av, key, rim, fill, floor, tableG, meshes } = R;
    const W = target.width, H = target.height;
    if (!W || !H) return false;
    if (W > R.w || H > R.h) {
      R.w = Math.max(R.w, W); R.h = Math.max(R.h, H);
      renderer.setSize(R.w, R.h, false);
    }
    pose(m);

    /* isolated close-up (finger view shows the forearm and hand only) */
    if (R.isoNow !== m.iso) {
      const keep = m.iso ? R.subtree(m.iso) : null;
      meshes.forEach(o => { o.visible = o.userData.baseVisible && (!keep || keep.has(o)); });
      R.isoNow = m.iso;
    }

    /* anchor: the rig joint lands on ReMotion's mark pivot */
    const A = (m.anchor.local
      ? av.J[m.anchor.joint].localToWorld(_v.set(m.anchor.local[0], m.anchor.local[1], m.anchor.local[2]))
      : av.J[m.anchor.joint].getWorldPosition(_v.set(0, 0, 0))).clone();
    const s = m.anchor.scale, ax = m.anchor.at[0], ay = m.anchor.at[1];
    if (m.view === 'front') _dir.set(0, 0, 1);
    else if (m.view === 'frontUp') _dir.set(0, Math.sin(rad(30)), Math.cos(rad(30)));   // v18: front, camera raised 30°
    else _dir.set(-1, 0, 0);
    camera.position.copy(A).addScaledVector(_dir, 10);
    camera.up.set(0, 1, 0);
    camera.lookAt(A);
    camera.left = (box.x - ax) / s; camera.right = (box.x + box.w - ax) / s;
    camera.top = (ay - box.y) / s; camera.bottom = (ay - (box.y + box.h)) / s;
    camera.near = 0.05; camera.far = 30;
    camera.updateProjectionMatrix();

    /* lights follow the figure so every view is lit like MotionRx's studio */
    const C = av.J.spine.getWorldPosition(_c.set(0, 0, 0));
    key.position.copy(C).add(R.KEY); key.target.position.copy(C);
    rim.position.copy(C).add(R.RIM); rim.target.position.copy(C);
    fill.position.copy(C).add(R.FILL); fill.target.position.copy(C);
    key.target.updateMatrixWorld(); rim.target.updateMatrixWorld(); fill.target.updateMatrixWorld();

    /* floor under the trainers (squat) */
    floor.visible = !!m.floor;
    if (m.floor) {
      const fy = Math.min(av.J.R_foot.localToWorld(_c.set(0, -0.106, 0.04)).y, av.J.L_foot.localToWorld(_c.set(0, -0.106, 0.04)).y,
                          av.J.R_foot.localToWorld(_c.set(0, -0.104, 0.15)).y, av.J.L_foot.localToWorld(_c.set(0, -0.104, 0.15)).y);
      floor.position.set(A.x, fy, A.z);
    }
    placeProps(m);
    /* table under the forearm (wrist): front edge at the wrist */
    tableG.visible = !!m.table;
    if (m.table) {
      const wr = av.J.R_hand.getWorldPosition(_c.set(0, 0, 0));
      tableG.position.set(wr.x, wr.y - 0.031, wr.z + 0.012);
    }

    renderer.setScissorTest(true);
    renderer.setViewport(0, R.h - H, W, H);
    renderer.setScissor(0, R.h - H, W, H);
    renderer.clear();
    renderer.render(scene, camera);
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(R.canvas, 0, 0, W, H, 0, 0, W, H);
    return true;
  }

  /* v17.8: show and place the props an exercise uses */
  const _p = new T.Vector3(), _p2 = new T.Vector3();
  function placeProps(m) {
    const { av, props } = R;
    const P = m.props || {};
    Object.keys(props).forEach(k => { props[k].visible = false; });
    const W = (j, l) => l ? av.J[j].localToWorld(_p.set(l[0], l[1], l[2])).clone() : av.J[j].getWorldPosition(_p.set(0, 0, 0)).clone();
    const sole = () => Math.min(av.J.R_foot.localToWorld(_p.set(0, -0.106, 0.04)).y, av.J.L_foot.localToWorld(_p2.set(0, -0.106, 0.04)).y);
    if (P.stick) {
      const a = W('L_hand', [0, -0.07, 0.01]), b = W('R_hand', [0, -0.07, 0.01]);
      const mid = a.clone().add(b).multiplyScalar(0.5), d = a.clone().sub(b), L = d.length() + 0.22;
      props.stick.visible = true; props.stick.position.copy(mid); props.stick.scale.set(1, L, 1);
      props.stick.quaternion.setFromUnitVectors(_yAxis, d.normalize());
    }
    if (P.wall) {
      const s = W('R_upperArm');
      props.wall.visible = true; props.wall.scale.set(1.6, 3, 0.04);
      props.wall.position.set(s.x, s.y, s.z + P.wall + 0.02);
    }
    if (P.mat) {
      const s = W('R_upperArm'), hp = W('R_thigh');
      const y = Math.min(s.y, hp.y) - 0.12;
      props.mat.visible = true; props.mat.scale.set(0.8, 0.03, 2.1);
      props.mat.position.set(0, y - 0.015, (s.z + hp.z) / 2 + 0.25);
    }
    if (P.deskUnder) {
      const h = W(P.deskUnder, [0, -0.06, 0]);
      props.desk.visible = true; props.desk.scale.set(0.55, 0.045, 0.6);
      props.desk.position.set(h.x, h.y - 0.03 - 0.0225, h.z + 0.22);
      props.post.visible = true; props.post.scale.set(0.05, h.y - 0.05 - sole(), 0.05);
      props.post.position.set(h.x, (h.y - 0.05 + sole()) / 2, h.z + 0.45);
    }
    if (P.desk !== undefined) {
      const hp = W('R_thigh');
      const top = hp.y + P.desk;
      props.desk.visible = true; props.desk.scale.set(0.7, 0.045, 0.9);
      props.desk.position.set(hp.x + 0.1, top - 0.0225, hp.z + 0.3 + 0.45);
      props.post.visible = true; props.post.scale.set(0.06, top - sole(), 0.06);
      props.post.position.set(hp.x + 0.1, (top + sole()) / 2, hp.z + 1.1);
      if (P.towel) {
        const w = W('R_hand', [0, -0.06, 0]);
        props.towel.visible = true; props.towel.scale.set(0.16, 0.01, 0.24);
        props.towel.position.set(w.x, top + 0.005, w.z + 0.03);
      }
      if (P.stool) {
        props.stool.visible = true; props.stool.scale.set(0.4, hp.y - 0.11 - sole(), 0.36);
        props.stool.position.set(0, (hp.y - 0.11 + sole()) / 2, hp.z - 0.04);
      }
    }
    if (P.postAt) {
      const h = W(P.postAt, [0, -0.07, 0]);
      const top = h.y - 0.03, base = sole();
      props.post.visible = true; props.post.scale.set(0.045, top - base, 0.045);
      props.post.position.set(h.x, (top + base) / 2, h.z);
      props.rail.visible = true; props.rail.scale.set(P.postBoth ? 0.55 : 0.08, 0.035, 0.08);
      props.rail.position.set(P.postBoth ? 0 : h.x, top + 0.0175, h.z);
      if (P.postBoth) {
        const h2 = W('L_hand', [0, -0.07, 0]);
        props.post2.visible = true; props.post2.scale.set(0.045, top - base, 0.045);
        props.post2.position.set(h2.x, (top + base) / 2, h2.z);
      }
    }
  }

  function supported() {
    try {
      const c = document.createElement('canvas');
      return !!(root.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  root.ReMotionAvatar3D = {
    init, draw, supported, mapAngles,
    has: id => !!mapAngles(id, 0, null)
  };
})(window);
