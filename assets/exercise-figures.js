/**
 * ============================================================================
 *  EXERCISE FIGURES  (v16 · Sophia v19)
 * ============================================================================
 *  One animated figure per exercise. The character is Sophia, drawn in 3D
 *  by avatar-3d.js (after sophia-model.js), both loaded on demand. This
 *  file draws the goniometer marks over her in SVG: the start line, the
 *  angle reached, the target and, for the coach, the patient's own live
 *  angle, plus the hold ring. It also owns the exercise table, the demo
 *  timeline and the exercise geometry the 3D avatar shares.
 *
 *  Only the part of the body that matters is framed:
 *      neck exercises   head, neck and chest (front or side)
 *      shoulder / elbow head to hips
 *      squat            the whole body, from the side
 *      wrist            forearm on a table edge, hand bending
 *      fingers          one hand, palm to the camera
 *
 *  Used by the patient's Demo / Follow guide, the launcher preview and the
 *  cue guide drop-down; its geometry is also used by the home-page arch.
 *  v19: the old 2D character is removed. Until Sophia is ready, or where
 *  WebGL is missing, only the marks are shown.
 *
 *  ── ANGLES ──────────────────────────────────────────────────────────────
 *  Inside this file a direction is an angle in degrees where 0 points DOWN
 *  the screen and +90 points RIGHT. The figures face the patient as a
 *  mirror would: the patient's left is on the screen's left, exactly like
 *  the mirrored camera picture above them.
 * ========================================================================== */

(function (global) {
    'use strict';

    /* Colours for the marks drawn over the figure. */
    const COL = {
        line: '#1B2A47',
        skin: '#F5BE98', hair: '#6E4729',
        mark: '#3D6894', target: '#E39B2D', ok: '#2E9C6A', live: '#1E9BD7', bad: '#D2453B'
    };

    /* ----------------------------------------------------------------------
     *  Exercise table
     *    dirs   the directions the demo alternates between
     *    peak   how far the demo goes (a comfortable, clearly visible range)
     *    unit   matches exercise-detectors.js
     * -------------------------------------------------------------------- */
    const EX = {
        neck_flexion:         { dirs: ['flexion', 'extension'], peak: 30,  unit: '°', name: 'Neck Flexion', label: 'Neck Flexion\n& Extension', short: 'Chin down, then up' },
        neck_rotation:        { dirs: ['left', 'right'],        peak: 60,  unit: '°', name: 'Neck Rotation', label: 'Neck\nRotation',             short: 'Turn left and right' },
        neck_lateral_flexion: { dirs: ['left', 'right'],        peak: 30,  unit: '°', name: 'Side Bend', label: 'Neck Side\nBend',            short: 'Ear to shoulder' },
        shoulder_abduction:   { dirs: ['both'],                 peak: 90,  unit: '°', name: 'Arms Out', label: 'Shoulder\nAbduction',        short: 'Arms out to the side' },
        shoulder_flexion:     { dirs: ['both'],                 peak: 90,  unit: '°', name: 'Arms Forward', label: 'Shoulder\nFlexion',          short: 'Arms straight forward' },
        elbow_flexion:        { dirs: ['both'],                 peak: 130, unit: '°', name: 'Elbow Bend', label: 'Elbow Flexion\n& Extension', short: 'Bend and straighten' },
        wrist_flexion:        { dirs: ['flexion', 'extension'], peak: 45,  unit: '°', name: 'Wrist Bend', label: 'Wrist Flexion\n& Extension', short: 'Bend to the palm, then back' },
        finger_flexion:       { dirs: ['both'],                 peak: 90,  unit: '%', name: 'Fist & Open', label: 'Finger Squeeze\n& Open',     short: 'Fist, then open' },
        squat:                { dirs: ['both'],                 peak: 90,  unit: '°', name: 'Full Squat', label: 'Full Squat',            short: 'Sit back, stand up' },
        /* v17.8 */
        shoulder_external_rotation: { dirs: ['both'],           peak: 60,  unit: '°', name: 'External Rotation', label: 'Shoulder External\nRotation', short: 'Forearm turns outward' },
        pendulum:             { dirs: ['forward', 'back'],      peak: 18,  unit: '°', name: 'Pendulum', label: 'Pendulum\n(Codman)',          short: 'Let the arm swing' },
        assisted_shoulder_flexion: { dirs: ['both'],            peak: 140, unit: '°', name: 'Assisted Flexion', label: 'Assisted Shoulder\nFlexion', short: 'Help the arm overhead' },
        external_rotation_stick: { dirs: ['both'],              peak: 60,  unit: '°', name: 'Rotation with Stick', label: 'External Rotation\nwith a Stick', short: 'Stick guides the forearm out' },
        finger_walk:          { dirs: ['both'],                 peak: 140, unit: '°', name: 'Finger Walk', label: 'Finger Walk\n(Wall Climb)',     short: 'Walk the fingers up' },
        table_slide:          { dirs: ['both'],                 peak: 45,  unit: '°', name: 'Table Slide', label: 'Table Slide\n(Forward)',       short: 'Slide the hand forward' },
        cross_body_stretch:   { dirs: ['both'],                 peak: 45,  unit: '°', name: 'Cross-Body Stretch', label: 'Cross-Body\nShoulder Stretch', short: 'Arm across the chest' },
        scapular_squeeze:     { dirs: ['both'],                 peak: 80,  unit: '%', name: 'Blade Squeeze', label: 'Shoulder Blade\nSqueeze',    short: 'Squeeze the blades together' },
        trunk_rotation:       { dirs: ['left', 'right'],        peak: 40,  unit: '°', name: 'Trunk Rotation', label: 'Trunk\nRotation',          short: 'Turn left and right' },
        /* v35: side view; extension is a smaller movement (dirScale) */
        lumbar_flexion:       { dirs: ['flexion', 'extension'], peak: 45,  unit: '°', name: 'Lumbar Flexion', label: 'Lumbar Flexion\n& Extension', short: 'Bend forward, then lean back',
                                dirScale: { extension: 0.45 } },
        hip_abduction:        { dirs: ['both'],                 peak: 35,  unit: '°', name: 'Hip Abduction', label: 'Standing Hip\nAbduction',     short: 'Leg out to the side' },
        standing_march:       { dirs: ['right', 'left'],        peak: 85,  unit: '°', name: 'Standing March', label: 'Standing\nMarch',          short: 'Knee up, then the other' },
        standing_knee_flexion:{ dirs: ['right', 'left'],        peak: 90,  unit: '°', name: 'Knee Flexion', label: 'Standing Knee\nFlexion',      short: 'Heel toward buttock' },
        forward_lunge:        { dirs: ['both'],                 peak: 80,  unit: '°', name: 'Forward Lunge', label: 'Forward\nLunge',            short: 'Step forward, bend both knees' },
        heel_raise:           { dirs: ['both'],                 peak: 30,  unit: '°', name: 'Heel Raise', label: 'Heel\nRaise',                  short: 'Rise onto the toes' },
        finger_spread:        { dirs: ['both'],                 peak: 35,  unit: '°', name: 'Finger Spread', label: 'Finger Open\n& Spread',      short: 'Spread the fingers' }
    };

    const ORDER = ['neck_flexion', 'neck_rotation', 'neck_lateral_flexion', 'shoulder_abduction',
                   'shoulder_flexion', 'elbow_flexion', 'wrist_flexion', 'finger_flexion', 'squat',
                   /* v17.8 */
                   'shoulder_external_rotation', 'pendulum', 'assisted_shoulder_flexion', 'external_rotation_stick',
                   'finger_walk', 'table_slide', 'cross_body_stretch', 'scapular_squeeze', 'trunk_rotation', 'lumbar_flexion',
                   'hip_abduction', 'standing_march', 'standing_knee_flexion', 'forward_lunge', 'heel_raise',
                   'finger_spread'];

    /* ======================================================================
     *  SMALL SVG HELPERS
     * ==================================================================== */

    function f(v) { return Math.round(v * 10) / 10; }
    function rad(a) { return a * Math.PI / 180; }
    function at(x, y, len, a) { return { x: x + Math.sin(rad(a)) * len, y: y + Math.cos(rad(a)) * len }; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function seg(p1, p2, w, col, extra) {
        return '<line x1="' + f(p1.x) + '" y1="' + f(p1.y) + '" x2="' + f(p2.x) + '" y2="' + f(p2.y) +
               '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (extra || '') + '/>';
    }
    function circle(x, y, r, fill, extra) {
        return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' +
               (extra === undefined ? ' stroke="' + COL.line + '" stroke-width="2.2"' : extra) + '/>';
    }
    function path(d, fill, extra) {
        return '<path d="' + d + '" fill="' + fill + '"' + (extra === undefined ? '' : extra) + '/>';
    }
    function text(x, y, s, cls) {
        return '<text x="' + f(x) + '" y="' + f(y) + '" class="' + (cls || 'ef-num') + '" text-anchor="middle" dominant-baseline="middle">' + s + '</text>';
    }

    function arcD(cx, cy, r, a1, a2) {
        const p1 = at(cx, cy, r, a1), p2 = at(cx, cy, r, a2);
        const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
        const sweep = a2 > a1 ? 0 : 1;
        return 'M' + f(p1.x) + ' ' + f(p1.y) + ' A' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + f(p2.x) + ' ' + f(p2.y);
    }
    function wedgeD(cx, cy, r, a1, a2) {
        return 'M' + f(cx) + ' ' + f(cy) + ' L' + arcD(cx, cy, r, a1, a2).slice(1) + ' Z';
    }
    /** Small arrowhead at angle `a` on a circle, pointing the way the angle grows (dir +1) or shrinks (-1). */
    function arrowHead(cx, cy, r, a, dir, col) {
        const p = at(cx, cy, r, a);
        const tx = Math.cos(rad(a)) * dir, ty = -Math.sin(rad(a)) * dir;
        const nx = -ty, ny = tx;
        const tip = { x: p.x + tx * 7, y: p.y + ty * 7 };
        return '<path d="M' + f(tip.x) + ' ' + f(tip.y) + ' L' + f(p.x + nx * 5) + ' ' + f(p.y + ny * 5) +
               ' L' + f(p.x - nx * 5) + ' ' + f(p.y - ny * 5) + ' Z" fill="' + col + '"/>';
    }

    /* ======================================================================
     *  MARKS TABLE — one per exercise  (v19)
     *  The figure itself is Sophia (3D, avatar-3d.js); this file only draws
     *  the goniometer marks over her. Each entry returns the mark for an
     *  angle `th` in the exercise's own units and a direction, placed on the
     *  joint in the 200×200 figure space the 3D avatar is anchored to.
     *  mark.kind:
     *    'arc'    joint at (x, y), reference angle a0, angle grows by sign·th
     *    'dial'   top view of the head (rotation)
     *    'gauge'  ring meter (finger closure, blade squeeze)
     *    'hz'     turn in the horizontal plane, drawn as a flat ellipse
     * ==================================================================== */

    /* ----------------------------------------------------------------------
     *  SQUAT GEOMETRY  (v17.6)
     *  One place that decides how the body is arranged for a knee angle th,
     *  used by the knee marks and the 3D avatar alike.
     *    knee   exactly th (thigh and shin directions differ by th)
     *    shin   leans forward 0.28·th (heels stay flat on the floor)
     *    thigh  the rest of th: the hips sit back and, in a full squat,
     *           drop below the knees
     *    trunk  leans only as far as keeps the shoulders over the mid-foot,
     *           so the figure is balanced instead of tipping forward
     *    arms   reach straight forward for balance, up to shoulder height
     *  All angles in degrees from vertical, forward = +.
     * -------------------------------------------------------------------- */
    const SQ = { shin: 38, thigh: 38, trunk: 42 };          // segment lengths in figure units
    function squatGeometry(th) {
        th = Math.max(0, th || 0);
        const shin = 0.28 * th;
        const thigh = th - shin;
        const hipX = SQ.shin * Math.sin(rad(shin)) - SQ.thigh * Math.sin(rad(thigh));
        const over = Math.min(5, 0.06 * th);                 // shoulders over the mid-foot
        const trunk = clamp(Math.asin(clamp((over - hipX) / SQ.trunk, -1, 1)) * 180 / Math.PI, 0, 50);
        return { knee: th, shin: shin, thigh: thigh, trunk: trunk, head: 0.5 * trunk, arm: Math.min(90, 8 + 0.85 * th) };
    }

    const MARKS = {

        /* ---- side view: head tips forward (flexion) or back (extension) ---- */
        neck_flexion: function (th, dir) {
            return { kind: 'arc', x: 100, y: 146, r: 94, inner: 80, a0: 180, sign: dir === 'extension' ? 1 : -1 };
        },

        /* ---- front view: head turns; the dial above shows it from the top ---- */
        neck_rotation: function (th, dir) {
            return { kind: 'dial', x: 100, y: 36, r: 23, a0: 0, sign: dir === 'left' ? -1 : 1 };
        },

        /* ---- front view: ear toward shoulder ---- */
        neck_lateral_flexion: function (th, dir) {
            return { kind: 'arc', x: 100, y: 150, r: 96, inner: 82, a0: 180, sign: dir === 'left' ? 1 : -1 };
        },

        /* ---- front view, head to hips: both arms out to the side ---- */
        shoulder_abduction: function () {
            return { kind: 'arc', x: 125, y: 84, r: 36, a0: 0, sign: 1 };
        },

        /* ---- side view, head to hips: arms straight forward ---- */
        shoulder_flexion: function () {
            return { kind: 'arc', x: 100, y: 86, r: 38, a0: 0, sign: 1 };
        },

        /* ---- side view: upper arm by the side, forearm bends up ---- */
        elbow_flexion: function () {
            return { kind: 'arc', x: 100, y: 116, r: 24, a0: 0, sign: 1 };
        },

        /* ---- side view, whole body: the knee mark follows squatGeometry() ---- */
        squat: function (th) {
            const g = squatGeometry(th);
            const shinDir = 180 - g.shin;
            const thighDir = shinDir + th;               // knee angle is exactly th
            const knee = at(94, 180, SQ.shin, shinDir);  // ankle at (94, 180)
            return { kind: 'arc', x: knee.x, y: knee.y, r: 22, a0: thighDir - 180, sign: -1, refLen: 26 };
        },

        /* ---- forearm resting on a table, hand bending up / down ---- */
        /* v24: front view — forearm upright, thumb to the camera; flexion
           bends the hand to the screen's right, extension to the left */
        wrist_flexion: function (th, dir) {
            return { kind: 'arc', x: 100, y: 118, r: 50, a0: 180, sign: dir === 'extension' ? 1 : -1 };
        },

        /* ---- one hand, palm to the camera: fingers curl into a fist ---- */
        finger_flexion: function () {
            return { kind: 'gauge', x: 166, y: 44, r: 21 };
        },

        /* ---- v17.8: front view (camera slightly above): elbows at the sides,
                forearms turn outward; the flat goniometer is an ellipse ---- */
        shoulder_external_rotation: function () {
            return { kind: 'hz', x: 132, y: 110, r: 44, k: 0.5, a0: 0, sign: 1 };
        },

        /* ---- same, a stick held in both hands guides the affected arm ---- */
        external_rotation_stick: function () {
            return { kind: 'hz', x: 132, y: 110, r: 44, k: 0.5, a0: 0, sign: 1 };
        },

        /* ---- side view, leaning on a table, the hanging arm swings ---- */
        pendulum: function (th, dir) {
            return { kind: 'arc', x: 112, y: 96, r: 38, a0: 0, sign: dir === 'back' ? -1 : 1 };
        },

        /* ---- side view, lying on the back: both hands raise the arm overhead ---- */
        assisted_shoulder_flexion: function () {
            return { kind: 'arc', x: 70, y: 128, r: 36, a0: 90, sign: 1 };
        },

        /* ---- side view, facing a wall: the fingers walk up it ---- */
        finger_walk: function () {
            return { kind: 'arc', x: 100, y: 86, r: 38, a0: 0, sign: 1 };
        },

        /* ---- side view, seated at a table: trunk line → upper arm ---- */
        table_slide: function (th) {
            const L = { a: 30, f: 26, trunk: 52 };
            const g = tableSlideGeometry(th, L);
            const S = at(50, 150, L.trunk, 180 - g.lean);   // shoulder above the hip at (50, 150)
            return { kind: 'arc', x: S.x, y: S.y, r: 30, a0: -g.lean, sign: 1 };
        },

        /* ---- front view (camera slightly above): arm across the chest ---- */
        cross_body_stretch: function () {
            return { kind: 'hz', x: 129, y: 75, r: 60, k: 0.5, a0: 0, sign: -1 };
        },

        /* ---- side view: elbows draw back as the shoulder blades squeeze ---- */
        scapular_squeeze: function () {
            return { kind: 'gauge', x: 166, y: 44, r: 21 };
        },

        /* ---- front view (camera slightly above): the shoulders turn ---- */
        trunk_rotation: function (th, dir) {
            return { kind: 'hz', x: 100, y: 118, r: 72, k: 0.5, a0: 0, sign: dir === 'left' ? -1 : 1 };
        },

        /* ---- v35 side view, whole body: the trunk bends forward (flexion,
                screen right) or back (extension) about the low back / pelvis ---- */
        lumbar_flexion: function (th, dir) {
            return { kind: 'arc', x: 100, y: 112, r: 46, a0: 180, sign: dir === 'extension' ? 1 : -1, refLen: 70 };
        },

        /* ---- front view, whole body: one straight leg out to the side ---- */
        hip_abduction: function () {
            return { kind: 'arc', x: 109, y: 100, r: 40, a0: 0, sign: 1, refLen: 52 };
        },

        /* ---- side view, whole body: one knee lifts toward the waist ---- */
        standing_march: function () {
            return { kind: 'arc', x: 95, y: 100, r: 30, a0: 0, sign: 1, refLen: 40 };
        },

        /* ---- side view, whole body: heel toward the buttock ---- */
        standing_knee_flexion: function () {
            return { kind: 'arc', x: 95, y: 145, r: 24, a0: 0, sign: -1, refLen: 30 };
        },

        /* ---- side view: front knee bends in a lunge ---- */
        forward_lunge: function (th) {
            const g = lungeGeometry(th);
            const K = at(128, 180, SQ.shin, 180 + g.shin);   // front knee above the ankle at (128, 180)
            return { kind: 'arc', x: K.x, y: K.y, r: 22, a0: g.thigh, sign: -1, refLen: 26 };
        },

        /* ---- side view, whole body: rise onto the toes (ball of the foot) ---- */
        heel_raise: function () {
            return { kind: 'arc', x: 110, y: 185, r: 22, a0: -90, sign: -1, refLen: 28 };
        },

        /* ---- one hand, palm to the camera: fingers spread apart ---- */
        finger_spread: function (th) {
            return { kind: 'arc', x: 100, y: 150, r: 88, a0: 180 + th / 2, sign: -1, refLen: 96 };
        }
    };
    /* ----------------------------------------------------------------------
     *  v17.8 GEOMETRY shared by the marks and the 3D avatar
     *  (exported as ExerciseFigures.geometry). Angles in degrees, measured
     *  from straight down, forward (= screen right in side views) positive.
     * -------------------------------------------------------------------- */

    /** Two-link arm (upper a, forearm f): elbow bend e for a shoulder→wrist
        reach r. Returns { e, d } where d = offset of the wrist line from the
        upper arm. */
    function armReach(a, f, r) {
        r = clamp(r, Math.abs(a - f) + 1e-6, a + f);
        const ce = clamp((r * r - a * a - f * f) / (2 * a * f), -1, 1);
        const e = Math.acos(ce) * 180 / Math.PI;
        const d = Math.atan2(f * Math.sin(rad(e)), a + f * Math.cos(rad(e))) * 180 / Math.PI;
        return { e: e, d: d };
    }

    /** Finger walk: the wrist line is at `th`; the elbow bends just enough
        for the fingertips to stay on a wall `wall` in front of the shoulder. */
    function fingerWalkGeometry(th, L) {
        L = L || { a: 0.29, f: 0.258, h: 0.18, wall: 0.47 };
        let lo = 0, hi = 125, e = 0;
        function tipFwd(eDeg) {
            const d = Math.atan2(L.f * Math.sin(rad(eDeg)), L.a + L.f * Math.cos(rad(eDeg))) * 180 / Math.PI;
            const u = th - d;
            return L.a * Math.sin(rad(u)) + (L.f + L.h) * Math.sin(rad(u + eDeg));
        }
        if (tipFwd(0) > L.wall) {
            for (let i = 0; i < 24; i++) { e = (lo + hi) / 2; if (tipFwd(e) > L.wall) lo = e; else hi = e; }
            e = (lo + hi) / 2;
        }
        const d = Math.atan2(L.f * Math.sin(rad(e)), L.a + L.f * Math.cos(rad(e))) * 180 / Math.PI;
        return { upper: th - d, elbow: e, onWall: e > 0.5 || Math.abs(tipFwd(0) - L.wall) < 0.01 };
    }

    /** Table slide (v18): th = upper-arm flexion relative to the trunk, from
        the start (upper arm hanging, forearm on the table). The trunk leans
        0.3·th; the elbow opens so the hand stays on the table top. */
    function tableSlideGeometry(th, L) {
        L = L || { a: 0.29, f: 0.258, trunk: 0.52 };
        const lean = 0.3 * th;
        const upper = th - lean;                                     // upper arm, from straight down
        const drop = L.trunk * Math.cos(rad(lean)) - (L.trunk - L.a); // shoulder height above the table top
        const fore = Math.acos(clamp((drop - L.a * Math.cos(rad(upper))) / L.f, -1, 1)) * 180 / Math.PI;
        return { lean: lean, upper: upper, elbow: Math.max(0, fore - upper) };
    }

    /** Forward lunge (MotionRx's stance), front leg: knee bend = th. */
    function lungeGeometry(th) {
        const thigh = 22 + 0.7 * th;            // front thigh, forward of straight down
        return { thigh: thigh, shin: thigh - th, backHip: -16 + 0.08 * th, backKnee: 0.9 * th, backAnkle: 10 + 0.45 * th, trunk: 2 };
    }

    /* ======================================================================
     *  MARKS — reference, reached angle, target, live, arrows, hold ring
     * ==================================================================== */

    function marks(m, st, unit) {
        const th = st.theta, tgt = st.target, live = st.live;
        const reached = tgt !== null && tgt !== undefined && th >= tgt - 0.5;
        const col = st.wrong ? COL.bad : (reached ? COL.ok : COL.mark);
        let s = '';

        if (m.kind === 'gauge') {
            const c = clamp(th / 100, 0, 1);
            s += circle(m.x, m.y, m.r, 'rgba(255,255,255,.85)', ' stroke="' + COL.line + '" stroke-opacity=".18" stroke-width="7"');
            if (c > 0.01) s += '<path d="' + arcD(m.x, m.y, m.r, 180, 180 - 359.9 * c) + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round"/>';
            if (tgt) {
                const p1 = at(m.x, m.y, m.r - 7, 180 - 3.6 * tgt), p2 = at(m.x, m.y, m.r + 7, 180 - 3.6 * tgt);
                s += seg(p1, p2, 3, COL.target);
            }
            if (live !== null && live !== undefined) s += circle(at(m.x, m.y, m.r, 180 - 3.6 * clamp(live, 0, 100)).x, at(m.x, m.y, m.r, 180 - 3.6 * clamp(live, 0, 100)).y, 4.5, COL.live, ' stroke="#fff" stroke-width="2"');
            if (st.labels !== false) s += text(m.x, m.y + 1, Math.round(th) + '%', 'ef-num ef-num-sm');
            return s;
        }

        if (m.kind === 'dial') {
            /* top view of the head: a circle with a nose, turning */
            const a = m.sign * th;
            s += circle(m.x, m.y, m.r + 6, 'rgba(255,255,255,.75)', ' stroke="' + COL.line + '" stroke-opacity=".15" stroke-width="1.5"');
            s += seg({ x: m.x, y: m.y }, at(m.x, m.y, m.r + 6, 0), 1.6, 'rgba(19,41,75,.35)', ' stroke-dasharray="3 3"');
            if (tgt) {
                [-1, 1].forEach(function (sg) {
                    s += seg({ x: m.x, y: m.y }, at(m.x, m.y, m.r + 6, sg * tgt), 2, COL.target, ' stroke-dasharray="4 3"');
                });
            }
            if (th > 0.5) s += path(wedgeD(m.x, m.y, m.r, 0, a), col, ' fill-opacity=".22" stroke="' + col + '" stroke-width="2"');
            if (live !== null && live !== undefined && live > 0.5) {
                const lp = at(m.x, m.y, m.r, (st.liveSign || m.sign) * live);
                s += circle(lp.x, lp.y, 4.2, COL.live, ' stroke="#fff" stroke-width="2"');
            }
            /* the little head seen from above */
            s += circle(m.x, m.y, 11, COL.hair, ' stroke="' + COL.line + '" stroke-width="2"');
            const n = at(m.x, m.y, 11, a), nl = at(m.x, m.y, 7, a - 35), nr = at(m.x, m.y, 7, a + 35);
            const tip = at(m.x, m.y, 17, a);
            s += '<path d="M' + f(nl.x) + ' ' + f(nl.y) + ' L' + f(tip.x) + ' ' + f(tip.y) + ' L' + f(nr.x) + ' ' + f(nr.y) + ' Z" fill="' + COL.skin + '" stroke="' + COL.line + '" stroke-width="1.8" stroke-linejoin="round"/>';
            void n;
            if (st.arrow) {
                const from = a, to = st.arrow === 'out' ? a + m.sign * 22 : a - m.sign * Math.min(22, th);
                if (Math.abs(to - from) > 3) {
                    s += '<path d="' + arcD(m.x, m.y, m.r + 12, from, to) + '" fill="none" stroke="' + COL.target + '" stroke-width="3" stroke-linecap="round"/>';
                    s += arrowHead(m.x, m.y, m.r + 12, to, to > from ? 1 : -1, COL.target);
                }
            }
            if (st.labels !== false) s += text(m.x + 54, m.y - 4, Math.round(th) + unit);
            return s;
        }

        if (m.kind === 'hz') return hzMarks(m, st, unit, col);

        /* 'arc' */
        const R = m.r, IN = m.inner || 0;
        const cur = m.a0 + m.sign * th;
        const from = function (a) { return IN ? at(m.x, m.y, IN, a) : { x: m.x, y: m.y }; };
        s += seg(from(m.a0), at(m.x, m.y, m.refLen || R + 16, m.a0), 1.8, 'rgba(19,41,75,.4)', ' stroke-dasharray="4 4"');
        if (tgt) {
            const ta = m.a0 + m.sign * tgt;
            const tp = at(m.x, m.y, R + 18, ta);
            s += seg(from(ta), tp, 2.2, COL.target, ' stroke-dasharray="5 4"');
            s += circle(tp.x, tp.y, 3.6, COL.target, ' stroke="#fff" stroke-width="1.5"');
        }
        if (th > 0.5) {
            if (IN) {
                const a = at(m.x, m.y, IN, m.a0), b = at(m.x, m.y, IN, cur);
                const d = 'M' + f(a.x) + ' ' + f(a.y) + ' L' + arcD(m.x, m.y, R, m.a0, cur).slice(1) +
                          ' L' + f(b.x) + ' ' + f(b.y) + ' ' + arcD(m.x, m.y, IN, cur, m.a0).replace(/^M[^A]*/, '') + ' Z';
                s += path(d, col, ' fill-opacity=".22" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round"');
            } else {
                s += path(wedgeD(m.x, m.y, R, m.a0, cur), col, ' fill-opacity=".2" stroke="' + col + '" stroke-width="2.4"');
            }
        }
        if (live !== null && live !== undefined && live > 0.5) {
            const lp = at(m.x, m.y, R, m.a0 + m.sign * live);
            s += circle(lp.x, lp.y, 4.4, COL.live, ' stroke="#fff" stroke-width="2"');
        }
        if (st.arrow) {
            const to = st.arrow === 'out' ? cur + m.sign * 24 : cur - m.sign * Math.min(24, th);
            if (Math.abs(to - cur) > 3) {
                s += '<path d="' + arcD(m.x, m.y, R + 9, cur, to) + '" fill="none" stroke="' + COL.target + '" stroke-width="3" stroke-linecap="round"/>';
                s += arrowHead(m.x, m.y, R + 9, to, to > cur ? 1 : -1, COL.target);
            }
        }
        if (st.labels !== false && th > 0.5) {
            const lp = at(m.x, m.y, R + 17, m.a0 + m.sign * Math.max(th / 2, 9));
            s += text(clamp(lp.x, 20, 180), clamp(lp.y, 12, 190), Math.round(th) + unit);
        }
        return s;
    }

    /**
     * v18 'hz' marks: a turn in the HORIZONTAL plane seen from the front
     * (camera slightly above, as the patient's camera in front sees it): the
     * goniometer lies flat, so its circle shows as an ellipse k times as tall
     * as it is wide. Angle 0 points toward the viewer (down the screen),
     * + toward the screen's right. Same pieces as the 'arc' marks.
     */
    function hzMarks(m, st, unit, col) {
        const th = st.theta, tgt = st.target, live = st.live, k = m.k || 0.5;
        const pt = function (a, r) { return { x: m.x + Math.sin(rad(a)) * r, y: m.y + Math.cos(rad(a)) * r * k }; };
        const arcPts = function (a1, a2, r) {
            const n = Math.max(2, Math.ceil(Math.abs(a2 - a1) / 4));
            let d = '';
            for (let i = 0; i <= n; i++) { const q = pt(a1 + (a2 - a1) * i / n, r); d += (i ? ' L' : 'M') + f(q.x) + ' ' + f(q.y); }
            return d;
        };
        const cur = m.a0 + m.sign * th;
        let s = '';
        s += '<path d="' + arcPts(-180, 180, m.r) + ' Z" fill="none" stroke="rgba(19,41,75,.18)" stroke-width="1.2" stroke-dasharray="3 4"/>';
        s += seg({ x: m.x, y: m.y }, pt(m.a0, m.r + 14), 1.8, 'rgba(19,41,75,.4)', ' stroke-dasharray="4 4"');
        if (tgt) {
            const tp = pt(m.a0 + m.sign * tgt, m.r + 14);
            s += seg({ x: m.x, y: m.y }, tp, 2.2, COL.target, ' stroke-dasharray="5 4"');
            s += circle(tp.x, tp.y, 3.6, COL.target, ' stroke="#fff" stroke-width="1.5"');
        }
        if (th > 0.5) {
            s += path('M' + f(m.x) + ' ' + f(m.y) + ' L' + arcPts(m.a0, cur, m.r).slice(1) + ' Z', col,
                      ' fill-opacity=".22" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round"');
        }
        if (live !== null && live !== undefined && live > 0.5) {
            const lp = pt(m.a0 + m.sign * live, m.r);
            s += circle(lp.x, lp.y, 4.4, COL.live, ' stroke="#fff" stroke-width="2"');
        }
        if (st.arrow) {
            const to = st.arrow === 'out' ? cur + m.sign * 24 : cur - m.sign * Math.min(24, th);
            if (Math.abs(to - cur) > 3) {
                s += '<path d="' + arcPts(cur, to, m.r + 8) + '" fill="none" stroke="' + COL.target + '" stroke-width="3" stroke-linecap="round"/>';
                const tip = pt(to, m.r + 8), back = pt(to - (to > cur ? 7 : -7), m.r + 8);
                const ux = tip.x - back.x, uy = tip.y - back.y, ul = Math.hypot(ux, uy) || 1;
                const nx = -uy / ul * 5, ny = ux / ul * 5;
                s += '<path d="M' + f(tip.x + ux / ul * 4) + ' ' + f(tip.y + uy / ul * 4) + ' L' + f(back.x + nx) + ' ' + f(back.y + ny) +
                     ' L' + f(back.x - nx) + ' ' + f(back.y - ny) + ' Z" fill="' + COL.target + '"/>';
            }
        }
        if (st.labels !== false && th > 0.5) {
            const lp = pt(m.a0 + m.sign * Math.max(th / 2, 9), m.r + 18);
            s += text(clamp(lp.x, 20, 180), clamp(lp.y, 12, 190), Math.round(th) + unit);
        }
        return s;
    }

    function holdRing(st) {
        if (st.holdP === null || st.holdP === undefined) return '';
        const x = 28, y = 28, r = 19;
        const done = st.holdP >= 1;
        let s = circle(x, y, r + 5, done ? COL.ok : '#0E2340', ' stroke="none" opacity=".92"');
        s += circle(x, y, r, 'none', ' stroke="rgba(255,255,255,.25)" stroke-width="5"');
        if (st.holdP > 0.005) {
            s += '<path d="' + arcD(x, y, r, 180, 180 - 359.9 * clamp(st.holdP, 0, 1)) + '" fill="none" stroke="' +
                 (done ? '#fff' : COL.target) + '" stroke-width="5" stroke-linecap="round"/>';
        }
        s += '<text x="' + x + '" y="' + (y + 1) + '" class="ef-hold" text-anchor="middle" dominant-baseline="middle">' +
             (done ? '✓' : (st.holdText || '')) + '</text>';
        return s;
    }

    /* ======================================================================
     *  MOUNT
     * ==================================================================== */

    let uid = 0;

    /**
     * Puts a figure in `host`. Returns { set(state), el, exercise }.
     * state = { theta, dir, target, live, liveSign, holdP, holdText,
     *           arrow: 'out'|'back', wrong, labels }
     */
    function mount(host, exId, opts) {
        opts = opts || {};
        const id = 'ef' + (++uid);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        svg.setAttribute('class', 'ef-svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('data-no-i18n', '');
        svg.innerHTML =
            '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
                '<mask id="' + id + 'm"><rect x="-20" y="-20" width="240" height="240" fill="url(#' + id + 'g)"/></mask></defs>' +
            '<g class="ef-body" mask="url(#' + id + 'm)"></g><g class="ef-marks"></g><g class="ef-ring"></g>';
        host.appendChild(svg);

        const mk = svg.querySelector('.ef-marks');
        const ring = svg.querySelector('.ef-ring');
        const markOf = MARKS[exId];
        const spec = EX[exId] || { unit: '°', dirs: ['both'] };
        let last = '';
        let lastSt = null;
        const fig3d = Look3D.attach(svg, exId, opts);

        const api = {
            el: svg,
            exercise: exId,
            set: function (st) {
                if (!markOf) return;
                st = st || {};
                const th = Math.max(0, st.theta || 0);
                const dir = st.dir || spec.dirs[0];
                const key = [exId, f(th), dir, st.side || '', st.target, st.live === undefined || st.live === null ? '' : f(st.live),
                             st.holdP === undefined || st.holdP === null ? '' : f(st.holdP), st.holdText, st.arrow, st.wrong, st.labels, opts.marks].join('|');
                if (key === last) return;           // nothing moved: no repaint
                /* v17.6: the 3D look repaints at most ~30 times a second per figure;
                   body and marks always repaint together */
                if (fig3d.active() && !fig3d.ready()) return;
                last = key;
                lastSt = st;
                /* v19: the body is only ever Sophia (3D) */
                if (fig3d.active()) fig3d.draw(th, dir, st.side);
                const mObj = markOf(th, dir);
                api.pivot = mObj ? { x: mObj.x, y: mObj.y } : null;   /* exposed for the Exercise Guide's problem highlight */
                mk.innerHTML = opts.marks === false ? '' : marks(mObj, {
                    theta: th, target: st.target, live: st.live, liveSign: st.liveSign,
                    arrow: st.arrow, wrong: st.wrong, labels: st.labels
                }, spec.unit);
                ring.innerHTML = holdRing(st);
            },
            destroy: function () { fig3d.detach(); if (svg.parentNode) svg.parentNode.removeChild(svg); }
        };
        /* when the 3D look arrives (or the figure is resized) repaint the last state */
        fig3d.onRepaint(function () { if (lastSt) { last = ''; api.set(lastSt); } });
        return api;
    }

    /* ======================================================================
     *  3D LOOK  (v17.6 · v19 Sophia)
     *  The avatar is Sophia (female, sophia-model.js) or Manuel (male,
     *  manuel-model.js, v22), drawn by avatar-3d.js and loaded on demand;
     *  the viewer picks one in the navbar and the choice is remembered. v19: no other figure is ever drawn — until she is ready, or
     *  where WebGL is missing, only the marks are shown. Angles, marks, the
     *  demo timeline and everything the guide does are unchanged.
     * ==================================================================== */

    const Look3D = (function () {
        const BOX = { x: -60, y: -60, w: 320, h: 320 };      // figure space the 3D picture covers
        /* ms between 3D repaints of one figure. v36: fewer while the camera is
           tracking (the processor is needed for detection), and fewer again on
           a computer that draws 3D in software (avatar-3d.js lite()). */
        let busy = false;
        function minGap() {
            const lite = !!(global.ReMotionAvatar3D && global.ReMotionAvatar3D.lite && global.ReMotionAvatar3D.lite());
            return lite ? (busy ? 200 : 90) : (busy ? 66 : 30);
        }
        let tries = 0;                                        // v36: failed loads are retried
        const base = (function () {
            try {
                const s = document.currentScript && document.currentScript.src;
                return s ? s.replace(/[^\/]*$/, '') : '';
            } catch (e) { return ''; }
        })();
        let state = 'idle';            // idle | loading | ready | off
        const figs = new Set();
        let startP = null;             // resolves once the 3D character is ready
        const listeners = [];          // told when the character changes (home-page arch)

        /* two characters; the viewer's choice is remembered in this browser */
        const MODELS = {
            female: { file: 'sophia-model.js', global: 'SOPHIA_MODEL' },
            male:   { file: 'manuel-model.js', global: 'MANUEL_MODEL' }
        };
        const PREF_KEY = 'rehab_character';
        let want = (function () {
            try { const v = global.localStorage.getItem(PREF_KEY); return MODELS[v] ? v : 'female'; } catch (e) { return 'female'; }
        })();
        const modelLoads = {};
        function loadModel(c) {
            const M = MODELS[c];
            if (global[M.global]) return Promise.resolve();
            return modelLoads[c] || (modelLoads[c] = loadScript(base + M.file).catch(function (e) { delete modelLoads[c]; throw e; }));
        }
        /* bring the 3D picture to the wanted character, then repaint every figure */
        function sync() {
            const A = global.ReMotionAvatar3D, c = want;
            if (state !== 'ready' || !A || A.character() === c) return Promise.resolve();
            return loadModel(c)
                .then(function () { return c === want ? A.setCharacter(c) : null; })
                .then(function () { try { if (A.warm) A.warm(); } catch (e) { /* */ } })   // v36: the new character's textures, off the first paint
                .then(function () {
                    figs.forEach(function (fg) { if (fg.refresh) fg.refresh(); });
                    listeners.forEach(function (fn) { try { fn(A.character()); } catch (e) { /* */ } });
                });
        }
        function setCharacter(c) {
            if (!MODELS[c]) c = 'female';
            want = c;
            try { global.localStorage.setItem(PREF_KEY, c); } catch (e) { /* private mode: not remembered */ }
            return sync();
        }

        function loadScript(src) {
            return new Promise(function (ok, bad) {
                const el = document.createElement('script');
                el.src = src + (/-model\.js$/.test(src) ? '?v=36' : '?v=36'); el.async = true;   // v36: smaller textures in the models; lite mode + warm-up in the avatar code
                el.onload = ok; el.onerror = bad;
                document.head.appendChild(el);
            });
        }
        function start() {
            if (state !== 'idle') return startP;
            state = 'loading';
            startP = (global.THREE ? Promise.resolve() : loadScript(base + 'vendor/three.min.js'))
                .then(function () { return global.ReMotionAvatar3D ? null : loadScript(base + 'avatar-3d.js'); })
                /* v22: only the chosen character's model (mesh, skeleton, textures) is downloaded */
                .then(function () { return loadModel(want); })
                .then(function () {
                    const A = global.ReMotionAvatar3D;
                    if (!A || !A.supported()) throw new Error('no WebGL');
                    /* building the character takes a moment: do it once, off the first paint,
                       and show them only when the textures are decoded */
                    return new Promise(function (ok) { setTimeout(function () { A.setCharacter(want); A.init(); ok(A.ready()); }, 60); });
                })
                /* v36: compile the shaders and upload the textures now, in the
                   background, not on the first paint of an open exercise */
                .then(function () {
                    return new Promise(function (ok) {
                        const go = function () { try { if (global.ReMotionAvatar3D.warm) global.ReMotionAvatar3D.warm(); } catch (e) { /* */ } ok(); };
                        if (global.requestIdleCallback) global.requestIdleCallback(go, { timeout: 400 }); else setTimeout(go, 30);
                    });
                })
                .then(function () {
                    state = 'ready';
                    figs.forEach(function (fg) { fg.wake(); });
                    return sync();          // the viewer may have switched while loading
                })
                .then(function () { return global.ReMotionAvatar3D; })
                .catch(function (e) {
                    state = 'off';
                    try { console.warn('[ExerciseFigures] 3D avatar unavailable, showing the marks only:', e && e.message ? e.message : e); } catch (x) { /* */ }
                    /* v36: a dropped download is tried again (it used to stay off
                       until the page was reloaded); no WebGL at all is final */
                    const noGL = e && /no WebGL/.test(e.message || '');
                    if (!noGL && ++tries < 4) {
                        setTimeout(function () { state = 'idle'; startP = null; if (figs.size) start(); }, 4000 * tries);
                    } else {
                        figs.forEach(function (fg) { if (fg.unload) fg.unload(); });
                    }
                    throw e;
                });
            startP.catch(function () { /* reported above */ });
            return startP;
        }

        function attach(svg, exId, fopts) {
            fopts = fopts || {};
            const A = function () { return global.ReMotionAvatar3D; };
            let fo = null, canvas = null, repaint = null, lastDraw = 0, ro = null, on = false, note = null;
            /* v36: say the figure is on its way, instead of an empty box */
            if (state !== 'ready' && state !== 'off') {
                try {
                    let bn = false;
                    try { bn = (global.I18n && I18n.lang === 'bn') || global.localStorage.getItem('rehab_lang') === 'bn'; } catch (e) { /* */ }
                    note = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    note.setAttribute('x', '100'); note.setAttribute('y', '104'); note.setAttribute('text-anchor', 'middle');
                    note.setAttribute('class', 'ef-loading');
                    note.setAttribute('style', 'font: 600 11px system-ui, sans-serif; fill: #64748B; opacity: .85');
                    note.textContent = bn ? 'অ্যাভাটার লোড হচ্ছে…' : 'Loading avatar…';
                    svg.querySelector('.ef-body').appendChild(note);
                } catch (e) { note = null; }
            }
            const fg = {
                active: function () { return on; },
                ready: function () {
                    if (performance.now() - lastDraw < minGap()) return false;
                    /* v36: a figure that cannot be seen is not repainted */
                    if (on && (document.hidden || !svg.isConnected)) return false;
                    if (on) {
                        const r = svg.getBoundingClientRect();
                        if (!r.width || !r.height || r.bottom < 0 || r.right < 0 ||
                            r.top > (global.innerHeight || 1e5) || r.left > (global.innerWidth || 1e5)) return false;
                    }
                    return true;
                },
                draw: function (th, dir, side) {
                    lastDraw = performance.now();
                    const r = fo.getBoundingClientRect();
                    const dpr = Math.min(2, global.devicePixelRatio || 1);
                    const W = Math.min(1400, Math.round(r.width * dpr)), H = Math.min(1400, Math.round(r.height * dpr));
                    if (!W || !H) return;                 // not on screen yet: the resize watcher repaints later
                    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
                    /* v23: opts.mirror = copy the patient, from their camera's view */
                    try { A().draw(canvas, exId, th, dir, BOX, fopts.mirror ? { mirror: true, side: side } : undefined); }
                    catch (e) { on = false; fo.style.display = 'none'; try { console.warn('[ExerciseFigures] 3D draw failed', e); } catch (x) { /* */ } }
                },
                onRepaint: function (fn) { repaint = fn; },
                refresh: function () { if (on) { lastDraw = 0; if (repaint) repaint(); } },
                unload: function () { if (note && note.parentNode) note.parentNode.removeChild(note); note = null; },
                wake: function () {
                    if (on || state !== 'ready' || !A() || !A().has(exId) || !svg.isConnected) return;
                    fg.unload();
                    const NS = 'http://www.w3.org/2000/svg';
                    fo = document.createElementNS(NS, 'foreignObject');
                    fo.setAttribute('x', BOX.x); fo.setAttribute('y', BOX.y);
                    fo.setAttribute('width', BOX.w); fo.setAttribute('height', BOX.h);
                    fo.setAttribute('class', 'ef-body-3d');
                    canvas = document.createElement('canvas');
                    canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
                    fo.appendChild(canvas);
                    svg.querySelector('.ef-body').appendChild(fo);
                    on = true;
                    if (global.ResizeObserver) {
                        let pw = 0, ph = 0;
                        ro = new ResizeObserver(function () {
                            const r = fo.getBoundingClientRect();
                            if (Math.abs(r.width - pw) < 1 && Math.abs(r.height - ph) < 1) return;
                            pw = r.width; ph = r.height;
                            lastDraw = 0;
                            if (repaint) repaint();
                        });
                        ro.observe(svg);
                    }
                    lastDraw = 0;
                    if (repaint) repaint();
                },
                detach: function () { figs.delete(fg); if (ro) ro.disconnect(); }
            };
            fg.gone = function () { return !svg.isConnected; };
            /* forget figures whose host was emptied (the guide replaces them with innerHTML = '') */
            Array.from(figs).forEach(function (o) { if (o.gone()) o.detach(); });
            figs.add(fg);
            if (state === 'idle') start();
            else if (state === 'ready') setTimeout(function () { fg.wake(); }, 0);
            return fg;
        }

        return { attach: attach, start: start, setBusy: function (b) { busy = !!b; }, state: function () { return state; },
                 setCharacter: setCharacter, character: function () { return want; },
                 onCharacter: function (fn) { listeners.push(fn); } };
    })();

    /* ======================================================================
     *  DEMO TIMELINE — rest, go, hold, return, rest, alternating direction
     * ==================================================================== */

    function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

    function demoPeak(exId, target, rangeMax) {
        const spec = EX[exId];
        if (!spec) return 0;
        let p = spec.peak;
        if (target) p = Math.max(p, target * 1.12);
        if (rangeMax) p = Math.min(p, rangeMax);
        return p;
    }

    /** Where the demo is at time `t` seconds. */
    function demoAt(exId, t, peak, holdSec) {
        const spec = EX[exId] || { dirs: ['both'] };
        const rest = 0.7, go = 1.3, hold = Math.max(0.6, holdSec || 0), back = 1.2;
        const T = rest + go + hold + back;
        const n = Math.floor(t / T);
        const u = t - n * T;
        const dir = spec.dirs[n % spec.dirs.length];
        /* v35: a direction may go less far (lumbar extension) */
        if (spec.dirScale && spec.dirScale[dir]) peak = peak * spec.dirScale[dir];
        let th, phase, holdP = null;
        if (u < rest)                    { th = 0; phase = 'rest'; }
        else if (u < rest + go)          { th = peak * ease((u - rest) / go); phase = 'go'; }
        else if (u < rest + go + hold)   { th = peak; phase = 'hold'; holdP = holdSec ? (u - rest - go) / hold : null; }
        else                             { th = peak * (1 - ease((u - rest - go - hold) / back)); phase = 'back'; }
        return { theta: th, dir: dir, phase: phase, holdP: holdP, holdLeft: holdSec ? Math.max(0, hold - (u - rest - go)) : 0 };
    }

    global.ExerciseFigures = {
        mount: mount,
        /* v22: 'female' (Sophia) | 'male' (Manuel); returns a promise, resolved once shown */
        setCharacter: function (c) { return Look3D.setCharacter(c); },
        character: function () { return Look3D.character(); },
        onCharacter: function (fn) { Look3D.onCharacter(fn); },
        /* v22: the shared 3D character (loads it if needed); resolves to ReMotionAvatar3D */
        avatar3D: function () { return Look3D.start(); },
        /* v36: download, build and warm the 3D character in the background
           (the patient page calls this as soon as it opens), so opening an
           exercise shows the figure at once */
        preload: function () { try { Look3D.start(); } catch (e) { /* */ } },
        /* v36: true while the camera is tracking — the figures repaint less often */
        setBusy: function (b) { Look3D.setBusy(b); },
        demoAt: demoAt,
        demoPeak: demoPeak,
        info: function (id) { return EX[id] ? Object.assign({ id: id }, EX[id]) : null; },
        has: function (id) { return !!MARKS[id]; },
        order: ORDER.slice(),
        colours: COL,
        squatGeometry: squatGeometry,
        geometry: { fingerWalk: fingerWalkGeometry, tableSlide: tableSlideGeometry, lunge: lungeGeometry, armReach: armReach }
    };

})(window);
