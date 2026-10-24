/**
 * ============================================================================
 *  EXERCISE FIGURES  (v16 · avatar look v17.6)
 *  v17.6: the avatar is drawn in 3D with the MotionRx character's look
 *  (avatar-3d.js, loaded on demand). Angles, rigs, marks and the demo
 *  timeline below are unchanged and still drive it.
 * ============================================================================
 *  One animated character per exercise, drawn in SVG in a soft, rounded 3D
 *  style: shaded skin and cloth, tapered limbs with rounded elbows and knees,
 *  a real hand (palm, four fingers, thumb), socks and shoes. The movement is
 *  marked on top: the start line, the angle reached, the target and, for the
 *  coach, the patient's own live angle.
 *
 *  Only the part of the body that matters is drawn:
 *      neck exercises   head, neck and chest (front or side)
 *      shoulder / elbow head to hips
 *      squat            the whole body, from the side
 *      wrist            forearm on a table edge, hand bending
 *      fingers          one hand, palm to the camera
 *
 *  Used by the home-page ribbon, the patient's Demo / Follow guide and the
 *  cue guide drop-down. No dependencies.
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

    /* Materials: light / base / dark / edge. Light falls from the top left. */
    /* v17.6: 2D stand-in tones follow the 3D avatar's look (MotionRx character:
       black training tee and shorts, dark trainers, black hair). The 2D figure
       shows only while the 3D avatar loads, or where WebGL is unavailable. */
    const TONES = {
        skin:      ['#D59473', '#B57454', '#8E5539', '#7A4730'],
        skinFar:   ['#C18263', '#A16547', '#7C4A31', '#683D28'],
        hair:      ['#3A2C24', '#1A1310', '#0B0806', '#080605'],
        shirt_demo:  ['#4A4D55', '#25272C', '#141518', '#0E0F11'],
        shirt_coach: ['#4A4D55', '#25272C', '#141518', '#0E0F11'],
        shirtFar_demo:  ['#3A3D44', '#1D1F23', '#101113', '#0B0C0D'],
        shirtFar_coach: ['#3A3D44', '#1D1F23', '#101113', '#0B0C0D'],
        trim_demo:  ['#2E3036', '#141518', '#0A0B0C', '#060607'],
        trim_coach: ['#2E3036', '#141518', '#0A0B0C', '#060607'],
        shorts:    ['#3E4047', '#1E1F23', '#111214', '#0C0D0E'],
        shortsFar: ['#33353B', '#18191C', '#0E0F10', '#0A0A0B'],
        sock:      ['#FFFFFF', '#F6F1E8', '#D6CEBF', '#C2B9A8'],
        shoe:      ['#5A606A', '#2B2F36', '#16181C', '#101215'],
        table:     ['#F2DDB6', '#D8BC8A', '#AE905C', '#9A7D4C'],
        nose:      ['#CF8D6C', '#B57454', '#94593D', '#7E4B33'],
        iris:      ['#8A5A34', '#5B3A1E', '#3A2312', '#1D120A']
    };

    function tone(name) { return TONES[name] || TONES.skin; }
    function shirtOf(who)  { return who === 'coach' ? 'shirt_coach' : 'shirt_demo'; }
    function shirtFar(who) { return who === 'coach' ? 'shirtFar_coach' : 'shirtFar_demo'; }
    function trimOf(who)   { return who === 'coach' ? 'trim_coach' : 'trim_demo'; }

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
        wrist_flexion:        { dirs: ['flexion', 'extension'], peak: 45,  unit: '°', name: 'Wrist Bend', label: 'Wrist Flexion\n& Extension', short: 'Bend up and down' },
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
                   'finger_walk', 'table_slide', 'cross_body_stretch', 'scapular_squeeze', 'trunk_rotation',
                   'hip_abduction', 'standing_march', 'standing_knee_flexion', 'forward_lunge', 'heel_raise',
                   'finger_spread'];

    /* ======================================================================
     *  SMALL SVG HELPERS
     * ==================================================================== */

    function f(v) { return Math.round(v * 10) / 10; }
    function rad(a) { return a * Math.PI / 180; }
    function at(x, y, len, a) { return { x: x + Math.sin(rad(a)) * len, y: y + Math.cos(rad(a)) * len }; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function angOf(p1, p2) { return Math.atan2(p2.x - p1.x, p2.y - p1.y) / Math.PI * 180; }
    function lerp(p1, p2, k) { return { x: p1.x + (p2.x - p1.x) * k, y: p1.y + (p2.y - p1.y) * k }; }

    function seg(p1, p2, w, col, extra) {
        return '<line x1="' + f(p1.x) + '" y1="' + f(p1.y) + '" x2="' + f(p2.x) + '" y2="' + f(p2.y) +
               '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (extra || '') + '/>';
    }
    function circle(x, y, r, fill, extra) {
        return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' +
               (extra === undefined ? ' stroke="' + COL.line + '" stroke-width="2.2"' : extra) + '/>';
    }
    function ellipse(x, y, rx, ry, fill, extra) {
        return '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + fill + '"' +
               (extra === undefined ? '' : extra) + '/>';
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
     *  SHADING
     *  Shared radial gradients live in one hidden <svg> in the page (made
     *  once). Limbs get their own small linear gradient laid ACROSS the limb,
     *  which is what makes an arm read as round rather than flat.
     * ==================================================================== */

    function ensureDefs() {
        if (document.getElementById('ef-shared-defs')) return;
        const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        holder.setAttribute('id', 'ef-shared-defs');
        holder.setAttribute('aria-hidden', 'true');
        holder.setAttribute('width', '0');
        holder.setAttribute('height', '0');
        holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
        let d = '<defs>';
        Object.keys(TONES).forEach(function (k) {
            const t = TONES[k];
            d += '<radialGradient id="efr-' + k + '" cx=".36" cy=".3" r=".78">' +
                    '<stop offset="0" stop-color="' + t[0] + '"/><stop offset=".55" stop-color="' + t[1] + '"/>' +
                    '<stop offset="1" stop-color="' + t[2] + '"/></radialGradient>';
            d += '<linearGradient id="efv-' + k + '" x1="0" y1="0" x2="0" y2="1">' +
                    '<stop offset="0" stop-color="' + t[0] + '"/><stop offset=".45" stop-color="' + t[1] + '"/>' +
                    '<stop offset="1" stop-color="' + t[2] + '"/></linearGradient>';
        });
        d += '<radialGradient id="efr-blush" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F27E7E" stop-opacity=".55"/>' +
             '<stop offset="1" stop-color="#F27E7E" stop-opacity="0"/></radialGradient>';
        d += '<radialGradient id="efr-sclera" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#FFFFFF"/>' +
             '<stop offset=".8" stop-color="#F3F1EE"/><stop offset="1" stop-color="#D9D3CC"/></radialGradient>';
        d += '<radialGradient id="efr-mouth" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#9C3A33"/>' +
             '<stop offset="1" stop-color="#5E1D19"/></radialGradient>';
        d += '<radialGradient id="efr-shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1B2A47" stop-opacity=".22"/>' +
             '<stop offset="1" stop-color="#1B2A47" stop-opacity="0"/></radialGradient>';
        d += '</defs>';
        holder.innerHTML = d;
        (document.body || document.documentElement).appendChild(holder);
    }

    function R(name) { return 'url(#efr-' + name + ')'; }
    function V(name) { return 'url(#efv-' + name + ')'; }
    function edge(name, w) { return ' stroke="' + tone(name)[3] + '" stroke-width="' + (w || 1.1) + '" stroke-linejoin="round"'; }

    /* per-render id counter for the limb gradients (set by mount) */
    let CUR = { pfx: 'efx', n: 0 };
    function gid() { return CUR.pfx + '_' + (CUR.n++); }

    /**
     * A tapered, rounded limb segment from p1 (width w1) to p2 (width w2),
     * shaded across its width.
     */
    function cyl(p1, p2, w1, w2, toneName) {
        const t = tone(toneName);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const L = Math.hypot(dx, dy) || 0.001;
        const ux = dx / L, uy = dy / L;
        let nx = -uy, ny = ux;                         // a normal
        if (nx + ny > 0) { nx = -nx; ny = -ny; }       // point it toward the light (top-left)
        const r1 = w1 / 2, r2 = w2 / 2;
        const a = { x: p1.x + nx * r1, y: p1.y + ny * r1 }, b = { x: p2.x + nx * r2, y: p2.y + ny * r2 };
        const c = { x: p2.x - nx * r2, y: p2.y - ny * r2 }, d = { x: p1.x - nx * r1, y: p1.y - ny * r1 };
        const id = gid();
        const m = lerp(p1, p2, 0.5), rm = (r1 + r2) / 2;
        // which way round the end caps go depends on the normal's side
        const cross = ux * ny - uy * nx;
        const sw = cross > 0 ? 0 : 1;
        return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + f(m.x + nx * rm) + '" y1="' + f(m.y + ny * rm) +
                   '" x2="' + f(m.x - nx * rm) + '" y2="' + f(m.y - ny * rm) + '">' +
                   '<stop offset="0" stop-color="' + t[0] + '"/><stop offset=".42" stop-color="' + t[1] + '"/>' +
                   '<stop offset="1" stop-color="' + t[2] + '"/></linearGradient>' +
               '<path d="M' + f(a.x) + ' ' + f(a.y) + ' L' + f(b.x) + ' ' + f(b.y) +
                   ' A' + f(r2) + ' ' + f(r2) + ' 0 0 ' + sw + ' ' + f(c.x) + ' ' + f(c.y) +
                   ' L' + f(d.x) + ' ' + f(d.y) +
                   ' A' + f(r1) + ' ' + f(r1) + ' 0 0 ' + sw + ' ' + f(a.x) + ' ' + f(a.y) + ' Z" fill="url(#' + id + ')"' +
                   edge(toneName, 0.9) + '/>';
    }

    /** A flat band across a limb (a sleeve cuff, a hem): square ends, gently curved. */
    function band(p1, p2, w, toneName) {
        const t = tone(toneName);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const L = Math.hypot(dx, dy) || 0.001;
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, r = w / 2;
        const id = gid();
        const A = function (p, k) { return f(p.x + nx * r * k) + ' ' + f(p.y + ny * r * k); };
        const bulge = function (p) { return f(p.x + ux * 2) + ' ' + f(p.y + uy * 2); };
        return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + A(p1, 1).replace(' ', '" y1="') +
                   '" x2="' + A(p1, -1).replace(' ', '" y2="') + '">' +
                   '<stop offset="0" stop-color="' + t[0] + '"/><stop offset=".45" stop-color="' + t[1] + '"/>' +
                   '<stop offset="1" stop-color="' + t[2] + '"/></linearGradient>' +
               '<path d="M' + A(p1, 1) + ' Q' + bulge(p1) + ' ' + A(p1, -1) + ' L' + A(p2, -1) + ' Q' + bulge(p2) + ' ' + A(p2, 1) + ' Z" fill="url(#' + id + ')"' +
               edge(toneName, 0.8) + '/>';
    }

    /** A rounded joint (elbow, knee) so two segments meet smoothly. */
    function joint(p, w, toneName) {
        return circle(p.x, p.y, w / 2, R(toneName), '');
    }

    function softShadow(x, y, rx, ry) { return ellipse(x, y, rx, ry, R('shadow')); }

    /* ======================================================================
     *  HANDS
     *  Drawn pointing DOWN from the wrist at (0,0), then rotated into place.
     *    grip 0 = relaxed open hand, 1 = closed fist
     *    side true = seen from the side (thumb toward the viewer's front)
     * ==================================================================== */

    function handLocal(scale, toneName, grip, mirror) {
        const k = scale, g = grip || 0, mx = mirror ? -1 : 1;
        const P = function (x, y) { return { x: x * k * mx, y: y * k }; };
        let s = '';
        /* palm */
        s += path('M' + f(-6 * k * mx) + ' ' + f(-1 * k) +
                  ' Q' + f(0) + ' ' + f(-3 * k) + ' ' + f(6 * k * mx) + ' ' + f(-1 * k) +
                  ' L' + f(7 * k * mx) + ' ' + f(9 * k) + ' Q' + f(6.5 * k * mx) + ' ' + f(14 * k) + ' ' + f(0) + ' ' + f(14.5 * k) +
                  ' Q' + f(-6.5 * k * mx) + ' ' + f(14 * k) + ' ' + f(-7 * k * mx) + ' ' + f(9 * k) + ' Z', R(toneName), edge(toneName, 0.9));
        /* four fingers, shorter and folded as the grip closes */
        const fx = [-4.6, -1.6, 1.5, 4.5], fl = [7.5, 9, 8.6, 7];
        fx.forEach(function (x, i) {
            const len = fl[i] * (1 - 0.7 * g);
            const base = P(x, 12.5), tip = P(x * (1 - 0.15 * g) + (g ? 0 : x * 0.06), 12.5 + len);
            s += cyl(base, tip, 3.5 * k, 3.1 * k, toneName);
            if (g > 0.5) s += ellipse(base.x, base.y + 1.5 * k, 1.6 * k, 1.1 * k, tone(toneName)[2], ' opacity=".5"');
        });
        /* thumb */
        const tb = P(6.2, 3), tt = g > 0.5 ? P(2.5, 11) : P(9.2, 11);
        s += cyl(tb, tt, 4.2 * k, 3.4 * k, toneName);
        return s;
    }

    /** Place a hand at the wrist `p`, pointing along angle `a`. */
    function hand(p, a, scale, toneName, grip, mirror) {
        return '<g transform="translate(' + f(p.x) + ' ' + f(p.y) + ') rotate(' + f(-a) + ')">' +
               handLocal(scale, toneName, grip, mirror) + '</g>';
    }

    /* ======================================================================
     *  HEADS
     * ==================================================================== */

    /** Front-facing head. `yaw` turns it (+ = toward the screen's right). */
    function headFront(cx, cy, r, yaw) {
        yaw = yaw || 0;
        const X = function (a) { return cx + r * 0.9 * Math.sin(rad(a + yaw)); };
        const Vv = function (a) { return Math.cos(rad(a + yaw)); };
        const sy = Math.sin(rad(yaw));
        let back = '', front = '';

        /* ears: kept near the outline of the head (a head is deeper than wide) */
        [-96, 96].forEach(function (a) {
            const v = Vv(a);
            const sn = Math.sin(rad(a + yaw));
            const ex = cx + r * 0.94 * (sn < 0 ? -1 : 1) * Math.max(0.86, Math.abs(sn));
            const side = sn < 0 ? -1 : 1;
            const e = ellipse(ex, cy + r * 0.1, r * 0.2, r * 0.27, R('skin'), edge('skin')) +
                      ellipse(ex + side * r * 0.03, cy + r * 0.12, r * 0.1, r * 0.16, tone('skin')[2], ' opacity=".55"');
            if (v > 0.05) front += e; else back += e;
        });

        let s = '';
        /* hair volume behind the face */
        s += ellipse(cx - sy * r * 0.1, cy - r * 0.16, r * 1.04, r * 0.98, R('hair'));
        s += back;
        /* face: round, slightly fuller at the cheeks */
        s += path('M' + f(cx - r * 0.9) + ' ' + f(cy - r * 0.1) +
                  ' C' + f(cx - r * 0.92) + ' ' + f(cy - r * 1.02) + ' ' + f(cx + r * 0.92) + ' ' + f(cy - r * 1.02) + ' ' + f(cx + r * 0.9) + ' ' + f(cy - r * 0.1) +
                  ' C' + f(cx + r * 0.92) + ' ' + f(cy + r * 0.62) + ' ' + f(cx + r * 0.42) + ' ' + f(cy + r * 1.0) + ' ' + f(cx) + ' ' + f(cy + r * 1.0) +
                  ' C' + f(cx - r * 0.42) + ' ' + f(cy + r * 1.0) + ' ' + f(cx - r * 0.92) + ' ' + f(cy + r * 0.62) + ' ' + f(cx - r * 0.9) + ' ' + f(cy - r * 0.1) + ' Z',
                  R('skin'), edge('skin'));
        /* hair: a swept fringe and a soft quiff, following the turn */
        const sh = sy * r * 0.42;
        s += path('M' + f(cx - r * 0.96) + ' ' + f(cy + r * 0.02) +
                  ' C' + f(cx - r * 1.08) + ' ' + f(cy - r * 0.85) + ' ' + f(cx - r * 0.55) + ' ' + f(cy - r * 1.28) + ' ' + f(cx + r * 0.05) + ' ' + f(cy - r * 1.22) +
                  ' C' + f(cx + r * 0.35) + ' ' + f(cy - r * 1.42) + ' ' + f(cx + r * 0.9) + ' ' + f(cy - r * 1.2) + ' ' + f(cx + r * 0.82) + ' ' + f(cy - r * 0.98) +
                  ' C' + f(cx + r * 1.08) + ' ' + f(cy - r * 0.78) + ' ' + f(cx + r * 1.0) + ' ' + f(cy - r * 0.3) + ' ' + f(cx + r * 0.95) + ' ' + f(cy + r * 0.02) +
                  ' C' + f(cx + r * 0.86 + sh) + ' ' + f(cy - r * 0.42) + ' ' + f(cx + r * 0.6 + sh) + ' ' + f(cy - r * 0.52) + ' ' + f(cx + r * 0.32 + sh) + ' ' + f(cy - r * 0.5) +
                  ' C' + f(cx + r * 0.05 + sh) + ' ' + f(cy - r * 0.62) + ' ' + f(cx - r * 0.3 + sh) + ' ' + f(cy - r * 0.42) + ' ' + f(cx - r * 0.48 + sh) + ' ' + f(cy - r * 0.62) +
                  ' C' + f(cx - r * 0.7 + sh) + ' ' + f(cy - r * 0.42) + ' ' + f(cx - r * 0.86) + ' ' + f(cy - r * 0.3) + ' ' + f(cx - r * 0.96) + ' ' + f(cy + r * 0.02) + ' Z',
                  R('hair'), edge('hair'));
        s += '<path d="M' + f(cx - r * 0.5 + sh * 0.4) + ' ' + f(cy - r * 0.95) + ' Q' + f(cx + sh * 0.4) + ' ' + f(cy - r * 1.2) + ' ' + f(cx + r * 0.5 + sh * 0.4) + ' ' + f(cy - r * 1.02) +
             '" fill="none" stroke="' + tone('hair')[0] + '" stroke-width="' + f(r * 0.07) + '" stroke-linecap="round" opacity=".7"/>';
        /* turned away: more hair shows on the trailing side */
        if (Math.abs(sy) > 0.15) {
            const sg = sy > 0 ? -1 : 1, k = Math.abs(sy);
            s += path('M' + f(cx + sg * r * 0.88) + ' ' + f(cy - r * 0.5) +
                      ' Q' + f(cx + sg * r * (0.92 - 0.7 * k)) + ' ' + f(cy - r * 0.05) + ' ' + f(cx + sg * r * 0.82) + ' ' + f(cy + r * 0.4) +
                      ' Q' + f(cx + sg * r * 1.0) + ' ' + f(cy) + ' ' + f(cx + sg * r * 0.88) + ' ' + f(cy - r * 0.5) + ' Z', R('hair'), edge('hair'));
        }
        s += front;

        /* brows and big glossy eyes */
        [-32, 32].forEach(function (a) {
            const v = Vv(a);
            if (v <= 0.12) return;
            const ex = X(a), ey = cy - r * 0.02;
            const w = r * 0.19 * v + r * 0.03, h = r * 0.23;
            s += path('M' + f(ex - w * 1.15) + ' ' + f(ey - h * 1.25) + ' Q' + f(ex) + ' ' + f(ey - h * 1.85) + ' ' + f(ex + w * 1.15) + ' ' + f(ey - h * 1.3) +
                      ' Q' + f(ex) + ' ' + f(ey - h * 1.55) + ' ' + f(ex - w * 1.15) + ' ' + f(ey - h * 1.25) + ' Z', tone('hair')[2]);
            s += ellipse(ex, ey, w, h, R('sclera'), ' stroke="' + tone('skin')[3] + '" stroke-width=".8"');
            const ix = ex + sy * w * 0.25;
            s += ellipse(ix, ey + h * 0.08, w * 0.72, h * 0.66, R('iris'));
            s += ellipse(ix, ey + h * 0.08, w * 0.36, h * 0.34, '#160B05');
            s += circle(ix + w * 0.28, ey - h * 0.28, Math.max(0.9, w * 0.24), '#fff', '');
            s += circle(ix - w * 0.25, ey + h * 0.35, Math.max(0.5, w * 0.11), '#fff', ' opacity=".85"');
            s += '<path d="M' + f(ex - w * 1.05) + ' ' + f(ey - h * 0.2) + ' Q' + f(ex) + ' ' + f(ey - h * 1.22) + ' ' + f(ex + w * 1.05) + ' ' + f(ey - h * 0.2) +
                 '" fill="none" stroke="#3A2416" stroke-width="' + f(Math.max(1.1, r * 0.05)) + '" stroke-linecap="round"/>';
            s += ellipse(X(a * 1.5), cy + r * 0.4, r * 0.2 * v, r * 0.13, R('blush'));
        });
        /* button nose and open, happy smile */
        if (Vv(0) > 0.35) {
            const nx = X(0) + sy * r * 0.05, v0 = Math.max(0.4, Vv(0));
            s += ellipse(nx, cy + r * 0.27, r * 0.14, r * 0.11, R('nose'));
            s += circle(nx - r * 0.04, cy + r * 0.23, r * 0.035, '#fff', ' opacity=".7"');
            const mw = r * 0.3 * v0, my = cy + r * 0.5;
            s += path('M' + f(nx - mw) + ' ' + f(my) + ' Q' + f(nx) + ' ' + f(my + r * 0.04) + ' ' + f(nx + mw) + ' ' + f(my) +
                      ' Q' + f(nx + mw * 0.8) + ' ' + f(my + r * 0.34) + ' ' + f(nx) + ' ' + f(my + r * 0.36) +
                      ' Q' + f(nx - mw * 0.8) + ' ' + f(my + r * 0.34) + ' ' + f(nx - mw) + ' ' + f(my) + ' Z', R('mouth'));
            s += path('M' + f(nx - mw * 0.8) + ' ' + f(my + r * 0.02) + ' Q' + f(nx) + ' ' + f(my + r * 0.06) + ' ' + f(nx + mw * 0.8) + ' ' + f(my + r * 0.02) +
                      ' L' + f(nx + mw * 0.7) + ' ' + f(my + r * 0.1) + ' Q' + f(nx) + ' ' + f(my + r * 0.14) + ' ' + f(nx - mw * 0.7) + ' ' + f(my + r * 0.1) + ' Z', '#FFFFFF');
            s += ellipse(nx, my + r * 0.27, mw * 0.5, r * 0.07, '#E57B7B');
        }
        return s;
    }

    /** Side-facing head, looking to the screen's right. */
    function headSide(cx, cy, r) {
        let s = '';
        s += ellipse(cx - r * 0.12, cy - r * 0.12, r * 0.98, r * 0.98, R('hair'));
        /* face with a round nose and chin on the right */
        s += path('M' + f(cx - r * 0.85) + ' ' + f(cy) +
                  ' C' + f(cx - r * 0.85) + ' ' + f(cy - r * 1.05) + ' ' + f(cx + r * 0.85) + ' ' + f(cy - r * 1.1) + ' ' + f(cx + r * 0.9) + ' ' + f(cy - r * 0.15) +
                  ' Q' + f(cx + r * 0.95) + ' ' + f(cy + r * 0.62) + ' ' + f(cx + r * 0.45) + ' ' + f(cy + r * 0.96) +
                  ' Q' + f(cx - r * 0.2) + ' ' + f(cy + r * 1.08) + ' ' + f(cx - r * 0.6) + ' ' + f(cy + r * 0.72) +
                  ' Q' + f(cx - r * 0.85) + ' ' + f(cy + r * 0.4) + ' ' + f(cx - r * 0.85) + ' ' + f(cy) + ' Z', R('skin'), edge('skin'));
        s += ellipse(cx + r * 0.96, cy + r * 0.22, r * 0.15, r * 0.13, R('nose'));
        /* hair over the top and back */
        s += path('M' + f(cx + r * 0.82) + ' ' + f(cy - r * 0.45) +
                  ' C' + f(cx + r * 0.95) + ' ' + f(cy - r * 1.25) + ' ' + f(cx - r * 0.5) + ' ' + f(cy - r * 1.45) + ' ' + f(cx - r * 1.02) + ' ' + f(cy - r * 0.35) +
                  ' C' + f(cx - r * 1.12) + ' ' + f(cy + r * 0.3) + ' ' + f(cx - r * 0.88) + ' ' + f(cy + r * 0.66) + ' ' + f(cx - r * 0.62) + ' ' + f(cy + r * 0.76) +
                  ' Q' + f(cx - r * 0.42) + ' ' + f(cy + r * 0.2) + ' ' + f(cx - r * 0.05) + ' ' + f(cy - r * 0.25) +
                  ' Q' + f(cx + r * 0.38) + ' ' + f(cy - r * 0.62) + ' ' + f(cx + r * 0.82) + ' ' + f(cy - r * 0.45) + ' Z', R('hair'), edge('hair'));
        s += '<path d="M' + f(cx - r * 0.55) + ' ' + f(cy - r * 0.78) + ' Q' + f(cx - r * 0.05) + ' ' + f(cy - r * 1.18) + ' ' + f(cx + r * 0.45) + ' ' + f(cy - r * 0.95) +
             '" fill="none" stroke="' + tone('hair')[0] + '" stroke-width="' + f(r * 0.07) + '" stroke-linecap="round" opacity=".7"/>';
        /* ear */
        s += ellipse(cx - r * 0.1, cy + r * 0.12, r * 0.19, r * 0.26, R('skin'), edge('skin'));
        s += ellipse(cx - r * 0.08, cy + r * 0.14, r * 0.09, r * 0.15, tone('skin')[2], ' opacity=".55"');
        /* brow, eye, cheek, smile */
        const ex = cx + r * 0.58, ey = cy - r * 0.02;
        s += path('M' + f(ex - r * 0.2) + ' ' + f(ey - r * 0.27) + ' Q' + f(ex) + ' ' + f(ey - r * 0.42) + ' ' + f(ex + r * 0.2) + ' ' + f(ey - r * 0.3) +
                  ' Q' + f(ex) + ' ' + f(ey - r * 0.34) + ' ' + f(ex - r * 0.2) + ' ' + f(ey - r * 0.27) + ' Z', tone('hair')[2]);
        s += ellipse(ex, ey, r * 0.13, r * 0.21, R('sclera'));
        s += ellipse(ex + r * 0.05, ey + r * 0.02, r * 0.085, r * 0.15, R('iris'));
        s += ellipse(ex + r * 0.07, ey + r * 0.02, r * 0.045, r * 0.08, '#160B05');
        s += circle(ex + r * 0.09, ey - r * 0.06, r * 0.035, '#fff', '');
        s += '<path d="M' + f(ex - r * 0.12) + ' ' + f(ey - r * 0.08) + ' Q' + f(ex) + ' ' + f(ey - r * 0.26) + ' ' + f(ex + r * 0.13) + ' ' + f(ey - r * 0.1) +
             '" fill="none" stroke="#3A2416" stroke-width="' + f(Math.max(1, r * 0.05)) + '" stroke-linecap="round"/>';
        s += ellipse(cx + r * 0.42, cy + r * 0.42, r * 0.2, r * 0.13, R('blush'));
        s += path('M' + f(cx + r * 0.52) + ' ' + f(cy + r * 0.55) + ' Q' + f(cx + r * 0.72) + ' ' + f(cy + r * 0.62) + ' ' + f(cx + r * 0.86) + ' ' + f(cy + r * 0.5) +
                  ' Q' + f(cx + r * 0.78) + ' ' + f(cy + r * 0.78) + ' ' + f(cx + r * 0.58) + ' ' + f(cy + r * 0.66) + ' Z', R('mouth'));
        return s;
    }

    /* ======================================================================
     *  ARMS AND LEGS
     * ==================================================================== */

    /**
     * Arm from the shoulder: upper arm along `ua`, forearm along `fa`.
     * Short T-shirt sleeve with a coloured cuff, rounded elbow, real hand.
     */
    function arm(sh, ua, fa, who, far, opts) {
        opts = opts || {};
        const skin = far ? 'skinFar' : 'skin';
        const el = at(sh.x, sh.y, opts.upper || 30, ua);
        const wr = at(el.x, el.y, opts.fore || 26, fa);
        let s = '';
        s += cyl(sh, el, 11, 9.4, skin);
        s += joint(el, 9.4, skin);
        s += cyl(el, wr, 9.2, 7.2, skin);
        s += hand(wr, fa, opts.hand || 0.9, skin, opts.grip || 0, opts.mirror);
        /* sleeve */
        const sl = at(sh.x, sh.y, 14, ua);
        s += cyl(at(sh.x, sh.y, -2, ua), sl, 17, 15.5, far ? shirtFar(who) : shirtOf(who));
        s += band(at(sh.x, sh.y, 11, ua), at(sh.x, sh.y, 15.5, ua), 15.8, trimOf(who));
        return s;
    }

    /** Leg seen from the side: shorts to above the knee, bare shin, sock, shoe. */
    function legSide(hip, knee, ankle, far) {
        const skin = far ? 'skinFar' : 'skin';
        const shorts = far ? 'shortsFar' : 'shorts';
        let s = '';
        s += cyl(lerp(hip, knee, 0.55), knee, 12.5, 11, skin);
        s += joint(knee, 11, skin);
        s += cyl(knee, ankle, 10.6, 7.6, skin);
        s += cyl(lerp(knee, ankle, 0.72), ankle, 9.4, 8.6, 'sock');
        s += shoe(ankle.x, ankle.y, far);
        s += cyl(hip, lerp(hip, knee, 0.66), 16.5, 15, shorts);
        return s;
    }

    function shoe(x, y, far) {
        const t = far ? 'shortsFar' : 'shoe';
        return path('M' + f(x - 7) + ' ' + f(y - 4) +
                    ' Q' + f(x - 9) + ' ' + f(y + 6) + ' ' + f(x - 2) + ' ' + f(y + 7) +
                    ' L' + f(x + 20) + ' ' + f(y + 7) + ' Q' + f(x + 26) + ' ' + f(y + 6) + ' ' + f(x + 24) + ' ' + f(y) +
                    ' Q' + f(x + 20) + ' ' + f(y - 4) + ' ' + f(x + 9) + ' ' + f(y - 5) +
                    ' L' + f(x + 3) + ' ' + f(y - 7) + ' Z', R(far ? 'shoe' : t), edge('shoe')) +
               path('M' + f(x - 8) + ' ' + f(y + 4.5) + ' L' + f(x + 25) + ' ' + f(y + 4.5) + ' Q' + f(x + 25) + ' ' + f(y + 8) + ' ' + f(x + 20) + ' ' + f(y + 8) +
                    ' L' + f(x - 3) + ' ' + f(y + 8) + ' Q' + f(x - 8) + ' ' + f(y + 8) + ' ' + f(x - 8) + ' ' + f(y + 4.5) + ' Z', '#3B2212');
    }

    /* ======================================================================
     *  TORSOS
     * ==================================================================== */

    /** Bust, front view (neck exercises): T-shirt with collar ring and sleeves. */
    function bustFront(who) {
        let s = '';
        s += cyl({ x: 46, y: 160 }, { x: 40, y: 216 }, 26, 24, shirtOf(who));
        s += cyl({ x: 154, y: 160 }, { x: 160, y: 216 }, 26, 24, shirtOf(who));
        s += path('M40 216 L42 172 Q46 147 74 143 L126 143 Q154 147 158 172 L160 216 Z', R(shirtOf(who)), edge(shirtOf(who)));
        s += path('M84 143 Q100 158 116 143', 'none', ' stroke="' + tone(trimOf(who))[1] + '" stroke-width="5" stroke-linecap="round"');
        s += path('M60 160 Q66 190 64 216', 'none', ' stroke="' + tone(shirtOf(who))[2] + '" stroke-width="1.6" opacity=".6"');
        s += path('M140 160 Q134 190 136 216', 'none', ' stroke="' + tone(shirtOf(who))[2] + '" stroke-width="1.6" opacity=".6"');
        return s;
    }

    /** Bust, side view (neck flexion). */
    function bustSide(who) {
        let s = '';
        s += path('M68 216 L70 170 Q72 142 100 139 Q130 141 134 168 L138 216 Z', R(shirtOf(who)), edge(shirtOf(who)));
        s += cyl({ x: 103, y: 152 }, { x: 101, y: 186 }, 22, 20, shirtFar(who));
        s += band({ x: 101, y: 182 }, { x: 101, y: 188 }, 20.5, trimOf(who));
        s += cyl({ x: 101, y: 188 }, { x: 100, y: 222 }, 12, 10, 'skin');
        s += path('M88 141 Q100 150 114 141', 'none', ' stroke="' + tone(trimOf(who))[1] + '" stroke-width="4.5" stroke-linecap="round"');
        return s;
    }

    function upperFront(who) {
        let s = '';
        /* shorts and the tops of the legs */
        s += cyl({ x: 88, y: 176 }, { x: 86, y: 222 }, 15, 13, 'skin');
        s += cyl({ x: 112, y: 176 }, { x: 114, y: 222 }, 15, 13, 'skin');
        s += path('M74 148 L126 148 L131 190 L104 192 L100 170 L96 192 L69 190 Z', R('shorts'), edge('shorts'));
        /* neck */
        s += cyl({ x: 100, y: 56 }, { x: 100, y: 80 }, 13, 14, 'skin');
        s += ellipse(100, 66, 7, 3, tone('skin')[2], ' opacity=".5"');
        /* T-shirt */
        s += path('M70 94 Q70 77 88 75 L112 75 Q130 77 130 94 L127 152 Q100 156 73 152 Z', R(shirtOf(who)), edge(shirtOf(who)));
        s += path('M73 148 Q100 153 127 148 L127 153 Q100 158 73 153 Z', tone(trimOf(who))[1]);
        s += path('M90 75.5 Q100 86 110 75.5', 'none', ' stroke="' + tone(trimOf(who))[1] + '" stroke-width="4" stroke-linecap="round"');
        s += path('M84 100 Q86 128 82 150 M116 100 Q114 128 118 150', 'none', ' stroke="' + tone(shirtOf(who))[2] + '" stroke-width="1.4" opacity=".55"');
        return s;
    }

    function upperSide(who) {
        let s = '';
        s += cyl({ x: 98, y: 178 }, { x: 98, y: 222 }, 16, 13, 'skin');
        s += path('M84 148 L118 148 L118 192 L84 192 Z', R('shorts'), edge('shorts'));
        s += cyl({ x: 98, y: 54 }, { x: 99, y: 80 }, 13, 14, 'skin');
        s += path('M83 94 Q83 75 100 74 Q119 76 119 96 L118 152 Q100 155 82 152 Z', R(shirtOf(who)), edge(shirtOf(who)));
        s += path('M82 148 Q100 151 118 148 L118 153 Q100 156 82 153 Z', tone(trimOf(who))[1]);
        s += path('M92 75 Q104 82 114 76', 'none', ' stroke="' + tone(trimOf(who))[1] + '" stroke-width="3.6" stroke-linecap="round"');
        return s;
    }

    /* ======================================================================
     *  RIGS — one per exercise
     *  Each returns { body: svg string, mark: {...} } for an angle `th` in the
     *  exercise's own units and a direction.
     *  mark.kind:
     *    'arc'    joint at (x, y), reference angle a0, angle grows by sign·th
     *    'dial'   top view of the head (rotation)
     *    'gauge'  ring meter (finger closure)
     * ==================================================================== */

    /* ----------------------------------------------------------------------
     *  SQUAT GEOMETRY  (v17.6)
     *  One place that decides how the body is arranged for a knee angle th,
     *  used by the 2D figure, its knee marks and the 3D avatar alike.
     *    knee   exactly th (thigh and shin directions differ by th)
     *    shin   leans forward 0.28·th (heels stay flat on the floor)
     *    thigh  the rest of th: the hips sit back and, in a full squat,
     *           drop below the knees
     *    trunk  leans only as far as keeps the shoulders over the mid-foot,
     *           so the figure is balanced instead of tipping forward
     *    arms   reach straight forward for balance, up to shoulder height
     *  All angles in degrees from vertical, forward = +.
     * -------------------------------------------------------------------- */
    const SQ = { shin: 38, thigh: 38, trunk: 42 };          // 2D segment lengths
    function squatGeometry(th) {
        th = Math.max(0, th || 0);
        const shin = 0.28 * th;
        const thigh = th - shin;
        const hipX = SQ.shin * Math.sin(rad(shin)) - SQ.thigh * Math.sin(rad(thigh));
        const over = Math.min(5, 0.06 * th);                 // shoulders over the mid-foot
        const trunk = clamp(Math.asin(clamp((over - hipX) / SQ.trunk, -1, 1)) * 180 / Math.PI, 0, 50);
        return { knee: th, shin: shin, thigh: thigh, trunk: trunk, head: 0.5 * trunk, arm: Math.min(90, 8 + 0.85 * th) };
    }

    const RIGS = {

        /* ---- side view: head tips forward (flexion) or back (extension) ---- */
        neck_flexion: function (th, dir, who) {
            const d = dir === 'extension' ? -th : th;          // SVG rotate: + = forward
            const g = 'transform="rotate(' + f(d) + ' 100 146)"';
            let s = '';
            s += '<g ' + g + '>' + cyl({ x: 100, y: 150 }, { x: 102, y: 108 }, 18, 16, 'skin') + '</g>';
            s += bustSide(who);
            s += '<g ' + g + '>' + headSide(102, 94, 30) + '</g>';
            return { body: s, mark: { kind: 'arc', x: 100, y: 146, r: 94, inner: 80, a0: 180, sign: dir === 'extension' ? 1 : -1 } };
        },

        /* ---- front view: head turns; the dial above shows it from the top ---- */
        neck_rotation: function (th, dir, who) {
            const yaw = dir === 'left' ? -th : th;
            let s = '';
            s += cyl({ x: 100, y: 154 }, { x: 100, y: 118 }, 22, 20, 'skin');
            s += ellipse(100 + Math.sin(rad(yaw)) * 3, 134, 10, 3.5, tone('skin')[2], ' opacity=".45"');
            s += bustFront(who);
            s += headFront(100, 106, 30, yaw);
            return { body: s, mark: { kind: 'dial', x: 100, y: 36, r: 23, a0: 0, sign: dir === 'left' ? -1 : 1 } };
        },

        /* ---- front view: ear toward shoulder ---- */
        neck_lateral_flexion: function (th, dir, who) {
            const d = dir === 'left' ? -th : th;                 // SVG rotate: - = toward screen left
            const g = 'transform="rotate(' + f(d) + ' 100 150)"';
            let s = '';
            s += '<g ' + g + '>' + cyl({ x: 100, y: 156 }, { x: 100, y: 112 }, 22, 20, 'skin') + '</g>';
            s += bustFront(who);
            s += '<g ' + g + '>' + headFront(100, 100, 30, 0) + '</g>';
            return { body: s, mark: { kind: 'arc', x: 100, y: 150, r: 96, inner: 82, a0: 180, sign: dir === 'left' ? 1 : -1 } };
        },

        /* ---- front view, head to hips: both arms out to the side ---- */
        shoulder_abduction: function (th, dir, who) {
            const vis = th + 7 * Math.max(0, 1 - th / 30);
            let s = upperFront(who);
            [-1, 1].forEach(function (side) {
                const sh = { x: 100 + side * 25, y: 84 };
                const a = side * vis;
                s += arm(sh, a, a + side * 4, who, false, { mirror: side < 0 });
            });
            s += headFront(100, 33, 25, 0);
            return { body: s, mark: { kind: 'arc', x: 125, y: 84, r: 36, a0: 0, sign: 1 } };
        },

        /* ---- side view, head to hips: arms straight forward ---- */
        shoulder_flexion: function (th, dir, who) {
            let s = '';
            s += arm({ x: 96, y: 84 }, th, th + 4, who, true);
            s += upperSide(who);
            s += arm({ x: 100, y: 86 }, th, th + 4, who, false);
            s += headSide(99, 33, 25);
            return { body: s, mark: { kind: 'arc', x: 100, y: 86, r: 38, a0: 0, sign: 1 } };
        },

        /* ---- side view: upper arm by the side, forearm bends up ---- */
        elbow_flexion: function (th, dir, who) {
            let s = '';
            s += arm({ x: 96, y: 84 }, 0, th, who, true, { grip: 0.6 });
            s += upperSide(who);
            s += arm({ x: 100, y: 86 }, 0, th, who, false, { grip: 0.6 });
            s += headSide(99, 33, 25);
            return { body: s, mark: { kind: 'arc', x: 100, y: 116, r: 24, a0: 0, sign: 1 } };
        },

        /* ---- side view, whole body ---- */
        squat: function (th, dir, who) {
            /* v17.6: balanced squat — see squatGeometry() */
            const g = squatGeometry(th);
            const ankle = { x: 94, y: 180 };
            const shinDir = 180 - g.shin;
            const thighDir = shinDir + th;               // knee angle is exactly th
            const knee = at(ankle.x, ankle.y, SQ.shin, shinDir);
            const hip = at(knee.x, knee.y, SQ.thigh, thighDir);
            const tDir = 180 - g.trunk;
            const shoulder = at(hip.x, hip.y, SQ.trunk, tDir);
            const head = at(shoulder.x, shoulder.y, 25, 180 - g.head);
            const armA = g.arm;
            const off = -5;
            let s = '';
            s += softShadow(ankle.x + 8, 189, 34, 5);
            /* far leg and arm */
            s += legSide({ x: hip.x + off, y: hip.y }, { x: knee.x + off, y: knee.y }, { x: ankle.x + off, y: ankle.y }, true);
            s += arm({ x: shoulder.x - 3, y: shoulder.y }, armA, armA + 6, who, true, { upper: 23, fore: 21, hand: 0.75 });
            /* near leg */
            s += legSide(hip, knee, ankle, false);
            /* torso: a rounded block from hip to shoulder */
            s += cyl(hip, shoulder, 27, 25, shirtOf(who));
            s += band(at(hip.x, hip.y, 1, tDir), at(hip.x, hip.y, 6, tDir), 27, trimOf(who));
            s += cyl(shoulder, at(head.x, head.y, 9, 0), 11, 11, 'skin');
            s += headSide(head.x, head.y, 18);
            s += arm(shoulder, armA, armA + 6, who, false, { upper: 23, fore: 21, hand: 0.75 });
            return { body: s, mark: { kind: 'arc', x: knee.x, y: knee.y, r: 22, a0: thighDir - 180, sign: -1, refLen: 26 } };
        },

        /* ---- forearm resting on a table, hand bending up / down ---- */
        wrist_flexion: function (th, dir, who) {
            const d = dir === 'extension' ? th : -th;            // SVG rotate: - = up
            let s = '';
            s += path('M-6 124 L114 124 Q120 124 120 130 L120 134 Q120 139 114 139 L-6 139 Z', V('table'), edge('table'));
            s += path('M10 139 L22 139 L22 210 L10 210 Z', V('table'), edge('table'));
            s += softShadow(70, 125, 50, 4);
            s += cyl({ x: 10, y: 112 }, { x: 118, y: 112 }, 22, 17, 'skin');
            s += cyl({ x: -14, y: 112 }, { x: 38, y: 112 }, 28, 27, shirtOf(who));
            s += band({ x: 34, y: 112 }, { x: 40, y: 112 }, 27.5, trimOf(who));
            /* the hand, seen from the side, palm up */
            const k = 1;
            s += '<g transform="rotate(' + f(d) + ' 118 112)">' +
                    path('M112 102 Q132 98 150 101 Q157 103 157 110 L157 116 Q157 123 149 123 L112 123 Z', R('skin'), edge('skin')) +
                    cyl({ x: 152, y: 105.5 }, { x: 183, y: 106.5 }, 7.5 * k, 6.4 * k, 'skinFar') +
                    cyl({ x: 152, y: 112 }, { x: 186, y: 112.5 }, 8 * k, 6.8 * k, 'skin') +
                    cyl({ x: 151, y: 118 }, { x: 181, y: 118.5 }, 7.6 * k, 6.4 * k, 'skin') +
                    cyl({ x: 126, y: 102 }, { x: 145, y: 94 }, 8, 6.6, 'skin') +
                 '</g>';
            return { body: s, mark: { kind: 'arc', x: 118, y: 112, r: 44, a0: 90, sign: dir === 'extension' ? -1 : 1 } };
        },

        /* ---- one hand, palm to the camera: fingers curl into a fist ---- */
        finger_flexion: function (th, dir, who) {
            const c = clamp(th / 100, 0, 1);
            let s = '';
            s += cyl({ x: 100, y: 230 }, { x: 100, y: 168 }, 36, 38, 'skin');
            s += cyl({ x: 100, y: 236 }, { x: 100, y: 200 }, 46, 46, shirtOf(who));
            s += band({ x: 100, y: 203 }, { x: 100, y: 197 }, 46, trimOf(who));
            const fingers = [{ x: 78, L: 40 }, { x: 93, L: 47 }, { x: 108, L: 45 }, { x: 122, L: 36 }];
            let up = '', folded = '';
            fingers.forEach(function (fg) {
                const vis = fg.L * (1 - c * 0.95);
                const w = fg.x === 122 ? 12 : 13.5;
                if (vis > 3) {
                    up += cyl({ x: fg.x, y: 112 }, { x: fg.x + (fg.x - 100) * 0.05, y: 108 - vis }, w, w - 1.6, 'skin');
                    if (vis > 18) up += path('M' + f(fg.x - 3.5) + ' ' + f(108 - vis * 0.45) + ' q3.5 1.6 7 0', 'none', ' stroke="' + tone('skin')[2] + '" stroke-width="1.2" opacity=".7"');
                }
                if (c > 0.08) {
                    const fold = fg.L * 0.55 * c;
                    folded += cyl({ x: fg.x, y: 101 }, { x: fg.x, y: 101 + fold }, w, w - 1, 'skinFar');
                    if (c > 0.55) folded += ellipse(fg.x, 101 + fold - 3, 3.6, 2.6, '#FCE8DA', ' stroke="' + tone('skin')[3] + '" stroke-width=".8"');
                }
            });
            s += up;
            s += path('M68 112 Q67 100 78 100 L122 100 Q133 100 133 112 L134 158 Q133 182 110 183 L90 183 Q67 182 66 158 Z', R('skin'), edge('skin'));
            s += path('M76 144 Q99 155 124 138 M84 163 Q99 170 114 163', 'none', ' stroke="' + tone('skin')[2] + '" stroke-width="1.6" stroke-linecap="round" opacity=".8"');
            s += folded;
            /* thumb: from the side of the palm, sweeping across as the hand closes */
            const tA = 222 - 102 * c;
            const tb = { x: 72, y: 152 };
            const tm = at(tb.x, tb.y, 20, tA), tt = at(tm.x, tm.y, 16, tA - 25 * c - 10);
            s += cyl(tb, tm, 15, 13, 'skin') + joint(tm, 13, 'skin') + cyl(tm, tt, 13, 11, 'skin');
            return { body: s, mark: { kind: 'gauge', x: 166, y: 44, r: 21 } };
        }
    };

    /* ----------------------------------------------------------------------
     *  v17.8 GEOMETRY shared by the 2D figure, its marks and the 3D avatar
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

    /* ---- small 2D pieces for the new views ---- */
    function plank(x1, y1, x2, y2) {
        return path('M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y1 + ' L' + x2 + ' ' + y2 + ' L' + x1 + ' ' + y2 + ' Z', V('table'), edge('table'));
    }
    /** Standing figure seen from the side, from the hip up (side head on top). */
    function sideUpper(hip, lean, who, headLean) {
        const sh = at(hip.x, hip.y, 46, 180 - lean);
        let s = cyl(hip, sh, 26, 24, shirtOf(who));
        s += band(at(hip.x, hip.y, 1, 180 - lean), at(hip.x, hip.y, 7, 180 - lean), 26, trimOf(who));
        const hd = at(sh.x, sh.y, 24, 180 - (headLean === undefined ? lean * 0.5 : headLean));
        s += cyl(sh, at(hd.x, hd.y, 9, 0), 11, 11, 'skin');
        s += headSide(hd.x, hd.y, 17);
        return { svg: s, shoulder: sh };
    }

    /** v18: front torso (tee) whose shoulder line turns by `turn` degrees. */
    function frontTorso(cx, shY, who, turn) {
        const c = Math.cos(rad(turn || 0)), w = 30 * c + 4, sh = Math.sin(rad(turn || 0)) * 4;
        let s = path('M' + f(cx - w) + ' ' + f(shY + 12 - sh) + ' Q' + f(cx - w) + ' ' + f(shY - 3 - sh) + ' ' + f(cx - w + 14) + ' ' + f(shY - 5) +
                     ' L' + f(cx + w - 14) + ' ' + f(shY - 5) + ' Q' + f(cx + w) + ' ' + f(shY - 3 + sh) + ' ' + f(cx + w) + ' ' + f(shY + 12 + sh) +
                     ' L' + f(cx + w - 4) + ' ' + f(shY + 64) + ' Q' + f(cx) + ' ' + f(shY + 68) + ' ' + f(cx - w + 4) + ' ' + f(shY + 64) + ' Z',
                     R(shirtOf(who)), edge(shirtOf(who)));
        s += cyl({ x: cx, y: shY - 18 }, { x: cx, y: shY - 4 }, 12, 13, 'skin');
        return s;
    }
    /** v18: front view, elbows at the sides, forearms turned out by aL / aR (screen right / left arm). */
    function frontER(aL, aR, who, stick) {
        const k = 0.5, L = 46;
        const eL = { x: 132, y: 110 }, eR = { x: 68, y: 110 };
        const wL = { x: eL.x + Math.sin(rad(aL)) * L, y: eL.y + Math.cos(rad(aL)) * L * k };
        const wR = { x: eR.x - Math.sin(rad(aR)) * L, y: eR.y + Math.cos(rad(aR)) * L * k };
        let s = frontTorso(100, 72, who, 0);
        s += cyl({ x: 132, y: 72 }, eL, 14, 12, 'skin') + cyl({ x: 68, y: 72 }, eR, 14, 12, 'skin');
        s += cyl(eL, wL, 11, 9, 'skin') + hand(wL, angOf(eL, wL), 0.85, 'skin', 0.4, false);
        s += cyl(eR, wR, 11, 9, 'skin') + hand(wR, angOf(eR, wR), 0.85, 'skin', 0.4, true);
        if (stick) {
            const ux = wL.x - wR.x, uy = wL.y - wR.y, ul = Math.hypot(ux, uy) || 1;
            s += seg({ x: wR.x - ux / ul * 14 + 2, y: wR.y - uy / ul * 14 + 6 }, { x: wL.x + ux / ul * 14 + 2, y: wL.y + uy / ul * 14 + 6 }, 5, '#8A6B47');
        }
        s += headFront(100, 36, 21, 0);
        return s;
    }

    const NEW_RIGS = {

        /* ---- front view (camera slightly above): elbows at the sides,
                forearms turn outward; the flat goniometer is an ellipse ---- */
        shoulder_external_rotation: function (th, dir, who) {
            return { body: frontER(th, -th, who, false), mark: { kind: 'hz', x: 132, y: 110, r: 44, k: 0.5, a0: 0, sign: 1 } };
        },

        /* ---- same, a stick held in both hands guides the affected arm ---- */
        external_rotation_stick: function (th, dir, who) {
            return { body: frontER(th, 0.6 * th, who, true), mark: { kind: 'hz', x: 132, y: 110, r: 44, k: 0.5, a0: 0, sign: 1 } };
        },

        /* ---- side view, leaning on a table, the hanging arm swings ---- */
        pendulum: function (th, dir, who) {
            const g = dir === 'back' ? -th : th;
            const S = { x: 112, y: 96 };
            const hip = at(S.x, S.y, 50, -68);
            const knee = at(hip.x, hip.y, 36, 14), ankle = at(knee.x, knee.y, 36, -8);
            let s = softShadow(ankle.x + 6, 190, 30, 4);
            s += plank(126, 150, 200, 158);
            s += arm({ x: S.x - 3, y: S.y - 2 }, 55, 60, who, true, { upper: 27, fore: 24, hand: 0.8 });
            s += legSide(hip, knee, ankle, false);
            s += cyl(hip, S, 26, 24, shirtOf(who));
            const hd = at(S.x, S.y, 24, 125);
            s += '<g transform="rotate(35 ' + f(hd.x) + ' ' + f(hd.y) + ')">' + headSide(hd.x, hd.y, 16) + '</g>';
            s += arm(S, g, g, who, false, { upper: 30, fore: 27, hand: 0.85 });
            return { body: s, mark: { kind: 'arc', x: S.x, y: S.y, r: 38, a0: 0, sign: dir === 'back' ? -1 : 1 } };
        },

        /* ---- side view, lying on the back: both hands raise the arm overhead ---- */
        assisted_shoulder_flexion: function (th, dir, who) {
            const S = { x: 70, y: 128 };
            let s = path('M0 141 L200 141 L200 149 L0 149 Z', '#B9C7D6', ' opacity=".9"');
            const hip = { x: 124, y: 130 }, knee = { x: 146, y: 98 }, ankle = { x: 172, y: 130 };
            s += legSide(hip, knee, ankle, false);
            s += cyl(S, hip, 25, 26, shirtOf(who));
            s += '<g transform="rotate(-90 44 128)">' + headSide(44, 128, 16) + '</g>';
            s += arm(S, 90 + th, 92 + th, who, false, { upper: 30, fore: 26, hand: 0.85, grip: 0.4 });
            return { body: s, mark: { kind: 'arc', x: S.x, y: S.y, r: 36, a0: 90, sign: 1 } };
        },

        /* ---- side view, facing a wall: the fingers walk up it ---- */
        finger_walk: function (th, dir, who) {
            const g = fingerWalkGeometry(th, { a: 30, f: 26, h: 15, wall: 48 });
            let s = path('M148 0 L200 0 L200 200 L148 200 Z', '#E8E1D6', ' stroke="#CFC5B6" stroke-width="1.2"');
            s += arm({ x: 96, y: 84 }, 0, 6, who, true);
            s += upperSide(who);
            s += arm({ x: 100, y: 86 }, g.upper, g.upper + g.elbow, who, false);
            s += headSide(99, 33, 25);
            return { body: s, mark: { kind: 'arc', x: 100, y: 86, r: 38, a0: 0, sign: 1 } };
        },

        /* ---- side view, seated at a table: the hand slides forward ---- */
        table_slide: function (th, dir, who) {
            const L = { a: 30, f: 26, trunk: 52 };
            const g = tableSlideGeometry(th, L);
            const hip = { x: 50, y: 150 };
            const S = at(hip.x, hip.y, L.trunk, 180 - g.lean);
            const tableY = hip.y - (L.trunk - L.a);
            let s = plank(60, tableY + 5, 210, tableY + 12);
            s += plank(30, 154, 66, 160);                                       // stool
            s += legSide(hip, { x: hip.x + 36, y: hip.y }, { x: hip.x + 36, y: hip.y + 34 }, false);
            s += cyl(hip, S, 25, 24, shirtOf(who));
            const hd = at(S.x, S.y, 23, 180 - g.lean * 0.6);
            s += cyl(S, at(hd.x, hd.y, 9, 0), 11, 11, 'skin') + headSide(hd.x, hd.y, 17);
            const el = at(S.x, S.y, L.a, g.upper);
            const wr = at(el.x, el.y, L.f, g.upper + g.elbow);
            s += path('M' + f(wr.x - 6) + ' ' + f(tableY + 1) + ' L' + f(wr.x + 22) + ' ' + f(tableY + 1) + ' L' + f(wr.x + 22) + ' ' + f(tableY + 5) +
                      ' L' + f(wr.x - 6) + ' ' + f(tableY + 5) + ' Z', '#F4F6F8', ' stroke="#C9D2DC" stroke-width=".8"');   // towel
            s += arm(S, g.upper, g.upper + g.elbow, who, false, { upper: L.a, fore: L.f, hand: 0.85 });
            return { body: s, mark: { kind: 'arc', x: S.x, y: S.y, r: 30, a0: -g.lean, sign: 1 } };   // trunk line → upper arm
        },

        /* ---- front view (camera slightly above): the arm is drawn across
                the chest at shoulder height ---- */
        cross_body_stretch: function (th, dir, who) {
            const up = clamp(th / 12, 0, 1);
            const S = { x: 129, y: 75 }, L = 100;
            const hang = { x: S.x + 2, y: S.y + L * 0.86 };
            const across = { x: S.x - L * Math.sin(rad(th)), y: S.y + 0.5 * L * Math.cos(rad(th)) };
            const W = lerp(hang, across, up), El = lerp(S, W, 0.52);
            let s = frontTorso(100, 75, who, 0);
            s += cyl({ x: 71, y: 75 }, { x: 74, y: 112 }, 13, 11, 'skin');                 // the helping arm
            s += cyl({ x: 74, y: 112 }, lerp({ x: 74, y: 112 }, El, up), 10, 9, 'skin');
            s += cyl(S, El, 13, 11, 'skin') + cyl(El, W, 10, 8, 'skin') + hand(W, angOf(El, W), 0.85, 'skin', 0.2, false);
            s += headFront(100, 36, 21, 0);
            return { body: s, mark: { kind: 'hz', x: S.x, y: S.y, r: 60, k: 0.5, a0: 0, sign: -1 } };
        },

        /* ---- side view: elbows draw back as the shoulder blades squeeze ---- */
        scapular_squeeze: function (th, dir, who) {
            const ext = 0.3 * clamp(th, 0, 100);
            let s = arm({ x: 96, y: 84 }, -ext, 90 - ext, who, true, { grip: 0.5 });
            s += upperSide(who);
            s += arm({ x: 100, y: 86 }, -ext, 90 - ext, who, false, { grip: 0.5 });
            s += headSide(99, 33, 25);
            return { body: s, mark: { kind: 'gauge', x: 166, y: 44, r: 21 } };
        },

        /* ---- front view (camera slightly above): the shoulders turn, the
                hips stay facing forward ---- */
        trunk_rotation: function (th, dir, who) {
            const a = dir === 'left' ? -th : th;
            let s = path('M76 128 L124 128 L127 168 L102 170 L100 156 L98 170 L73 168 Z', R('shorts'), edge('shorts'));
            s += frontTorso(100, 66, who, a);
            const c = Math.cos(rad(a)), sx = Math.sin(rad(a));
            s += path('M' + f(100 - 30 * c) + ' ' + f(100 + 6 * sx) + ' Q100 ' + f(110) + ' ' + f(100 + 30 * c) + ' ' + f(100 - 6 * sx) +
                      ' L' + f(100 + 30 * c) + ' ' + f(108 - 6 * sx) + ' Q100 118 ' + f(100 - 30 * c) + ' ' + f(108 + 6 * sx) + ' Z', R('skin'), edge('skin'));
            s += headFront(100 + 6 * sx, 34, 21, a);
            return { body: s, mark: { kind: 'hz', x: 100, y: 118, r: 72, k: 0.5, a0: 0, sign: dir === 'left' ? -1 : 1 } };
        },

        /* ---- front view, whole body: one straight leg out to the side ---- */
        hip_abduction: function (th, dir, who) {
            const H = { x: 109, y: 100 }, Hr = { x: 91, y: 100 };
            let s = softShadow(100, 190, 40, 5);
            s += path('M44 112 L50 112 L50 190 L44 190 Z', '#9AA6B2') + path('M38 108 L58 108 L58 114 L38 114 Z', '#9AA6B2');  // support
            const k1 = at(Hr.x, Hr.y, 42, 0), a1 = at(k1.x, k1.y, 42, 0);
            s += cyl(Hr, k1, 15, 12, 'skin') + cyl(k1, a1, 11, 8, 'skin') + ellipse(a1.x, a1.y + 4, 9, 5, R('shoe'));
            const k2 = at(H.x, H.y, 42, th), a2 = at(k2.x, k2.y, 42, th);
            s += cyl(H, k2, 15, 12, 'skin') + cyl(k2, a2, 11, 8, 'skin') + ellipse(a2.x, a2.y + 4, 9, 5, R('shoe'));
            s += path('M80 72 L120 72 L123 104 L101 106 L100 96 L99 106 L77 104 Z', R('shorts'), edge('shorts'));
            s += path('M78 74 Q78 30 100 28 Q122 30 122 74 Z', R(shirtOf(who)), edge(shirtOf(who)));
            s += arm({ x: 80, y: 34 }, -22, -14, who, false, { upper: 26, fore: 24, mirror: true, hand: 0.8 });
            s += arm({ x: 120, y: 34 }, 10, 12, who, false, { upper: 26, fore: 24, hand: 0.8 });
            s += headFront(100, 14, 13, 0);
            return { body: s, mark: { kind: 'arc', x: H.x, y: H.y, r: 40, a0: 0, sign: 1, refLen: 52 } };
        },

        /* ---- side view, whole body: one knee lifts toward the waist ---- */
        standing_march: function (th, dir, who) {
            const H = { x: 95, y: 100 }, k = clamp(th / 90, 0, 1);
            const near = dir !== 'left';
            const lift = function () { const kn = at(H.x, H.y, 40, th); return { k: kn, a: at(kn.x, kn.y, 40, th - Math.min(125, th)) }; };
            const stand = { k: at(H.x, H.y, 40, 0), a: at(H.x, H.y, 80, 0) };
            const fl = near ? stand : lift(), nl = near ? lift() : stand;
            let s = softShadow(H.x + 6, 190, 30, 4);
            s += legSide({ x: H.x - 4, y: H.y }, { x: fl.k.x - 4, y: fl.k.y }, { x: fl.a.x - 4, y: fl.a.y }, true);
            s += arm({ x: 93, y: 56 }, near ? 25 * k : -12 * k, near ? 25 * k + 40 * k : -12 * k, who, true, { upper: 23, fore: 21, hand: 0.75 });
            s += legSide(H, nl.k, nl.a, false);
            const up = sideUpper(H, 0, who, 0);
            s += up.svg;
            s += arm(up.shoulder, near ? -12 * k : 25 * k, near ? -12 * k : 25 * k + 40 * k, who, false, { upper: 23, fore: 21, hand: 0.75 });
            return { body: s, mark: { kind: 'arc', x: H.x, y: H.y, r: 30, a0: 0, sign: 1, refLen: 40 } };
        },

        /* ---- side view, whole body: heel toward the buttock ---- */
        standing_knee_flexion: function (th, dir, who) {
            const H = { x: 95, y: 104 }, K = { x: 95, y: 145 };
            const near = dir !== 'left';
            const bent = at(K.x, K.y, 40, -th);
            let s = softShadow(H.x + 6, 190, 30, 4);
            s += path('M150 112 L156 112 L156 190 L150 190 Z', '#9AA6B2') + path('M142 108 L164 108 L164 114 L142 114 Z', '#9AA6B2');
            s += legSide({ x: H.x - 4, y: H.y }, { x: K.x - 4, y: K.y }, near ? { x: K.x - 4, y: K.y + 40 } : { x: bent.x - 4, y: bent.y }, true);
            s += arm({ x: 93, y: 60 }, 45, 75, who, true, { upper: 25, fore: 23, hand: 0.75 });
            s += legSide(H, K, near ? bent : { x: K.x, y: K.y + 40 }, false);
            const up = sideUpper(H, 0, who, 0);
            s += up.svg;
            s += arm(up.shoulder, 45, 75, who, false, { upper: 25, fore: 23, hand: 0.75 });
            return { body: s, mark: { kind: 'arc', x: K.x, y: K.y, r: 24, a0: 0, sign: -1, refLen: 30 } };
        },

        /* ---- side view: front knee bends in a lunge ---- */
        forward_lunge: function (th, dir, who) {
            const g = lungeGeometry(th);
            const A = { x: 128, y: 180 };
            const K = at(A.x, A.y, SQ.shin, 180 + g.shin);         // the shin runs from the knee forward-down to the ankle
            const H = at(K.x, K.y, SQ.thigh, 180 + g.thigh);
            const bk = at(H.x, H.y, SQ.thigh, g.backHip), ba = at(bk.x, bk.y, SQ.shin, g.backHip - g.backKnee);
            let s = softShadow(A.x - 20, 189, 48, 5);
            s += legSide({ x: H.x - 3, y: H.y }, bk, ba, true);
            s += legSide(H, K, A, false);
            const up = sideUpper(H, g.trunk, who, 0);
            s += up.svg;
            s += arm(up.shoulder, 10, 20, who, false, { upper: 23, fore: 21, hand: 0.75 });
            return { body: s, mark: { kind: 'arc', x: K.x, y: K.y, r: 22, a0: g.thigh, sign: -1, refLen: 26 } };
        },

        /* ---- side view, whole body: rise onto the toes ---- */
        heel_raise: function (th, dir, who) {
            const B = { x: 110, y: 185 };                             // ball of the foot
            const A = at(B.x, B.y, 20, 208 - th);                      // ankle above and behind the ball; the heel lifts by th
            const K = at(A.x, A.y, 40, 180), H = at(K.x, K.y, 40, 180);
            let s = softShadow(B.x - 4, 190, 30, 4);
            s += legSide({ x: H.x - 4, y: H.y }, { x: K.x - 4, y: K.y }, { x: A.x - 4, y: A.y }, true);
            s += legSide(H, K, A, false);
            const up = sideUpper(H, 0, who, 0);
            s += up.svg;
            s += arm(up.shoulder, 6, 10, who, false, { upper: 25, fore: 23, hand: 0.75 });
            return { body: s, mark: { kind: 'arc', x: B.x, y: B.y, r: 22, a0: -90, sign: -1, refLen: 28 } };
        },

        /* ---- one hand, palm to the camera: fingers spread apart ---- */
        finger_spread: function (th, dir, who) {
            let s = '';
            s += cyl({ x: 100, y: 230 }, { x: 100, y: 168 }, 36, 38, 'skin');
            s += cyl({ x: 100, y: 236 }, { x: 100, y: 200 }, 46, 46, shirtOf(who));
            s += band({ x: 100, y: 203 }, { x: 100, y: 197 }, 46, trimOf(who));
            const fingers = [{ x: 78, L: 40, k: -1.3 }, { x: 93, L: 47, k: -0.4 }, { x: 108, L: 45, k: 0.4 }, { x: 122, L: 36, k: 1.3 }];
            fingers.forEach(function (fg) {
                const a = 180 + fg.k * (th / 2.6);
                s += cyl({ x: fg.x, y: 112 }, at(fg.x, 112, fg.L, a), fg.x === 122 ? 12 : 13.5, 11.5, 'skin');
            });
            s += path('M68 112 Q67 100 78 100 L122 100 Q133 100 133 112 L134 158 Q133 182 110 183 L90 183 Q67 182 66 158 Z', R('skin'), edge('skin'));
            const tb = { x: 72, y: 152 }, tm = at(tb.x, tb.y, 20, 222 + th * 0.3), tt = at(tm.x, tm.y, 16, 212 + th * 0.3);
            s += cyl(tb, tm, 15, 13, 'skin') + joint(tm, 13, 'skin') + cyl(tm, tt, 13, 11, 'skin');
            return { body: s, mark: { kind: 'arc', x: 100, y: 150, r: 88, a0: 180 + th / 2, sign: -1, refLen: 96 } };
        }
    };
    Object.keys(NEW_RIGS).forEach(function (k) { RIGS[k] = NEW_RIGS[k]; });

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
        const who = opts.who || 'demo';
        ensureDefs();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        svg.setAttribute('class', 'ef-svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('data-no-i18n', '');
        svg.innerHTML =
            '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
                '<mask id="' + id + 'm"><rect x="-20" y="-20" width="240" height="240" fill="url(#' + id + 'g)"/></mask></defs>' +
            '<g class="ef-body" mask="url(#' + id + 'm)"><g class="ef-body-2d"></g></g><g class="ef-marks"></g><g class="ef-ring"></g>';
        host.appendChild(svg);

        const body = svg.querySelector('.ef-body-2d');
        const mk = svg.querySelector('.ef-marks');
        const ring = svg.querySelector('.ef-ring');
        const rig = RIGS[exId];
        const spec = EX[exId] || { unit: '°', dirs: ['both'] };
        let last = '';
        let lastSt = null;
        const fig3d = Look3D.attach(svg, exId);

        const api = {
            el: svg,
            exercise: exId,
            set: function (st) {
                if (!rig) return;
                st = st || {};
                const th = Math.max(0, st.theta || 0);
                const dir = st.dir || spec.dirs[0];
                const key = [exId, f(th), dir, st.target, st.live === undefined || st.live === null ? '' : f(st.live),
                             st.holdP === undefined || st.holdP === null ? '' : f(st.holdP), st.holdText, st.arrow, st.wrong, st.labels, opts.marks].join('|');
                if (key === last) return;           // nothing moved: no repaint
                /* v17.6: the 3D look repaints at most ~30 times a second per figure;
                   body and marks always repaint together */
                if (fig3d.active() && !fig3d.ready()) return;
                last = key;
                lastSt = st;
                CUR = { pfx: id + 'x', n: 0 };
                const r = rig(th, dir, who);
                api.pivot = r.mark ? { x: r.mark.x, y: r.mark.y } : null;   /* exposed for the problem highlight */
                /* only Sophia is ever drawn: no 2D figure (until she is ready, only the marks show) */
                if (fig3d.active()) fig3d.draw(th, dir);
                else body.innerHTML = '';
                mk.innerHTML = opts.marks === false ? '' : marks(r.mark, {
                    theta: th, target: st.target, live: st.live, liveSign: st.liveSign,
                    arrow: st.arrow, wrong: st.wrong, labels: st.labels
                }, spec.unit);
                ring.innerHTML = holdRing(st);
            },
            destroy: function () { fig3d.detach(); if (svg.parentNode) svg.parentNode.removeChild(svg); }
        };
        /* when the 3D look arrives (or the figure is resized) repaint the last state */
        fig3d.onRepaint(function () { if (lastSt) { last = ''; body.innerHTML = ''; api.set(lastSt); } });
        return api;
    }

    /* ======================================================================
     *  3D LOOK  (v17.6 · Sophia)
     *  The avatar is Sophia (female, sophia-model.js) or Manuel (male,
     *  manuel-model.js), drawn by avatar-3d.js; the viewer picks one and the
     *  choice is remembered. No 2D figure is drawn. The chosen character is
     *  loaded on demand; until ready, or where WebGL is missing, only the marks are shown. Angles, marks, the demo
     *  timeline and everything the guide does are unchanged: the 3D avatar
     *  is posed from the same (exercise, angle, direction) as the drawing.
     * ==================================================================== */

    const Look3D = (function () {
        const BOX = { x: -60, y: -60, w: 320, h: 320 };      // figure space the 3D picture covers
        const MIN_GAP = 30;                                   // ms between 3D repaints of one figure
        const base = (function () {
            try {
                const s = document.currentScript && document.currentScript.src;
                return s ? s.replace(/[^\/]*$/, '') : '';
            } catch (e) { return ''; }
        })();
        let state = 'idle';            // idle | loading | ready | off
        const figs = new Set();

        /* two characters; the viewer's choice is remembered in this browser */
        const MODELS = {
            female: { file: 'sophia-model.js', global: 'SOPHIA_MODEL' },
            male:   { file: 'manuel-model.js', global: 'MANUEL_MODEL' }
        };
        const PREF_KEY = 'rehabGuide.character';
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
                .then(function () { figs.forEach(function (fg) { if (fg.refresh) fg.refresh(); }); });
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
                el.src = src + '?v=duo2'; el.async = true;       // never reuse an old avatar from the cache
                el.onload = ok; el.onerror = bad;
                document.head.appendChild(el);
            });
        }
        function start() {
            if (state !== 'idle') return;
            state = 'loading';
            (global.THREE ? Promise.resolve() : loadScript(base + 'vendor/three.min.js'))
                .then(function () { return global.ReMotionAvatar3D ? null : loadScript(base + 'avatar-3d.js'); })
                /* only the chosen character's model (mesh, skeleton, textures) is downloaded */
                .then(function () { return loadModel(want); })
                .then(function () {
                    const A = global.ReMotionAvatar3D;
                    if (!A || !A.supported()) throw new Error('no WebGL');
                    /* building the character takes a moment: do it once, off the first paint,
                       and show them only when the textures are decoded */
                    return new Promise(function (ok) { setTimeout(function () { A.setCharacter(want); A.init(); ok(A.ready()); }, 60); });
                })
                .then(function () {
                    state = 'ready';
                    figs.forEach(function (fg) { fg.wake(); });
                    return sync();          // the viewer may have switched while loading
                })
                .catch(function (e) {
                    state = 'off';
                    try { console.warn('[ExerciseFigures] 3D avatar unavailable, using the 2D figure:', e && e.message ? e.message : e); } catch (x) { /* */ }
                });
        }

        function attach(svg, exId) {
            const A = function () { return global.ReMotionAvatar3D; };
            let fo = null, canvas = null, repaint = null, lastDraw = 0, ro = null, on = false;
            const fg = {
                active: function () { return on; },
                ready: function () { return performance.now() - lastDraw >= MIN_GAP; },
                draw: function (th, dir) {
                    lastDraw = performance.now();
                    const r = fo.getBoundingClientRect();
                    const dpr = Math.min(2, global.devicePixelRatio || 1);
                    const W = Math.min(1400, Math.round(r.width * dpr)), H = Math.min(1400, Math.round(r.height * dpr));
                    if (!W || !H) return;                 // not on screen yet: the resize watcher repaints later
                    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
                    try { A().draw(canvas, exId, th, dir, BOX); }
                    catch (e) { on = false; fo.style.display = 'none'; try { console.warn('[ExerciseFigures] 3D draw failed', e); } catch (x) { /* */ } }
                },
                onRepaint: function (fn) { repaint = fn; },
                refresh: function () { if (on) { lastDraw = 0; if (repaint) repaint(); } },
                wake: function () {
                    if (on || state !== 'ready' || !A() || !A().has(exId) || !svg.isConnected) return;
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

        return { attach: attach, start: start, state: function () { return state; }, setCharacter: setCharacter, character: function () { return want; } };
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
        let th, phase, holdP = null;
        if (u < rest)                    { th = 0; phase = 'rest'; }
        else if (u < rest + go)          { th = peak * ease((u - rest) / go); phase = 'go'; }
        else if (u < rest + go + hold)   { th = peak; phase = 'hold'; holdP = holdSec ? (u - rest - go) / hold : null; }
        else                             { th = peak * (1 - ease((u - rest - go - hold) / back)); phase = 'back'; }
        return { theta: th, dir: dir, phase: phase, holdP: holdP, holdLeft: holdSec ? Math.max(0, hold - (u - rest - go)) : 0 };
    }

    global.ExerciseFigures = {
        mount: mount,
        /* 'female' (Sophia) | 'male' (Manuel); returns a promise, resolved once shown */
        setCharacter: function (c) { return Look3D.setCharacter(c); },
        character: function () { return Look3D.character(); },
        demoAt: demoAt,
        demoPeak: demoPeak,
        info: function (id) { return EX[id] ? Object.assign({ id: id }, EX[id]) : null; },
        has: function (id) { return !!RIGS[id]; },
        order: ORDER.slice(),
        colours: COL,
        squatGeometry: squatGeometry,
        geometry: { fingerWalk: fingerWalkGeometry, tableSlide: tableSlideGeometry, lunge: lungeGeometry, armReach: armReach }
    };

})(window);
