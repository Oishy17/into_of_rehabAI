/* ==========================================================================
   WHY-SIM — "inside the body" simulations for the "Why your physio
   prescribed it" section. One animated SVG schematic per tissue mechanism.

   draw(mech, s) — s.t time (s) · s.m exercise motion 0..1 (one rep cycle)
                   s.w recovery 0..1 (0 = before, 1 = after weeks of practice)
                   s.k restricted fraction of the range before practice
   Mechanisms: capsule · tight · weak · scar · pain · tendon · oa · spine
   Simplified illustrations, not anatomy-exact.
   ========================================================================== */
(function (G) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const cl = x => Math.max(0, Math.min(1, x));
    const ez = x => { x = cl(x); return x * x * (3 - 2 * x); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const R = d => d * Math.PI / 180;
    const f = n => Math.round(n * 10) / 10;
    function mix(a, b, t) {
        const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
        const A = p(a), B = p(b);
        return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(t))).toString(16).padStart(2, '0')).join('');
    }
    function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

    const C = {
        ink: '#13294B', bone: '#F6EEDF', boneS: '#B79C70', cart: '#8ECDE8', cartS: '#4F9CC4',
        bad: '#D63B2F', badSoft: '#F28B7D', ok: '#17845A', mus: '#D9665B', musD: '#A9443B', musOff: '#E8C3BC',
        fluid: '#3D8FDB', nerve: '#E89A12', tendon: '#F2E5C7', tendonS: '#C9AE7A', scar: '#8F3326', glide: '#D8C3A6'
    };

    /* ---------- drawing helpers ---------- */
    const line = (a, b, col, w, extra) => '<line x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (extra || '') + '/>';
    const circ = (p, r, fill, extra) => '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(r) + '" fill="' + fill + '"' + (extra || '') + '/>';
    function bone(a, b, w) { return line(a, b, C.boneS, w + 4) + line(a, b, C.bone, w); }
    const add = (a, b, s) => [a[0] + b[0] * (s === undefined ? 1 : s), a[1] + b[1] * (s === undefined ? 1 : s)];
    const rot = (v, deg) => { const c = Math.cos(R(deg)), s = Math.sin(R(deg)); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
    const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
    /** Callout pill with a leader line to the point it explains. */
    function tag(x, y, txt, col, op, to, anchor) {
        if (op <= 0.01) return '';
        const w = txt.length * 6.25 + 18, x0 = Math.max(4, Math.min(396 - w, anchor === 'end' ? x - w : (anchor === 'middle' ? x - w / 2 : x)));
        return '<g opacity="' + f(op) + '">' +
            (to ? line([x0 + w / 2, y], to, col, 1.6, ' stroke-dasharray="3 3"') + circ(to, 3.4, col) : '') +
            '<rect x="' + f(x0) + '" y="' + f(y - 11) + '" width="' + f(w) + '" height="22" rx="11" fill="#fff" stroke="' + col + '" stroke-width="1.6"/>' +
            '<text x="' + f(x0 + w / 2) + '" y="' + f(y + 4) + '" text-anchor="middle" class="ws-t" fill="' + col + '">' + txt + '</text></g>';
    }
    const opBad = w => cl((0.62 - w) / 0.3), opGood = w => cl((w - 0.38) / 0.3);
    function bolt(p, d, s, col, op) {   /* pain spark */
        if (op <= 0.02) return '';
        const q = [p, add(p, [d[0] * s * .35 + d[1] * s * .2, d[1] * s * .35 - d[0] * s * .2]), add(p, [d[0] * s * .55 - d[1] * s * .2, d[1] * s * .55 + d[0] * s * .2]), add(p, d, s)];
        return '<polyline points="' + q.map(v => f(v[0]) + ',' + f(v[1])).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" opacity="' + f(op) + '"/>';
    }
    function rangeArc(c, r, a0, a1, col, dash, w) {    /* angles in degrees, 0 = straight down, + toward right */
        const P = a => [c[0] + Math.sin(R(a)) * r, c[1] + Math.cos(R(a)) * r];
        const p0 = P(a0), p1 = P(a1), large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 0 : 1;
        return '<path d="M' + f(p0[0]) + ' ' + f(p0[1]) + ' A' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + f(p1[0]) + ' ' + f(p1[1]) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 3) + '" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
    }

    /* ======================================================================
       MECHANISMS
       ==================================================================== */
    const M = {};

    /* 1 — Frozen / stiff shoulder: thick, shrunken capsule stuck to the ball */
    M.capsule = {
        title: 'Joint capsule',
        fix: 'Gentle, repeated stretch → capsule lengthens and stops sticking',
        draw(s) {
            const w = ez(s.w), lim = lerp(s.k, 1, w), a = s.m * lim * 120;
            const c = [190, 118], Rb = 34, dir = [Math.sin(R(a)), Math.cos(R(a))], perp = [Math.cos(R(a)), -Math.sin(R(a))];
            let o = '';
            /* reachable range */
            o += rangeArc(c, 112, 0, 120, '#B8C6D8', '4 6', 3);
            o += rangeArc(c, 112, 0, Math.max(1, lim * 120), mix(C.bad, C.ok, w), '', 5);
            /* shoulder blade + socket */
            o += '<path d="M28 40 L150 76 Q136 118 150 160 L28 214 Z" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3" stroke-linejoin="round"/>';
            o += '<path d="M150 78 Q136 118 150 158" fill="none" stroke="' + C.cartS + '" stroke-width="5" stroke-linecap="round"/>';
            /* humerus */
            const shaftEnd = add(c, dir, 175);
            o += bone(add(c, dir, 20), shaftEnd, 30);
            o += circ(c, Rb, C.bone, ' stroke="' + C.boneS + '" stroke-width="3"');
            o += '<path d="M' + f(c[0] - Rb + 4) + ' ' + f(c[1]) + ' A' + (Rb - 4) + ' ' + (Rb - 4) + ' 0 0 1 ' + f(c[0] + Rb - 4) + ' ' + f(c[1]) + '" transform="rotate(' + f(-a + 90) + ' ' + c[0] + ' ' + c[1] + ')" fill="none" stroke="' + C.cart + '" stroke-width="4" opacity=".8"/>';
            /* capsule: a sleeve from the socket rim around the ball to the neck of the humerus.
               upper part follows the ball; lower part is the fold (pouch) that must unfold to lift the arm */
            const Rc = Rb + 10, P = (ang, r) => add(c, [Math.sin(R(ang)), Math.cos(R(ang))], r);
            const tight = s.m >= 0.94 && w < 0.75;
            const capCol = mix(C.bad, '#E7A097', w), capW = lerp(9, 4.5, w);
            const pouch = lerp(8, 40, w) * (1 - 0.75 * s.m * lim) + 6;
            const S1 = [150, 78], S2 = [150, 158];
            const uA = P(222, Rc), uB = P(a + 42, Rc), span = 222 - (a + 42);
            const up = 'M' + S1[0] + ' ' + S1[1] + ' L' + f(uA[0]) + ' ' + f(uA[1]) + ' A' + Rc + ' ' + Rc + ' 0 ' + (span > 180 ? 1 : 0) + ' 0 ' + f(uB[0]) + ' ' + f(uB[1]);
            const lA = P(318, Rc), lB = P(a - 42, Rc), oA = P(318, Rc + pouch), oB = P(a - 42, Rc + pouch);
            const lo = 'M' + S2[0] + ' ' + S2[1] + ' L' + f(lA[0]) + ' ' + f(lA[1]) + ' C' + f(oA[0]) + ' ' + f(oA[1] + pouch * .5) + ' ' + f(oB[0]) + ' ' + f(oB[1] + pouch * .5) + ' ' + f(lB[0]) + ' ' + f(lB[1]);
            [up, lo].forEach(d => {
                o += '<path d="' + d + '" fill="none" stroke="' + capCol + '" stroke-width="' + f(capW) + '" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>';
                if (w < 0.6) o += '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 7" opacity="' + f((0.6 - w) * 1.4) + '"/>';
            });
            if (tight) o += '<path d="' + lo + '" fill="none" stroke="' + C.bad + '" stroke-width="' + f(capW + 8) + '" opacity="' + f((0.35 + 0.3 * Math.abs(Math.sin(s.t * 9))) * (1 - w)) + '" stroke-linecap="round"/>';
            /* adhesions: strands from capsule to the ball — they stretch and hold the ball back */
            const n = Math.round(lerp(7, 0, w));
            for (let i = 0; i < n; i++) {
                const th = 330 + i * 30, ball = add(c, [Math.sin(R(th + a)), Math.cos(R(th + a))], Rb - 2);
                const anc = add(c, [Math.sin(R(th)), Math.cos(R(th))], Rc);
                const str = Math.hypot(ball[0] - anc[0], ball[1] - anc[1]) / 40;
                o += line(anc, ball, mix('#B5483C', C.bad, cl(str)), 2.2, ' opacity=".85"');
            }
            /* inflammation */
            const rr = rng(7), inf = 1 - w;
            for (let i = 0; i < 16; i++) { const th = rr() * 360, rad = Rb + 10 + rr() * 14; o += circ(add(c, [Math.sin(R(th)), Math.cos(R(th))], rad), 2 + rr() * 2, C.bad, ' opacity="' + f(inf * (.25 + .3 * Math.abs(Math.sin(s.t * 2 + i)))) + '"'); }
            o += tag(392, 30, 'Thick, shrunken capsule', C.bad, opBad(s.w), P(190, Rc), 'end');
            o += tag(18, 250, 'Sticky strands hold the ball', C.bad, opBad(s.w), P(330, Rc), 'start');
            o += tag(392, 30, 'Capsule stretched & thinner', C.ok, opGood(s.w), P(190, Rc), 'end');
            o += tag(18, 250, 'Ball rolls & glides freely', C.ok, opGood(s.w), P(330, Rc), 'start');
            return o;
        }
    };

    /* 2 — Tight, short muscle with knots */
    M.tight = {
        title: 'Muscle length',
        fix: 'Slow, held stretch → fibres lengthen and knots release',
        draw(s) {
            const w = ez(s.w), lim = lerp(s.k, 1, w), str = s.m * lim;
            const x0 = 74, restEnd = lerp(274, 292, w), x1 = restEnd + str * 46, y = 132;
            let o = '';
            /* bones */
            o += '<rect x="22" y="70" width="52" height="124" rx="16" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3"/>';
            o += '<rect x="' + f(x1) + '" y="70" width="52" height="124" rx="16" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3"/>';
            /* tendons */
            const b0 = x0 + 30, b1 = x1 - 30, mid = (b0 + b1) / 2, len = b1 - b0;
            o += line([x0, y], [b0 + 6, y], C.tendonS, 16) + line([x0, y], [b0 + 6, y], C.tendon, 12);
            o += line([b1 - 6, y], [x1, y], C.tendonS, 16) + line([b1 - 6, y], [x1, y], C.tendon, 12);
            /* belly: thick when short, slimmer as it lengthens */
            const h = lerp(46, 36, cl((len - 140) / 120));
            const strain = cl(str / lim) * (1 - w);
            o += '<path d="M' + b0 + ' ' + y + ' C' + f(b0 + len * .25) + ' ' + f(y - h * 1.3) + ' ' + f(b1 - len * .25) + ' ' + f(y - h * 1.3) + ' ' + f(b1) + ' ' + y + ' C' + f(b1 - len * .25) + ' ' + f(y + h * 1.3) + ' ' + f(b0 + len * .25) + ' ' + f(y + h * 1.3) + ' ' + b0 + ' ' + y + 'Z" fill="' + mix(C.mus, C.bad, strain * .8) + '" stroke="' + C.musD + '" stroke-width="2.5"/>';
            /* fibres with stripes (sarcomeres): spacing grows with length */
            const sp = lerp(6, 10, cl((len - 120) / 150));
            for (let i = -3; i <= 3; i++) {
                const yy = y + i * h * .26, ins = Math.abs(i) * len * .07 + 10;
                o += line([b0 + ins, yy], [b1 - ins, yy], '#F4B3AA', 1.4, ' stroke-dasharray="' + f(sp * .45) + ' ' + f(sp * .55) + '"');
            }
            /* knots */
            const nk = Math.round(lerp(4, 0, w)), rr = rng(3);
            for (let i = 0; i < nk; i++) {
                const kx = lerp(b0 + 40, b1 - 40, (i + .5) / Math.max(1, nk)) + (rr() - .5) * 20, ky = y + (rr() - .5) * h;
                o += '<ellipse cx="' + f(kx) + '" cy="' + f(ky) + '" rx="' + f(9 * (1 - w * .6)) + '" ry="' + f(6 * (1 - w * .6)) + '" fill="' + C.scar + '" opacity=".85"/>';
                o += circ([kx, ky], 14, 'none', ' stroke="' + C.bad + '" stroke-width="2" opacity="' + f((.3 + .4 * Math.abs(Math.sin(s.t * 4 + i))) * (1 - w)) + '"');
            }
            /* stretch arrow */
            if (s.m > 0.05) o += line([x1 + 8, 56], [x1 + 18 + 22 * s.m, 56], C.ink, 3) + '<path d="M' + f(x1 + 28 + 22 * s.m) + ' 56 l-9 -6 v12z" fill="' + C.ink + '"/><text x="' + f(x1 + 8) + '" y="46" class="ws-n">stretch</text>';
            /* length ruler */
            o += line([b0, 222], [b1, 222], mix(C.bad, C.ok, w), 3) + line([b0, 215], [b0, 229], C.ink, 2) + line([b1, 215], [b1, 229], C.ink, 2);
            o += '<text x="' + f(mid) + '" y="244" text-anchor="middle" class="ws-n">muscle length ' + Math.round(len / 1.7) + ' mm</text>';
            o += tag(110, 30, 'Short fibres + tight knots', C.bad, opBad(s.w), [mid, y - h * .7], 'start');
            o += tag(110, 30, 'Fibres lengthen, knots release', C.ok, opGood(s.w), [mid, y - h * .7], 'start');
            return o;
        }
    };

    /* 3 — Weak muscle: few fibres switch on, small muscle */
    M.weak = {
        title: 'Muscle strength',
        fix: 'Repeated effort → more fibres fire and the muscle grows',
        draw(s) {
            const w = ez(s.w), y = 142, h = lerp(30, 46, w), act = s.m;
            const shorten = act * lerp(8, 20, w), x0 = 70, x1 = 300 - shorten;
            let o = '';
            /* nerve from the spinal cord */
            o += '<rect x="20" y="16" width="44" height="34" rx="12" fill="#EFE7F9" stroke="#8B76D6" stroke-width="2"/><text x="42" y="38" text-anchor="middle" class="ws-n" fill="#5B46B8">nerve</text>';
            const np = [[42, 50], [42, 82], [130, 96], [180, y - h * .7]];
            o += '<polyline points="' + np.map(p => p.join(',')).join(' ') + '" fill="none" stroke="#8B76D6" stroke-width="3" stroke-linejoin="round"/>';
            /* signals travel down the nerve while contracting */
            const sig = lerp(2, 6, w);
            for (let i = 0; i < sig; i++) {
                const u = ((s.t * 1.4 + i / sig) % 1);
                if (act < .15) continue;
                const seg = u * 3, k = Math.min(2, Math.floor(seg)), tt = seg - k, p = [lerp(np[k][0], np[k + 1][0], tt), lerp(np[k][1], np[k + 1][1], tt)];
                o += circ(p, 4.5, C.nerve, ' opacity="' + f(act) + '"');
            }
            /* tendons + bone */
            o += line([28, y], [x0 + 10, y], C.tendonS, 14) + line([28, y], [x0 + 10, y], C.tendon, 10);
            o += '<rect x="8" y="96" width="26" height="92" rx="10" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3"/>';
            o += line([x1 - 10, y], [x1 + 40, y], C.tendonS, 14) + line([x1 - 10, y], [x1 + 40, y], C.tendon, 10);
            /* pulley + weight lifted */
            const px = x1 + 52;
            o += circ([px, y], 12, C.bone, ' stroke="' + C.boneS + '" stroke-width="3"');
            const force = lerp(.42, 1, w), lift = act * force * 54, wy = 236 - lift;
            o += line([px + 12, y], [px + 12, wy - 16], C.ink, 2.2);
            o += '<rect x="' + f(px - 4) + '" y="' + f(wy - 16) + '" width="34" height="30" rx="5" fill="' + C.ink + '"/><text x="' + f(px + 13) + '" y="' + f(wy + 4) + '" text-anchor="middle" class="ws-n" fill="#fff">kg</text>';
            /* muscle with 10 fibre rows; how many fire depends on recovery */
            const len = x1 - x0, rows = 10, on = Math.round(lerp(3, 9, w));
            o += '<path d="M' + x0 + ' ' + y + ' C' + f(x0 + len * .22) + ' ' + f(y - h * 1.5) + ' ' + f(x1 - len * .22) + ' ' + f(y - h * 1.5) + ' ' + f(x1) + ' ' + y + ' C' + f(x1 - len * .22) + ' ' + f(y + h * 1.5) + ' ' + f(x0 + len * .22) + ' ' + f(y + h * 1.5) + ' ' + x0 + ' ' + y + 'Z" fill="#F3DCD7" stroke="' + C.musD + '" stroke-width="2.5"/>';
            const order = [4, 6, 2, 8, 5, 3, 7, 1, 9, 0];
            for (let r = 0; r < rows; r++) {
                const yy = y + (r - (rows - 1) / 2) * (h * 2 / rows), ins = Math.pow(Math.abs(r - (rows - 1) / 2) / (rows / 2), 2) * len * .36 + 14;
                const live = order.indexOf(r) < on;
                const col = live ? mix('#E58E84', '#FF4E2E', act) : C.musOff;
                o += line([x0 + ins, yy], [x1 - ins, yy], col, live ? 4.2 : 3);
            }
            /* force meter */
            o += '<text x="18" y="252" class="ws-n">fibres firing</text><text x="108" y="252" class="ws-big" fill="' + mix(C.bad, C.ok, w) + '">' + on + '/10</text>';
            o += tag(120, 30, 'Only a few fibres switch on', C.bad, opBad(s.w), [x0 + len * .5, y - h * .8], 'start');
            o += tag(120, 30, 'More fibres fire, muscle grows', C.ok, opGood(s.w), [x0 + len * .5, y - h * .8], 'start');
            return o;
        }
    };

    /* 4 — Stiffness after a cast / surgery: scar fibres glue a hinge joint */
    M.scar = {
        title: 'Scar tissue',
        fix: 'Gentle, regular bending → scar fibres stretch and line up',
        draw(s) {
            const w = ez(s.w), lim = lerp(s.k, 1, w), bend = s.m * lim * 90;
            const J = [196, 150], u = norm([J[0] - 40, J[1] - 70]), v = rot(u, -bend);
            let o = '';
            /* reachable range */
            const base = Math.atan2(u[0], u[1]) * 180 / Math.PI;
            o += rangeArc(J, 84, base, base + 90, '#B8C6D8', '4 6', 3);
            o += rangeArc(J, 84, base, base + Math.max(1, lim * 90), mix(C.bad, C.ok, w), '', 5);
            /* bones */
            o += bone([40, 70], add(J, u, -6), 34);
            o += bone(add(J, v, 6), add(J, v, 128), 30);
            o += circ(J, 24, C.bone, ' stroke="' + C.boneS + '" stroke-width="3"');
            o += circ(J, 17, 'none', ' stroke="' + C.cart + '" stroke-width="4" opacity=".9"');
            /* joint fluid: dull when stuck, flowing when moving */
            for (let i = 0; i < 6; i++) { const th = s.t * (40 + 120 * w) * (i % 2 ? 1 : -1) + i * 60; o += circ(add(J, [Math.sin(R(th)), Math.cos(R(th))], 20.5), 2.4, C.fluid, ' opacity="' + f(.25 + .6 * w) + '"'); }
            /* scar fibres bridging upper bone -> lower bone, on the outside of the bend */
            const n = Math.round(lerp(16, 6, w)), rr = rng(11), nU = [-u[1], u[0]], nV = [-v[1], v[0]];
            for (let i = 0; i < n; i++) {
                const d1 = lerp(22 + rr() * 34, 30, w), d2 = lerp(22 + rr() * 34, 30, w);
                const o1 = lerp(-6 + rr() * 30, 14 + i * 2, w), o2 = lerp(-6 + rr() * 30, 14 + i * 2, w);
                const A = add(add(J, u, -d1), nU, -o1), B = add(add(J, v, d2), nV, o2);
                const rest = 50, len = Math.hypot(A[0] - B[0], A[1] - B[1]), stretch = cl((len - rest) / 40);
                o += line(A, B, mix(mix(C.scar, C.glide, w), C.bad, stretch * (1 - w)), lerp(3, 1.8, w), ' opacity=".9"');
            }
            o += tag(210, 30, 'Scar fibres glue the joint', C.bad, opBad(s.w), add(J, [-0.2, -1], 40), 'start');
            o += tag(210, 30, 'Fibres line up — joint glides', C.ok, opGood(s.w), add(J, [-0.2, -1], 40), 'start');
            o += tag(16, 252, 'Little joint fluid moving', C.bad, opBad(s.w), add(J, [-.6, .6], 22), 'start');
            o += tag(16, 252, 'Movement pumps joint fluid', C.ok, opGood(s.w), add(J, [-.6, .6], 22), 'start');
            return o;
        }
    };

    /* 5 — Painful, inflamed shoulder: pain signals + guarding; relaxed swing helps */
    M.pain = {
        title: 'Pain & guarding',
        fix: 'Relaxed, small swings → fluid moves, muscles let go, pain calms',
        draw(s) {
            const w = ez(s.w), c = [176, 86], amp = lerp(7, 20, w);
            const sw = Math.sin(s.t * 2 * Math.PI / 2.4) * amp * (s.moving === false ? 0 : 1);
            const dir = [Math.sin(R(sw)), Math.cos(R(sw))], gap = lerp(0, 5, w);
            let o = '';
            /* swing arc */
            o += rangeArc(c, 168, -20, 20, '#B8C6D8', '4 6', 3) + rangeArc(c, 168, -amp, amp, mix(C.bad, C.ok, w), '', 5);
            /* inflamed glow */
            o += circ(c, 64, 'url(#wsGlow)', ' opacity="' + f((1 - w) * (.65 + .25 * Math.sin(s.t * 3))) + '"');
            /* shoulder blade + socket */
            o += '<path d="M20 20 L136 50 Q124 86 136 122 L20 160 Z" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3" stroke-linejoin="round"/>';
            /* arm hangs, gravity opens the joint slightly */
            const cc = add(c, dir, gap);
            o += bone(add(cc, dir, 18), add(cc, dir, 140), 28);
            o += circ(cc, 31, C.bone, ' stroke="' + C.boneS + '" stroke-width="3"');
            /* guarding muscle over the top */
            const gm = 1 - w;
            o += '<path d="M60 26 Q150 ' + f(10 - gm * 8) + ' ' + f(cc[0] + 34) + ' ' + f(cc[1] + 16) + '" fill="none" stroke="' + mix(C.mus, C.bad, gm) + '" stroke-width="' + f(lerp(18, 12, w)) + '" stroke-linecap="round" opacity=".85"/>';
            if (gm > .2) for (let i = 0; i < 4; i++) o += line([80 + i * 26, 22 - gm * 4], [86 + i * 26, 30 - gm * 4], '#fff', 2, ' opacity="' + f(gm * .8) + '"');
            /* joint fluid circulates with the swing */
            for (let i = 0; i < 8; i++) { const th = s.t * (30 + Math.abs(sw) * 8) + i * 45; o += circ(add(cc, [Math.sin(R(th)), Math.cos(R(th))], 37), 2.6, C.fluid, ' opacity="' + f(.3 + .6 * w) + '"'); }
            /* pain signals up the nerve to the brain */
            const brain = [330, 40];
            o += '<path d="M' + f(cc[0] + 30) + ' ' + f(cc[1]) + ' Q270 110 ' + (brain[0] - 22) + ' ' + (brain[1] + 6) + '" fill="none" stroke="' + C.nerve + '" stroke-width="2.4" stroke-dasharray="5 5" opacity=".7"/>';
            o += '<ellipse cx="' + brain[0] + '" cy="' + brain[1] + '" rx="26" ry="20" fill="#F7E2F0" stroke="#B85A9C" stroke-width="2"/><text x="' + brain[0] + '" y="' + (brain[1] + 4) + '" text-anchor="middle" class="ws-n" fill="#8A3270">brain</text>';
            const nsig = Math.round(lerp(5, 1, w));
            for (let i = 0; i < nsig; i++) {
                const u = (s.t * .7 + i / nsig) % 1, a0 = [cc[0] + 30, cc[1]], cp = [270, 110], b = [brain[0] - 22, brain[1] + 6];
                const p = [lerp(lerp(a0[0], cp[0], u), lerp(cp[0], b[0], u), u), lerp(lerp(a0[1], cp[1], u), lerp(cp[1], b[1], u), u)];
                o += bolt(add(p, [-6, -6]), [1, .2], 14, C.bad, 1 - w * .7);
            }
            /* pain score */
            const pain = Math.round(lerp(8, 2, w));
            o += '<text x="250" y="232" class="ws-n">pain score</text><text x="250" y="256" class="ws-big" fill="' + mix(C.bad, C.ok, w) + '">' + pain + '/10</text>';
            o += tag(20, 200, 'Inflamed joint sends pain signals', C.bad, opBad(s.w), [cc[0] - 20, cc[1] + 24], 'start');
            o += tag(20, 200, 'Gentle swing moves joint fluid', C.ok, opGood(s.w), [cc[0] - 20, cc[1] + 24], 'start');
            o += tag(170, 168, 'Muscles guard & hold stiff', C.bad, opBad(s.w), [150, 18], 'start');
            o += tag(170, 168, 'Muscles relax, pain calms', C.ok, opGood(s.w), [150, 18], 'start');
            return o;
        }
    };

    /* 6 — Tendon / ligament: swollen, disorganised fibres; loading realigns them */
    M.tendon = {
        title: 'Tendon fibres',
        fix: 'Graded loading → fibres line up and the tendon gets stronger',
        draw(s) {
            const w = ez(s.w), y = 132, pull = s.m * lerp(.5, 1, w);
            const xm = 140 - pull * 10, xb = 318;
            let o = '';
            /* muscle (left) */
            o += '<path d="M14 ' + y + ' C40 ' + (y - 70) + ' ' + f(xm - 20) + ' ' + (y - 50) + ' ' + f(xm) + ' ' + y + ' C' + f(xm - 20) + ' ' + (y + 50) + ' 40 ' + (y + 70) + ' 14 ' + y + 'Z" fill="' + mix(C.mus, '#FF5A3C', pull * .6) + '" stroke="' + C.musD + '" stroke-width="2.5"/>';
            /* bone (right) */
            o += '<rect x="' + xb + '" y="60" width="62" height="150" rx="18" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3"/>';
            /* tendon outline: swollen middle when irritated */
            const sw = lerp(20, 0, w), th = 14;
            o += '<path d="M' + f(xm - 6) + ' ' + (y - th) + ' C' + f(xm + 50) + ' ' + f(y - th - sw) + ' ' + (xb - 70) + ' ' + f(y - th - sw) + ' ' + xb + ' ' + (y - th) + ' L' + xb + ' ' + (y + th) + ' C' + (xb - 70) + ' ' + f(y + th + sw) + ' ' + f(xm + 50) + ' ' + f(y + th + sw) + ' ' + f(xm - 6) + ' ' + (y + th) + 'Z" fill="' + mix('#F1C29F', C.tendon, w) + '" stroke="' + mix('#C9784A', C.tendonS, w) + '" stroke-width="2.5"/>';
            /* fibres: wavy & crossing → straight & parallel */
            const rr = rng(5), N = 7;
            for (let i = 0; i < N; i++) {
                const yy = y + (i - (N - 1) / 2) * 3.6, ph = rr() * 6, amp = lerp(4 + rr() * 6, .4, w) * (1 - pull * .5), fr = .05 + rr() * .05;
                let d = '';
                for (let x = xm; x <= xb; x += 6) {
                    const bul = Math.sin(Math.PI * (x - xm) / (xb - xm)) * sw * .9 * ((i - (N - 1) / 2) / (N / 2));
                    d += (x === xm ? 'M' : 'L') + f(x) + ' ' + f(yy + bul + Math.sin(x * fr + ph) * amp);
                }
                o += '<path d="' + d + '" fill="none" stroke="' + mix('#B4562F', '#B79A63', w) + '" stroke-width="1.5" opacity=".9"/>';
            }
            /* irritation dots (small vessels) */
            for (let i = 0; i < 10; i++) o += circ([lerp(xm + 30, xb - 30, rr()), y + (rr() - .5) * (th + sw) * 1.6], 2.2, C.bad, ' opacity="' + f((1 - w) * .8) + '"');
            /* load the tendon can take */
            const cap = lerp(.45, 1, w);
            o += '<text x="18" y="252" class="ws-n">load it can take</text><text x="18" y="232" class="ws-big" fill="' + mix(C.bad, C.ok, w) + '">' + Math.round(cap * 100) + '%</text>';
            o += line([150, 226], [150 + 120 * pull, 226], mix(C.bad, C.ok, w), 6) + (pull > .05 ? '<path d="M' + f(160 + 120 * pull) + ' 226 l-10 -8 v16z" fill="' + mix(C.bad, C.ok, w) + '"/>' : '');
            o += '<text x="150" y="252" class="ws-n">muscle pull</text>';
            o += tag(120, 34, 'Swollen, messy fibres', C.bad, opBad(s.w), [(xm + xb) / 2, y - th - sw * .8], 'start');
            o += tag(120, 34, 'Strong, aligned fibres', C.ok, opGood(s.w), [(xm + xb) / 2, y - th - sw * .8], 'start');
            return o;
        }
    };

    /* 7 — Osteoarthritis: thin cartilage + weak muscle → overloaded joint */
    M.oa = {
        title: 'Joint load',
        fix: 'Strengthening → muscles share the load; movement feeds cartilage',
        draw(s) {
            const w = ez(s.w), cx = 196, load = lerp(1, .55, w), comp = s.m;
            const gap = lerp(7, 10, w) - comp * 3, jy = 140;
            let o = '';
            /* thigh muscle either side — bulks up with practice */
            const mw = lerp(12, 28, w);
            [-1, 1].forEach(sd => {
                o += '<path d="M' + (cx + sd * 36) + ' 8 Q' + f(cx + sd * (44 + mw)) + ' 70 ' + (cx + sd * 40) + ' ' + (jy - 6) + '" fill="none" stroke="' + mix(C.musOff, C.mus, .3 + .7 * w) + '" stroke-width="' + f(mw) + '" stroke-linecap="round"/>';
                o += line([cx + sd * 40, jy - 6], [cx + sd * 30, jy + 28], C.tendonS, 6);
            });
            /* femur */
            o += '<path d="M' + (cx - 26) + ' 0 L' + (cx - 26) + ' 96 Q' + (cx - 50) + ' 112 ' + (cx - 46) + ' ' + f(jy - gap / 2) + ' L' + (cx + 46) + ' ' + f(jy - gap / 2) + ' Q' + (cx + 50) + ' 112 ' + (cx + 26) + ' 96 L' + (cx + 26) + ' 0Z" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3"/>';
            /* tibia */
            const ty = jy + gap / 2;
            o += '<path d="M' + (cx - 50) + ' ' + f(ty) + ' L' + (cx + 50) + ' ' + f(ty) + ' Q' + (cx + 52) + ' ' + f(ty + 22) + ' ' + (cx + 26) + ' ' + f(ty + 40) + ' L' + (cx + 24) + ' 280 L' + (cx - 24) + ' 280 L' + (cx - 26) + ' ' + f(ty + 40) + ' Q' + (cx - 52) + ' ' + f(ty + 22) + ' ' + (cx - 50) + ' ' + f(ty) + 'Z" fill="' + C.bone + '" stroke="' + C.boneS + '" stroke-width="3"/>';
            /* thin, rough cartilage (stays thin — exercise protects it, it doesn't regrow) */
            const rough = (y0, sg) => { let d = ''; for (let x = cx - 44; x <= cx + 44; x += 8) d += (x === cx - 44 ? 'M' : 'L') + x + ' ' + f(y0 + sg * (2 + ((x / 8) % 2) * 2)); return d; };
            o += '<path d="' + rough(jy - gap / 2, -1) + '" fill="none" stroke="' + C.cartS + '" stroke-width="3.2"/>';
            o += '<path d="' + rough(ty, 1) + '" fill="none" stroke="' + C.cartS + '" stroke-width="3.2"/>';
            /* bone spurs */
            [[cx - 46, jy - gap / 2, -1], [cx + 46, jy - gap / 2, 1], [cx - 50, ty, -1], [cx + 50, ty, 1]].forEach(p => o += '<path d="M' + p[0] + ' ' + f(p[1] - 5) + ' l' + (p[2] * 9) + ' 5 l' + (-p[2] * 9) + ' 5z" fill="' + C.boneS + '"/>');
            /* joint fluid pumped in/out by movement */
            for (let i = 0; i < 9; i++) { const x = cx - 40 + ((i * 10 + s.t * (10 + 40 * w) * (i % 2 ? 1 : -1)) % 80 + 80) % 80; o += circ([x, jy + Math.sin(i + s.t * 3) * gap * .2], 2.2, C.fluid, ' opacity="' + f(.3 + .6 * w) + '"'); }
            /* load arrow on the joint */
            const al = 40 * load * (.6 + .4 * comp), aw = 12 * load + 4;
            o += '<path d="M' + (cx + 90) + ' ' + f(jy - 12 - al) + ' v' + f(al) + '" stroke="' + mix(C.bad, C.ok, w) + '" stroke-width="' + f(aw) + '" stroke-linecap="round"/><path d="M' + f(cx + 90 - aw) + ' ' + (jy - 12) + ' h' + f(aw * 2) + ' l' + f(-aw) + ' 12z" fill="' + mix(C.bad, C.ok, w) + '"/>';
            o += '<text x="' + (cx + 70) + '" y="' + (jy + 30) + '" class="ws-n">joint load ' + Math.round(load * 100) + '%</text>';
            o += circ([cx, jy], 58, 'url(#wsGlow)', ' opacity="' + f((1 - w) * (.4 + .2 * comp)) + '"');
            o += tag(14, 30, 'Weak muscles, worn cartilage', C.bad, opBad(s.w), [cx - 44 - mw * .6, 70], 'start');
            o += tag(14, 30, 'Stronger muscles share the load', C.ok, opGood(s.w), [cx - 44 - mw * .6, 70], 'start');
            o += tag(14, 250, 'Joint overloaded → ache', C.bad, opBad(s.w), [cx - 30, jy], 'start');
            o += tag(14, 250, 'Movement feeds the cartilage', C.ok, opGood(s.w), [cx - 30, jy], 'start');
            return o;
        }
    };

    /* 8 — Spine: a few stiff segments, guarding muscles */
    M.spine = {
        title: 'Spinal segments',
        fix: 'Easy, repeated movement → every level shares the motion',
        draw(s) {
            const w = ez(s.w), lim = lerp(s.k, 1, w);
            const cyc = Math.sin(s.t * 2 * Math.PI / 4.2), B = cyc * lim * 46 * (s.moving === false ? 0 : 1);
            const n = 6, stiff = [2, 3], sh = lerp(.08, 1, w);
            const wts = Array.from({ length: n }, (_, i) => stiff.indexOf(i) >= 0 ? sh : 1), sum = wts.reduce((a, b) => a + b, 0);
            let p = [196, 258], ang = 0, o = '';
            o += rangeArc([196, 258], 222, 134, 226, '#B8C6D8', '4 6', 3);
            o += rangeArc([196, 258], 222, 180 - lim * 46, 180 + lim * 46, mix(C.bad, C.ok, w), '', 5);
            const segs = [];
            for (let i = 0; i < n; i++) {
                ang += B * wts[i] / sum;
                const d = [Math.sin(R(ang)), -Math.cos(R(ang))];
                const c = add(p, d, 15);
                segs.push({ c, ang, i, stiff: stiff.indexOf(i) >= 0 });
                p = add(p, d, 33);
            }
            /* guarding muscles alongside */
            const gm = 1 - w;
            [-1, 1].forEach(sd => {
                const pts = segs.map(g => add(g.c, [Math.cos(R(g.ang)) * sd, Math.sin(R(g.ang)) * sd], 44));
                o += '<polyline points="' + pts.map(q => f(q[0]) + ',' + f(q[1])).join(' ') + '" fill="none" stroke="' + mix(C.mus, C.bad, gm) + '" stroke-width="' + f(lerp(16, 9, w)) + '" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>';
            });
            segs.forEach((g, k) => {
                if (k) { const pc = segs[k - 1].c, mid = [(pc[0] + g.c[0]) / 2, (pc[1] + g.c[1]) / 2], a = (segs[k - 1].ang + g.ang) / 2;
                    o += '<rect x="' + f(mid[0] - 24) + '" y="' + f(mid[1] - 5) + '" width="48" height="10" rx="5" fill="' + C.cart + '" stroke="' + C.cartS + '" stroke-width="1.5" transform="rotate(' + f(a) + ' ' + f(mid[0]) + ' ' + f(mid[1]) + ')"/>'; }
                const bad = g.stiff && w < .7;
                o += '<g transform="rotate(' + f(g.ang) + ' ' + f(g.c[0]) + ' ' + f(g.c[1]) + ')"><rect x="' + f(g.c[0] - 30) + '" y="' + f(g.c[1] - 13) + '" width="60" height="26" rx="8" fill="' + (bad ? mix('#F5C6BE', C.bone, w) : C.bone) + '" stroke="' + (bad ? mix(C.bad, C.boneS, w / .7) : C.boneS) + '" stroke-width="' + (bad ? 3.5 : 3) + '"/>' +
                    '<path d="M' + f(g.c[0] + 30) + ' ' + f(g.c[1]) + ' l14 -4 v8z" fill="' + C.boneS + '"/><path d="M' + f(g.c[0] - 30) + ' ' + f(g.c[1]) + ' l-14 -4 v8z" fill="' + C.boneS + '"/></g>';
                if (bad) o += circ(g.c, 6, C.bad, ' opacity="' + f((1 - w / .7) * (.5 + .4 * Math.abs(Math.sin(s.t * 4)))) + '"');
            });
            /* head */
            const top = segs[n - 1];
            o += circ(add(top.c, [Math.sin(R(top.ang)), -Math.cos(R(top.ang))], 38), 22, '#F3D9C4', ' stroke="#C9A182" stroke-width="3"');
            /* bend reading */
            o += '<text x="14" y="252" class="ws-n">stiff levels move</text><text x="14" y="232" class="ws-big" fill="' + mix(C.bad, C.ok, w) + '">' + Math.round(sh * 100) + '%</text>';
            o += tag(250, 120, 'Stiff, locked levels', C.bad, opBad(s.w), segs[2].c, 'start');
            o += tag(250, 120, 'Every level moves', C.ok, opGood(s.w), segs[2].c, 'start');
            o += tag(250, 196, 'Muscles guard', C.bad, opBad(s.w), add(segs[1].c, [44, 0]), 'start');
            return o;
        }
    };

    /* ======================================================================
       PUBLIC API
       ==================================================================== */
    let uid = 0;
    function mount(host) {
        const id = 'ws' + (++uid);
        host.innerHTML = '<svg class="ws-svg" viewBox="0 0 400 270" role="img" aria-label="Simulation inside the body"><defs><radialGradient id="wsGlow' + id + '"><stop offset="0" stop-color="#FF3B2F" stop-opacity=".55"/><stop offset=".6" stop-color="#FF6A4D" stop-opacity=".22"/><stop offset="1" stop-color="#FF6A4D" stop-opacity="0"/></radialGradient></defs><g></g></svg>';
        const g = host.querySelector('g');
        return {
            draw(mech, s) {
                const m = M[mech] || M.weak;
                g.innerHTML = m.draw(s).replace(/url\(#wsGlow\)/g, 'url(#wsGlow' + id + ')');
            }
        };
    }
    /** One exercise rep: rest → move → hold → return (0..1). */
    function motion(t) {
        const T = 4.2, u = (t % T) / T;
        if (u < .12) return 0;
        if (u < .45) return ez((u - .12) / .33);
        if (u < .65) return 1;
        if (u < .95) return 1 - ez((u - .65) / .3);
        return 0;
    }
    G.WhySim = { mount: mount, motion: motion, MECH: M };
})(typeof window !== 'undefined' ? window : globalThis);
