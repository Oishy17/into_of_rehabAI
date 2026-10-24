/**
 * ============================================================================
 *  AVATAR 3D  (v19 · Sophia)
 * ============================================================================
 *  Two characters: female SOPHIA (sophia-model.js) and male MANUEL
 *  (manuel-model.js, T-shirt and cargo shorts), see CHARACTERS below.
 *  Both use the code here. The exercise avatar is SOPHIA: the Renderpeople scan baked in
 *  sophia-model.js (one skinned mesh, 88 bones, colour / normal / roughness
 *  maps), drawn with Three.js r128 (vendor/three.min.js) in the MotionRx
 *  studio lighting below. v21: she wears a sports outfit (loose black
 *  round-neck T-shirt, teal leggings, black trainers), repainted into her
 *  textures and reshaped at the hem by tools/gym_outfit.py.
 *
 *  Sophia is driven by the same joint rig the v17.6 character used. The rig
 *  is now invisible: its joints are placed on Sophia's joints, and every
 *  frame Sophia's bones copy the rig joints' rotations (retargeting). So
 *  ReMotion's angles still drive everything exactly as before:
 *  exercise-figures.js passes the same (exercise, angle, direction) it uses
 *  for its marks, and mapAngles() below — the one mapping function — turns
 *  them into rig joints. Anchors, views, props and lighting are unchanged.
 *
 *  Loaded on demand by exercise-figures.js (after sophia-model.js). If WebGL
 *  is not available the figures show their marks only.
 * ========================================================================== */

/* ===== Sophia: skinned mesh, rest pose and retargeting onto the rig ===== */
(function (root) {
  const T = root.THREE;

  /* model centimetres → rig metres. 1.1 gives Sophia the old character's
     overall height, so every exercise keeps its framing. */
  const SCALE = 0.011;
  /* every character is scaled to Sophia's height (head top 166.586 cm in her
     scan), so all exercises keep their framing whoever is shown */
  const REF_HEIGHT = 166.586;
  /* model space is Z up, facing -Y; rig space is Y up, facing +Z (L side +X) */
  const Q_AXES = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().set(
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1));
  const UP = new T.Vector3(0, 1, 0), DOWN = new T.Vector3(0, -1, 0), FWD = new T.Vector3(0, 0, 1);
  const LEFT = new T.Vector3(1, 0, 0), RIGHT = new T.Vector3(-1, 0, 0);
  /* the old character's shoulder → fingertip reach (upper arm, forearm, hand) */
  const OLD_REACH = 0.29 + 0.258 + 0.18;

  function decode(D) {
    const raw = atob(D.bin), buf = new ArrayBuffer(raw.length), u8 = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const L = D.meta.layout;
    return {
      pos: new Float32Array(buf, L[0][0], L[0][1]),
      nrm: new Int8Array(buf, L[1][0], L[1][1]),
      uv: new Uint16Array(buf, L[2][0], L[2][1]),
      si: new Uint8Array(buf, L[3][0], L[3][1]),
      sw: new Uint8Array(buf, L[4][0], L[4][1]),
      idx: D.meta.index32 ? new Uint32Array(buf.slice(L[5][0], L[5][0] + L[5][1] * 4)) : new Uint16Array(buf, L[5][0], L[5][1])
    };
  }

  // rotation whose frame built from (a, b) in bone space lands on (wa, wb) in rig space
  function frame(a, b) {
    const x = a.clone().normalize(), z = new T.Vector3().crossVectors(x, b).normalize(), y = new T.Vector3().crossVectors(z, x);
    return new T.Matrix4().makeBasis(x, y, z);
  }
  function frameQ(a, b, wa, wb) {
    return new T.Quaternion().setFromRotationMatrix(frame(wa, wb).multiply(frame(a, b).transpose()));
  }
  // turn bone rotation q (swing only) so its offset t points along `to`
  function swing(q, t, to) {
    const d = t.clone().applyQuaternion(q).normalize();
    return new T.Quaternion().setFromUnitVectors(d, to.clone().normalize()).multiply(q);
  }
  const mirror = v => new T.Vector3(-v.x, v.y, v.z);
  const rad = d => d * Math.PI / 180;
  /* rest fan of the fingers (degrees, + towards the thumb) */
  const FAN = { index: 6, middle: 0, ring: -5, pinky: -11 };

  /* ---- Sophia's skeleton, and her rest pose matching the rig's zero pose:
     standing upright, facing +Z, arms hanging with palms in, legs straight,
     feet flat and forward, fingers straight. The scan's own pose (legs
     crossed, right hand on the hip) is only the bind pose of the mesh. */
  function rest(D, SCALE) {
    const bones = D.meta.bones, n = bones.length;
    const name = [], par = [], ix = {}, P = [], Q = [], inv = [];
    bones.forEach((b, i) => {
      const m = new T.Matrix4().fromArray(b.bind), p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
      m.decompose(p, q, sc);
      name[i] = b.name; par[i] = b.parent; ix[b.name] = i;
      if (b.parent >= i) throw new Error('sophia: bones out of order');
      P[i] = p.applyQuaternion(Q_AXES).multiplyScalar(SCALE);
      Q[i] = Q_AXES.clone().multiply(q);
      inv[i] = m.invert();
    });
    // bind-local offsets (rig metres, parent frame) and rotations
    const t = [], lq = [];
    for (let i = 0; i < n; i++) {
      const p = par[i];
      if (p < 0) { t[i] = new T.Vector3(); lq[i] = new T.Quaternion(); continue; }
      const qi = Q[p].clone().invert();
      t[i] = P[i].clone().sub(P[p]).applyQuaternion(qi);
      lq[i] = qi.multiply(Q[i]);
    }
    const B = k => ix[k];
    const fix = {};   // bone → rest rotation fixed up front (independent of parents)

    // trunk and head: upright, facing forward, no twist (bone x runs up the spine, z to her right)
    ['hip', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head'].forEach(k => {
      fix[B(k)] = frameQ(new T.Vector3(1, 0, 0), new T.Vector3(0, 0, 1), UP, RIGHT);
    });

    // arms: hand hangs, fingers down, palm in, thumb forward; forearm and upper arm
    // follow the hand's turn so the wrist and elbow keep the scan's natural twist
    ['l', 'r'].forEach(sd => {
      const h = B('hand_' + sd), la = B('lowerarm_' + sd), ua = B('upperarm_' + sd);
      const across = t[B('index_01_' + sd)].clone().sub(t[B('pinky_01_' + sd)]);
      fix[h] = frameQ(t[B('middle_01_' + sd)], across, DOWN, FWD);
      const dh = fix[h].clone().multiply(Q[h].clone().invert());
      fix[la] = swing(dh.multiply(Q[la]), t[h], DOWN);
      const dl = fix[la].clone().multiply(Q[la].clone().invert());
      fix[ua] = swing(dl.multiply(Q[ua]), t[la], DOWN);
    });

    // legs: foot flat and forward (the pitch of the right foot, which stands flat
    // in the scan), shin and thigh straight down following the foot's turn
    const ftR = B('foot_r'), aR = t[B('ball_r')].clone().applyQuaternion(Q[ftR]).normalize();
    const pitch = Math.asin(aR.y);
    const footDir = new T.Vector3(0, Math.sin(pitch), Math.cos(pitch));
    ['l', 'r'].forEach(sd => {
      const ft = B('foot_' + sd), ball = B('ball_' + sd), ll = B('lowerleg_' + sd), ul = B('upperleg_' + sd);
      const a = t[ball].clone();                                               // ankle → ball, foot frame
      const e = t[B('foot_end_' + sd)].clone().applyQuaternion(lq[ball]);      // ball → toe tip, foot frame
      const nrm = a.clone().cross(e).normalize();                              // across the foot
      const aw = a.clone().applyQuaternion(Q[ft]), side = new T.Vector3(aw.z, 0, -aw.x); // the foot's own left
      if (nrm.clone().applyQuaternion(Q[ft]).dot(side) < 0) nrm.negate();
      fix[ft] = frameQ(a, nrm, footDir, LEFT);
      const df = fix[ft].clone().multiply(Q[ft].clone().invert());
      fix[ll] = swing(df.multiply(Q[ll]), t[ft], DOWN);
      const dl = fix[ll].clone().multiply(Q[ll].clone().invert());
      fix[ul] = swing(dl.multiply(Q[ul]), t[ll], DOWN);
    });

    // walk the skeleton: fixed bones take their rest rotation, the rest keep their
    // bind rotation relative to the parent, with a few symmetry / straightening rules
    const Aq = [];
    const toeR = new T.Vector3();
    for (let i = 0; i < n; i++) {
      const p = par[i], k = name[i];
      let q = fix[i] ? fix[i].clone() : (p < 0 ? Q[i].clone() : Aq[p].clone().multiply(lq[i]));
      let m;
      if ((m = /^(index|middle|ring|pinky)_0([123])_([lr])$/.exec(k))) {
        // straight fingers in the plane of the palm, in one natural fan for every
        // character (the scans' own knuckle lines splay and tilt differently):
        // the middle finger straight down, index towards the thumb, ring and pinky away
        const fan = rad(FAN[m[1]]);
        const dir = DOWN.clone().multiplyScalar(Math.cos(fan)).addScaledVector(FWD, Math.sin(fan));
        const child = B(m[1] + (m[2] === '3' ? '_end_' : '_0' + (+m[2] + 1) + '_') + m[3]);
        q = swing(q, t[child], dir);
      } else if ((m = /^thumb_0([123])_([lr])$/.exec(k))) {
        // open thumb, forward-down beside the index, as the rig's open hand (applyPose, curl 0)
        const px = m[2] === 'l' ? -1 : 1;
        const dir = m[1] === '3' ? new T.Vector3(px * 0.2, -0.8, 0.56) : new T.Vector3(px * 0.28, -0.6, 0.74);
        q = swing(q, t[B(m[1] === '3' ? 'thumb_end_' + m[2] : 'thumb_0' + (+m[1] + 1) + '_' + m[2])], dir);
      } else if (k === 'shoulder_r') {
        // right collarbone mirrors the left one (the scan's right hand rests on the hip)
        const dl = t[B('upperarm_l')].clone().applyQuaternion(Aq[B('shoulder_l')]);
        q = swing(q, t[B('upperarm_r')], mirror(dl));
      } else if (k === 'ball_r') {
        toeR.copy(t[B('foot_end_r')]).applyQuaternion(q);
      }
      Aq[i] = q;
    }
    // toes: the scan's left foot is on tiptoe, so its toes copy the right foot's
    const bl = B('ball_l');
    Aq[bl] = swing(Aq[bl], t[B('foot_end_l')], mirror(toeR));
    for (let i = bl + 1; i < n; i++) if (par[i] === bl) Aq[i] = Aq[bl].clone().multiply(lq[i]);

    // rest positions (hip at the origin)
    const Ap = [];
    for (let i = 0; i < n; i++) Ap[i] = par[i] < 0 ? P[i].clone() : t[i].clone().applyQuaternion(Aq[par[i]]).add(Ap[par[i]]);
    const o = Ap[B('hip')].clone();
    Ap.forEach(v => v.sub(o));
    // rest rotations relative to the parent (used by bones the rig does not drive)
    const rq = Aq.map((q, i) => par[i] < 0 ? q.clone() : Aq[par[i]].clone().invert().multiply(q));
    return { n, name, par, ix, t, inv, Aq, Ap, rq };
  }

  /* ---- which rig joint drives which of Sophia's bones ---- */
  const FING = ['index', 'middle', 'ring', 'pinky'];
  function links(S) {
    const L = [], B = k => S.ix[k];
    const add = (bone, j, x) => L.push(Object.assign({ i: B(bone), j }, x || {}));
    add('hip', 'hips'); add('spine_01', 'spine'); add('neck', 'neck'); add('head', 'head');
    ['L', 'R'].forEach(s => {
      const sd = s.toLowerCase(), sg = s === 'L' ? 1 : -1;
      add('upperarm_' + sd, s + '_upperArm');
      // pronation runs along the forearm: elbow 30 %, twist bone 75 %, hand all of it
      add('lowerarm_' + sd, s + '_forearm', { twist: 0.7, sg, side: s });
      add('lowerarm_twist_' + sd, s + '_forearm', { twist: 0.25, sg, side: s });
      add('hand_' + sd, s + '_hand');
      FING.forEach((f, k) => ['f1', 'f2', 'f3'].forEach((g, n) => add(f + '_0' + (n + 1) + '_' + sd, null, { finger: [s, k, g] })));
      add('thumb_01_' + sd, s + '_hand', { mix: { thumb: s, part: 't1', w: 0.4 } });
      add('thumb_02_' + sd, null, { thumb: [s, 't1'] });
      add('thumb_03_' + sd, null, { thumb: [s, 't2'] });
      add('upperleg_' + sd, s + '_thigh'); add('lowerleg_' + sd, s + '_shin'); add('foot_' + sd, s + '_foot');
    });
    return L;
  }
  function jointOf(J, l) {
    if (l.finger) return J.fingers[l.finger[0]][l.finger[1]][l.finger[2]];
    if (l.thumb) return J.thumb[l.thumb[0]][l.thumb[1]];
    return J[l.j];
  }

  /* ---- materials: the scan's own maps ---- */
  function material(D, done) {
    const mat = new T.MeshStandardMaterial({ skinning: true, roughness: 1, metalness: 0, envMapIntensity: 0.9 });
    const iso = new T.MeshStandardMaterial({ skinning: true, roughness: 1, metalness: 0, envMapIntensity: 0.9, side: T.DoubleSide });
    const loader = new T.TextureLoader(), keys = ['map', 'normalMap', 'roughnessMap'];
    let left = keys.length;
    const one = () => { if (--left === 0) { mat.needsUpdate = iso.needsUpdate = true; done(); } };
    keys.forEach(k => {
      if (!D.tex || !D.tex[k]) { one(); return; }
      loader.load(D.tex[k], tx => {
        if (k === 'map') tx.encoding = T.sRGBEncoding;
        tx.anisotropy = 4;
        mat[k] = iso[k] = tx; one();
      }, undefined, one);
    });
    return { mat, iso };
  }

  /* D: a baked model (sophia-model.js / manuel-model.js), name: the mesh name */
  function build(D, name) {
    if (!D) throw new Error('the character model is not loaded');
    const headEnd = D.meta.bones.filter(b => b.name === 'head_end')[0];
    const SCALE = 0.011 * (headEnd ? REF_HEIGHT / headEnd.bind[14] : 1);
    const S = rest(D, SCALE), A = S.Ap;
    const B = k => S.ix[k];
    const rel = (k, pk) => A[B(k)].clone().sub(A[B(pk)]);
    const grp = (parent, pos, order) => { const g = new T.Group(); g.position.copy(pos); if (order) g.rotation.order = order; parent.add(g); return g; };

    /* ---- the rig: joints on Sophia's joints, names and axes as before ---- */
    const J = {};
    const avRoot = new T.Group(); avRoot.name = 'avatar';
    const hips = grp(avRoot, new T.Vector3()); J.hips = hips;
    const spine = grp(hips, A[B('spine_01')], 'YXZ'); J.spine = spine;
    const neck = grp(spine, rel('neck', 'spine_01'), 'YXZ'); J.neck = neck;
    J.head = grp(neck, rel('head', 'neck'));
    J.fingers = { L: [], R: [] }; J.thumb = {};
    ['L', 'R'].forEach(s => {
      const sd = s.toLowerCase(), sg = s === 'L' ? 1 : -1, px = -sg;
      const ua = grp(spine, rel('upperarm_' + sd, 'spine_01'), 'ZXY'); J[s + '_upperArm'] = ua;
      const fa = grp(ua, rel('lowerarm_' + sd, 'upperarm_' + sd), 'XYZ'); J[s + '_forearm'] = fa;
      const hand = grp(fa, rel('hand_' + sd, 'lowerarm_' + sd)); J[s + '_hand'] = hand;
      FING.forEach((f, i) => {
        const f1 = grp(hand, rel(f + '_01_' + sd, 'hand_' + sd), 'XYZ');
        const f2 = grp(f1, rel(f + '_02_' + sd, f + '_01_' + sd));
        const f3 = grp(f2, rel(f + '_03_' + sd, f + '_02_' + sd));
        J.fingers[s].push({ f1, f2, f3, spreadK: [-1.3, -0.4, 0.4, 1.3][i] });
      });
      const t1 = new T.Group(), t2 = new T.Group(); hand.add(t1); hand.add(t2);   // placed by applyPose
      J.thumb[s] = { t1, t2, px };
      const th = grp(hips, A[B('upperleg_' + sd)], 'ZXY'); J[s + '_thigh'] = th;
      const shin = grp(th, rel('lowerleg_' + sd, 'upperleg_' + sd)); J[s + '_shin'] = shin;
      J[s + '_foot'] = grp(shin, rel('foot_' + sd, 'lowerleg_' + sd));
    });

    /* ---- the skinned mesh ---- */
    const d = decode(D);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(d.pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(d.nrm, 3, true));
    geo.setAttribute('uv', new T.BufferAttribute(d.uv, 2, true));
    geo.setAttribute('skinIndex', new T.BufferAttribute(d.si, 4));
    geo.setAttribute('skinWeight', new T.BufferAttribute(d.sw, 4, true));
    geo.setIndex(new T.BufferAttribute(d.idx, 1));
    const bones = [];
    for (let i = 0; i < S.n; i++) {
      const b = new T.Bone(); b.name = S.name[i]; b.matrixAutoUpdate = false;
      b.matrix.compose(A[i], S.Aq[i], new T.Vector3(SCALE, SCALE, SCALE));
      avRoot.add(b); bones.push(b);
    }
    const skeleton = new T.Skeleton(bones, S.inv);
    let ready;
    const readyP = new Promise(ok => { ready = ok; });
    const mats = material(D, ready);
    const mesh = new T.SkinnedMesh(geo, mats.mat);
    mesh.name = name || 'avatar'; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    avRoot.add(mesh);
    mesh.bind(skeleton, new T.Matrix4());

    // strongest bone of each vertex, and her rest-pose vertices (for the feet)
    const nv = d.pos.length / 3, dom = new Uint8Array(nv);
    for (let v = 0; v < nv; v++) { let best = 0; for (let k = 1; k < 4; k++) if (d.sw[v * 4 + k] > d.sw[v * 4 + best]) best = k; dom[v] = d.si[v * 4 + best]; }
    const G = bones.map((b, i) => new T.Matrix4().multiplyMatrices(b.matrix, S.inv[i]));
    const _v = new T.Vector3(), _w = new T.Vector3();
    const restVert = (v, out) => {
      out.set(0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const w = d.sw[v * 4 + k] / 255; if (!w) continue;
        _w.set(d.pos[v * 3], d.pos[v * 3 + 1], d.pos[v * 3 + 2]).applyMatrix4(G[d.si[v * 4 + k]]);
        out.addScaledVector(_w, w);
      }
      return out;
    };

    /* ---- foot contact points (ankle frame) from her shoes ---- */
    ['L', 'R'].forEach(s => {
      const sd = s.toLowerCase(), set = new Set([B('foot_' + sd), B('ball_' + sd)]), ank = A[B('foot_' + sd)];
      let sole = Infinity, heel = Infinity, toe = -Infinity;
      for (let v = 0; v < nv; v++) {
        if (!set.has(dom[v])) continue;
        restVert(v, _v).sub(ank);
        sole = Math.min(sole, _v.y); heel = Math.min(heel, _v.z); toe = Math.max(toe, _v.z);
      }
      const ball = A[B('ball_' + sd)].z - ank.z;
      J[s + '_footPts'] = {
        heel: new T.Vector3(0, sole, heel), toe: new T.Vector3(0, sole, toe), ball: new T.Vector3(0, sole, ball),
        mid: new T.Vector3(0, sole, (heel + ball) / 2), tip: new T.Vector3(0, sole + 0.006, toe - 0.012)
      };
    });
    /* her shoulder → fingertip reach against the old character's (wall distance) */
    J.reachK = A[B('middle_end_r')].distanceTo(A[B('upperarm_r')]) / OLD_REACH;

    /* ---- isolated close-ups: the same skin, only the triangles of one limb ---- */
    const below = name => {
      const set = new Set([B(name)]);
      for (let i = 0; i < S.n; i++) if (set.has(S.par[i])) set.add(i);
      return set;
    };
    const ISO_BONE = { R_forearm: 'lowerarm_r', L_forearm: 'lowerarm_l' };
    const isoMeshes = {};
    function isoMesh(j) {
      if (isoMeshes[j]) return isoMeshes[j];
      const set = below(ISO_BONE[j]), keep = [];
      for (let f = 0; f < d.idx.length; f += 3) {
        const a = d.idx[f], b = d.idx[f + 1], c = d.idx[f + 2];
        if (set.has(dom[a]) && set.has(dom[b]) && set.has(dom[c])) keep.push(a, b, c);
      }
      const g = geo.clone(); g.setIndex(keep);
      const m = new T.SkinnedMesh(g, mats.iso);
      m.frustumCulled = false; m.castShadow = m.receiveShadow = true; m.visible = false;
      avRoot.add(m); m.bind(skeleton, new T.Matrix4());
      return (isoMeshes[j] = m);
    }
    function setIso(j) {
      mesh.visible = !j;
      Object.keys(isoMeshes).forEach(k => { isoMeshes[k].visible = false; });
      if (j && ISO_BONE[j]) isoMesh(j).visible = true;
      else mesh.visible = true;
    }

    const av = { root: avRoot, J, mesh, skeleton, bones, S, setIso, ready: () => readyP, scaleV: new T.Vector3(SCALE, SCALE, SCALE) };
    av.links = links(S).map(l => Object.assign(l, { joint: jointOf(J, l), q: new T.Quaternion(), restInv: new T.Quaternion() }));

    // the rig's zero pose is Sophia's rest pose: remember each joint's rest rotation
    const zero = { neckFlex: 0, neckRot: 0, neckLat: 0, trunkFlex: 0, trunkRot: 0, trunkLat: 0 };
    root.AVATAR.applyPose(J, zero);
    avRoot.updateMatrixWorld(true);
    av.links.forEach(l => { relQ(av, l.joint, l.restInv); l.restInv.invert(); });
    return av;
  }

  const _ri = new T.Matrix4(), _m = new T.Matrix4(), _pp = new T.Vector3(), _ss = new T.Vector3();
  function relQ(av, joint, out) {
    _ri.copy(av.root.matrixWorld).invert();
    _m.multiplyMatrices(_ri, joint.matrixWorld).decompose(_pp, out, _ss);
    return out;
  }

  /* ---- every frame: Sophia's bones follow the posed rig ---- */
  const _q = new T.Quaternion(), _d = new T.Quaternion(), _d2 = new T.Quaternion(), _tw = new T.Quaternion();
  const _Y = new T.Vector3(0, 1, 0);
  function sync(av, pose) {
    const { S, bones, links, J } = av;
    av.root.updateMatrixWorld(true);
    const Wq = av._wq || (av._wq = S.Aq.map(() => new T.Quaternion()));
    const Wp = av._wp || (av._wp = S.Ap.map(() => new T.Vector3()));
    const drive = av._drive || (av._drive = (() => { const m = {}; links.forEach(l => { m[l.i] = l; }); return m; })());
    const byJoint = new Map();
    links.forEach(l => {
      if (!byJoint.has(l.joint)) byJoint.set(l.joint, relQ(av, l.joint, new T.Quaternion()));
      l.q.copy(byJoint.get(l.joint));
    });
    const hipPos = J.hips.position;
    for (let i = 0; i < S.n; i++) {
      const p = S.par[i], l = drive[i];
      if (l) {
        _d.copy(l.q);
        if (l.twist) _d.multiply(_tw.setFromAxisAngle(_Y, l.sg * (pose[l.side + '_pron'] || 0) * Math.PI / 180 * l.twist));
        _d.multiply(l.restInv);
        if (l.mix) {
          const o = links.find(x => x.thumb && x.thumb[0] === l.mix.thumb && x.thumb[1] === l.mix.part);
          _d2.copy(o.q).multiply(o.restInv);
          _d.slerp(_d2, l.mix.w);
        }
        Wq[i].copy(_d).multiply(S.Aq[i]);
      } else if (p < 0) Wq[i].copy(S.Aq[i]);
      else Wq[i].copy(Wq[p]).multiply(S.rq[i]);
      if (p < 0) Wp[i].copy(S.Ap[i]);
      else if (S.name[i] === 'hip') Wp[i].copy(hipPos);
      else Wp[i].copy(S.t[i]).applyQuaternion(Wq[p]).add(Wp[p]);
      bones[i].matrix.compose(Wp[i], Wq[i], av.scaleV);
    }
    av.root.updateMatrixWorld(true);
  }

  root.SOPHIA_AVATAR = { build, sync };
})(window);


/* ===== Rig pose, grounding (from MotionRx) ===== */
(function (root) {
  const T = root.THREE;
  const rad = d => d * Math.PI / 180;

  function build(D, name) { return root.SOPHIA_AVATAR.build(D, name); }

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
   *          view   'front' | 'side'  — the view the marks are drawn for
   *          anchor rig joint that must sit on the marks' pivot,
   *                 `at` is that pivot in the figure's 200x200 space,
   *                 `scale` is figure units per metre.
   *
   *  Rig conventions handled here: the rig faces +Z; its L side is +X.
   *  Front view looks from +Z so the figure mirrors the patient (screen
   *  right = rig L), side view looks from -X so the figure faces screen right,
   *  as the marks expect. Screen directions in ReMotion therefore map to:
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
           same one its knee marks use — so the knee bends by
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
        anchor = { joint: 'R_foot', local: 'ball', at: [110, 185], scale: 88 };   // ball of the foot, on the sole
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

  /* ======================================================================
   *  CHARACTERS  — female (Sophia) and male (Manuel). Both scans share one
   *  skeleton, so the same rig, mapping and retargeting drive either one.
   *  Each is built once, the first time it is shown; only one is in the
   *  scene at a time. wristDrop: table top below the wrist joint.
   * ==================================================================== */
  const CHARS = {
    female: { model: 'SOPHIA_MODEL', name: 'sophia', wristDrop: 0.022 },
    male:   { model: 'MANUEL_MODEL', name: 'manuel', wristDrop: 0.026 }
  };
  let current = 'female';
  const built = {};
  function avatarFor(c) {
    if (!built[c]) {
      const C = CHARS[c];
      if (!root[C.model]) throw new Error(C.model + ' is not loaded');
      built[c] = root.AVATAR.build(root[C.model], C.name);
      built[c].root.position.set(0, 1, 0);
    }
    return built[c];
  }
  /* show character c ('female' | 'male'); resolves when its textures are ready */
  function setCharacter(c) {
    if (!CHARS[c]) c = 'female';
    current = c;
    if (!R) return Promise.resolve();
    const av = avatarFor(c);
    if (R.av !== av) {
      if (R.av) { R.av.setIso(null); R.scene.remove(R.av.root); }
      R.scene.add(av.root);
      R.av = av; R.isoNow = null;
    }
    return av.ready();
  }

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

    const av = avatarFor(current);
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

    const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.05, 30);
    R = { renderer, canvas, scene, camera, av, key, rim, fill, KEY, RIM, FILL, floor, tableG, props, w: 0, h: 0, isoNow: null };
    return R;
  }

  /* resolves once Sophia's textures are decoded (the first paint waits for it) */
  function ready() { return init().av.ready(); }

  /* a point on the sole, in the foot joint's frame (Sophia's shoes) */
  function footPt(foot, k, out) { return out.copy(R.av.J[foot + '_footPts'][k]); }

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
    root.SOPHIA_AVATAR.sync(av, m.pose);                         // v19: Sophia follows the rig
  }

  /* v17.8 lunge: tune the back hip so the back toes rest on the floor
     (the front foot defines the floor). Rig detail only — the front knee
     angle, which is the one measured, is untouched. */
  const _t1 = new T.Vector3(), _t2 = new T.Vector3();
  function backToesOnFloor(m) {
    const { av } = R;
    const floorY = () => av.J.R_foot.localToWorld(footPt('R', 'mid', _t1)).y;
    const toeY = () => av.J.L_foot.localToWorld(footPt('L', 'tip', _t2)).y;
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
  function draw(target, exId, th, dir, box, opts) {
    const m = mapAngles(exId, th, dir);
    /* v19: opts.full = whole figure standing with the soles at opts.at (home page) */
    const full = !!(opts && opts.full);
    if (!m) return false;
    init();
    const { renderer, scene, camera, av, key, rim, fill, floor, tableG } = R;
    const W = target.width, H = target.height;
    if (!W || !H) return false;
    if (W > R.w || H > R.h) {
      R.w = Math.max(R.w, W); R.h = Math.max(R.h, H);
      renderer.setSize(R.w, R.h, false);
    }
    pose(m);

    /* isolated close-up (finger view shows the forearm and hand only) */
    const iso = full ? null : m.iso;
    if (R.isoNow !== iso) {
      av.setIso(iso);
      R.isoNow = iso;
    }

    /* anchor: the rig joint lands on ReMotion's mark pivot */
    const loc = m.anchor.local;
    let A, s, ax, ay;
    if (full) {
      A = av.J.R_foot.localToWorld(footPt('R', 'mid', _v)).clone()
        .add(av.J.L_foot.localToWorld(footPt('L', 'mid', _v))).multiplyScalar(0.5);
      s = opts.scale; ax = opts.at[0]; ay = opts.at[1];
    } else {
      A = (loc
        ? av.J[m.anchor.joint].localToWorld(typeof loc === 'string' ? footPt(m.anchor.joint.charAt(0), loc, _v) : _v.set(loc[0], loc[1], loc[2]))
        : av.J[m.anchor.joint].getWorldPosition(_v.set(0, 0, 0))).clone();
      s = m.anchor.scale; ax = m.anchor.at[0]; ay = m.anchor.at[1];
    }
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

    /* floor under her shoes (squat) */
    floor.visible = !!(m.floor || full);
    if (floor.visible) {
      const fy = Math.min(av.J.R_foot.localToWorld(footPt('R', 'mid', _c)).y, av.J.L_foot.localToWorld(footPt('L', 'mid', _c)).y,
                          av.J.R_foot.localToWorld(footPt('R', 'tip', _c)).y, av.J.L_foot.localToWorld(footPt('L', 'tip', _c)).y);
      floor.position.set(A.x, fy, A.z);
    }
    placeProps(m);
    /* table under the forearm (wrist): front edge at the wrist */
    tableG.visible = !!m.table;
    if (m.table) {
      const wr = av.J.R_hand.getWorldPosition(_c.set(0, 0, 0));
      tableG.position.set(wr.x, wr.y - CHARS[current].wristDrop, wr.z + 0.012);   // each character's wrist thickness
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
    const sole = () => Math.min(av.J.R_foot.localToWorld(footPt('R', 'mid', _p)).y, av.J.L_foot.localToWorld(footPt('L', 'mid', _p2)).y);
    if (P.stick) {
      const a = W('L_hand', [0, -0.07, 0.01]), b = W('R_hand', [0, -0.07, 0.01]);
      const mid = a.clone().add(b).multiplyScalar(0.5), d = a.clone().sub(b), L = d.length() + 0.22;
      props.stick.visible = true; props.stick.position.copy(mid); props.stick.scale.set(1, L, 1);
      props.stick.quaternion.setFromUnitVectors(_yAxis, d.normalize());
    }
    if (P.wall) {
      const s = W('R_upperArm');
      props.wall.visible = true; props.wall.scale.set(1.6, 3, 0.04);
      props.wall.position.set(s.x, s.y, s.z + P.wall * av.J.reachK + 0.02);   // v19: at Sophia's reach
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
    init, ready, draw, supported, mapAngles, setCharacter,
    character: () => current, characters: () => Object.keys(CHARS), modelGlobal: c => (CHARS[c] || CHARS.female).model,
    has: id => !!mapAngles(id, 0, null)
  };
})(window);
