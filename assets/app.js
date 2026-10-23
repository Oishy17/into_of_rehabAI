/* ==========================================================================
   APP — home (4 category layers) and one page per exercise.
   Animations: Rehab AI's own exercise figures (exercise-figures.js + 3D avatar).
   Two animations per exercise:
     correct movement — the Rehab AI demo, with angle marks and the count rules
     the problem      — the same avatar trying the movement but stopping short,
                        the affected joint glowing red (e.g. frozen shoulder)
   ========================================================================== */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FS = 'Frozen shoulder';
    const EF = window.ExerciseFigures;

    const I = {
        do: '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="#fff"/></svg>',
        why: '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 4v10M12 19v.5" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>',
        how: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M4 20L15 5"/><path d="M11 20a7 7 0 00-2.2-5"/></svg>',
        cam: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="3"/><path d="M8.5 7l1.5-2.5h4L15.5 7"/><circle cx="12" cy="13" r="3.2"/></svg>',
        check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
        back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
        pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
        play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>',
        x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        ok: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
    };
    const CAT_ICON = {
        neck: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="3.6"/><path d="M10 11v2.5M14 11v2.5M5 21c.6-4 3.2-7 7-7.6 3.8.6 6.4 3.6 7 7.6"/></svg>',
        upper: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.6"/><path d="M4 21v-7.5C4 11.6 5.6 10 7.5 10h9c1.9 0 3.5 1.6 3.5 3.5V21M8 21v-6M16 21v-6"/></svg>',
        lower: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l-1 7 2 5-1 6M15 3l1 7-1 5 2 6M7 21h4M15 21h4"/></svg>',
        hand: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 013 0V11M11 10V4a1.5 1.5 0 013 0v6M14 10V5.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6.5 7S5 18 4.5 15.5L3.6 12a1.4 1.4 0 012.5-1.2L8 13.5"/></svg>'
    };
    const catOf = id => CATS.filter(c => c.id === id)[0];
    const cvar = id => 'var(--' + catOf(id).tint + ')';
    const U = e => e.rule.u;

    /* ======================================================================
       FIGURES
       ==================================================================== */
    let uid = 0;
    /** Mount a Rehab AI figure plus a red "problem joint" glow layer. */
    function mountFig(host, e, marks) {
        host.innerHTML = '';
        const fig = EF.mount(host, e.id, { who: 'demo', marks: marks });
        const NS = 'http://www.w3.org/2000/svg', gid = 'pbg' + (++uid);
        const defs = document.createElementNS(NS, 'defs');
        defs.innerHTML = '<radialGradient id="' + gid + '"><stop offset="0" stop-color="#FF3B2F" stop-opacity=".9"/><stop offset=".45" stop-color="#FF6A4D" stop-opacity=".5"/><stop offset="1" stop-color="#FF6A4D" stop-opacity="0"/></radialGradient>';
        const glow = document.createElementNS(NS, 'g');
        glow.setAttribute('class', 'pb-glow');
        glow.innerHTML = '<circle r="26" fill="url(#' + gid + ')"/><circle class="pb-ring" r="13" fill="none" stroke="#FF3B2F" stroke-width="2.5"/>';
        glow.style.display = 'none';
        fig.el.insertBefore(defs, fig.el.firstChild);
        fig.el.appendChild(glow);
        fig.glow = function (on, strength) {
            if (!on || !fig.pivot) { glow.style.display = 'none'; return; }
            glow.style.display = '';
            /* the affected joint: the figure's measuring pivot, unless the exercise names the spot */
            const at = e.pb.at ? { x: e.pb.at[0], y: e.pb.at[1] } : { x: fig.pivot.x + (e.pb.off ? e.pb.off[0] : 0), y: fig.pivot.y + (e.pb.off ? e.pb.off[1] : 0) };
            glow.setAttribute('transform', 'translate(' + at.x + ' ' + at.y + ')');
            glow.style.opacity = String(strength === undefined ? 1 : strength);
        };
        return fig;
    }
    const peakOf = e => EF.demoPeak(e.id, e.rule.c, e.rule.max);
    /** Correct movement (Rehab AI demo timeline). */
    function normalAt(e, t) {
        const s = EF.demoAt(e.id, t, peakOf(e), e.rule.h);
        return { theta: s.theta, dir: s.dir, phase: s.phase, holdP: s.holdP, holdLeft: s.holdLeft };
    }
    /** The problem: tries, stops short of the target, strains, gives up. */
    function problemAt(e, t) {
        const info = EF.info(e.id) || { dirs: ['both'] };
        const lim = e.rule.c * e.pb.k, weak = e.pb.kind !== 'rom';
        const rest = 0.8, go = weak ? 2.4 : 1.8, stuck = 1.6, back = 1.4, T = rest + go + stuck + back;
        const n = Math.floor(t / T), u = t - n * T, dir = info.dirs[n % info.dirs.length];
        let th, ph;
        const ez = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
        if (u < rest) { th = 0; ph = 'rest'; }
        else if (u < rest + go) { th = lim * ez((u - rest) / go); ph = 'go'; }
        else if (u < rest + go + stuck) {
            const w = u - rest - go;
            th = lim + Math.sin(w * (weak ? 26 : 34)) * (weak ? 2.6 : 1.3) - (weak ? w * 1.5 : 0);
            ph = 'stuck';
        } else { th = (lim - (weak ? stuck * 1.5 : 0)) * (1 - ez((u - rest - go - stuck) / back)); ph = 'back'; }
        return { theta: Math.max(0, th), dir: dir, phase: ph, lim: lim };
    }
    function paintNormal(fig, e, s, marks) {
        fig.set({ theta: s.theta, dir: s.dir, target: marks ? e.rule.c : null, holdP: marks ? s.holdP : null, holdText: s.holdLeft ? Math.ceil(s.holdLeft) + 's' : '',
                  arrow: s.phase === 'go' ? 'out' : (s.phase === 'back' ? 'back' : null), labels: marks });
        fig.glow(false);
    }
    function paintProblem(fig, e, s, t) {
        fig.set({ theta: s.theta, dir: s.dir, target: e.rule.c, wrong: s.phase === 'stuck', arrow: s.phase === 'go' ? 'out' : null, labels: true });
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 3.2));
        fig.glow(true, s.phase === 'stuck' ? pulse : 0.45);
    }

    /* ======================================================================
       HOME
       ==================================================================== */
    function card(e) {
        const fs = e.for.some(c => c.indexOf(FS) === 0);
        const first = e.for[0];
        return '<a class="card" href="#ex-' + e.slug + '" aria-label="' + esc(e.name) + '">' +
            '<div class="plate"><span class="num" style="background:' + cvar(e.cat) + '">' + e.n + '</span>' +
            (fs ? '<span class="fsflag">Frozen shoulder</span>' : '') +
            '<div class="fig" data-id="' + e.id + '"></div>' +
            '<div class="inset" title="The problem"><div class="fig-pb" data-id="' + e.id + '"></div><span class="inset-x">' + I.x + '</span></div></div>' +
            '<div class="card-body"><h3>' + esc(e.name) + '</h3>' +
            '<div class="row do"><span class="ic">' + I.do + '</span><span>' + esc(e.how) + '</span></div>' +
            '<div class="row why"><span class="ic">' + I.why + '</span><span><b>' + esc(e.problem) + '</b><br>' +
                '<span class="chip' + (first.indexOf(FS) === 0 ? ' fs' : '') + '">' + esc(first) + '</span>' + (e.for.length > 1 ? '<span class="more">+' + (e.for.length - 1) + '</span>' : '') + '</span></div>' +
            '<div class="row how"><span class="ic">' + I.how + '</span><span>' + esc(e.lm.join(' · ')) + '<br><span class="mono">counts at ≥ ' + e.rule.c + U(e) + '</span></span></div>' +
            '</div></a>';
    }
    function home() {
        return '<section class="wrap intro" id="top"><h1>Every rehab exercise, at a glance</h1>' +
            '<div class="key"><span class="tag t-do"><span class="ic">' + I.do + '</span>What to do</span>' +
            '<span class="tag t-why"><span class="ic">' + I.why + '</span>Why · the problem</span>' +
            '<span class="tag t-how"><span class="ic">' + I.how + '</span>How it’s measured</span></div></section>' +
            CATS.map(c => {
                const list = EXS.filter(e => e.cat === c.id);
                return '<section class="layer" id="' + c.id + '"><div class="wrap">' +
                    '<div class="layer-head"><span class="badge" style="background:' + cvar(c.id) + '">' + CAT_ICON[c.id] + '</span>' +
                    '<div><h2>' + esc(c.name) + '</h2><small>' + list.length + ' exercises</small></div><span class="rule" style="background:' + cvar(c.id) + '"></span></div>' +
                    '<div class="grid">' + list.map(card).join('') + '</div></div></section>';
            }).join('');
    }

    /* ======================================================================
       EXERCISE PAGE
       ==================================================================== */
    function gauge(e) {
        const L = (name, w, col, v) => '<div class="gline"><span>' + name + '</span><span class="tr"><i style="width:' + w + '%;background:' + col + '"></i></span><span class="v">' + v + '</span></div>';
        if (Array.isArray(e.gauge)) {
            const n = e.gauge[0], r = e.gauge[1];
            return '<div class="gauge"><span class="sub">Range of motion · example</span>' + L('Typical', 100, 'var(--ok)', n + '°') + L('Restricted', Math.round(r / n * 100), 'var(--why)', r + '°') + '</div>';
        }
        if (e.gauge === 'pain') return '<div class="gauge"><span class="sub">Example</span>' + L('Lift arm', 25, 'var(--why)', 'painful') + L('Relaxed swing', 85, 'var(--ok)', 'ok') + '</div>';
        return '<div class="gauge"><span class="sub">Strength · example</span>' + L('Typical', 100, 'var(--ok)', '100%') + L('Weak', 50, 'var(--why)', '≈50%') + '</div>';
    }
    function page(e) {
        const i = EXS.indexOf(e), prev = EXS[(i + EXS.length - 1) % EXS.length], next = EXS[(i + 1) % EXS.length];
        const u = U(e), c = catOf(e.cat);
        return '<article class="wrap detail">' +
            '<a class="back" href="#' + e.cat + '">' + I.back + 'All exercises</a>' +
            '<header class="d-head"><div><span class="cat" style="color:' + cvar(e.cat) + '">' + e.n + ' · ' + esc(c.name) + '</span><h1>' + esc(e.name) + '</h1></div>' +
            '<span class="d-how"><span class="tag t-do" style="padding:4px"><span class="ic">' + I.do + '</span></span>' + esc(e.how) + '</span></header>' +

            '<div class="d-main">' +
                '<div class="stage"><span class="stage-tag ok">' + I.ok + ' Correct movement</span><div class="fig" id="stageFig"></div><div class="ctl">' +
                '<button class="pill" id="playBtn" type="button" aria-pressed="true">' + I.pause + ' Pause</button>' +
                '<button class="pill" id="lmBtn" type="button" aria-pressed="true">Angle marks</button></div></div>' +

                '<section class="meter-card" aria-label="How it is measured">' +
                    '<span class="mc-label"><span class="tag t-how" style="padding:3px"><span class="ic">' + I.how + '</span></span>How it’s measured</span>' +
                    '<div class="lmline">' + e.lm.map((l, k) => (k ? '<span class="lmsep"></span>' : '') + '<span class="lmdot"></span>' + esc(l)).join('') + '</div>' +
                    '<div style="font-weight:700">' + esc(e.measure) + '</div>' +
                    '<div class="big"><span class="val" id="val">0' + u + '</span><span class="reps">reps <b id="reps">0</b></span></div>' +
                    '<div><div class="bar" id="bar"><i class="fill" id="fill"></i></div>' +
                    '<div class="flow" id="flow"><div>Start</div><div>Reach ≥ ' + e.rule.c + u + '</div><div>Hold ' + (e.rule.h ? e.rule.h + ' s' : '—') + '</div><div>Return = +1</div></div></div>' +
                    '<div class="rules"><div><small>Start</small><b>&lt; ' + e.rule.r + u + '</b></div><div><small>Counts</small><b>≥ ' + e.rule.c + u + '</b></div><div><small>Hold</small><b>' + (e.rule.h ? e.rule.h + ' s' : '0 s') + '</b></div></div>' +
                    '<div class="cam">' + I.cam + 'Camera: ' + esc(e.cam) + '</div>' +
                '</section>' +
            '</div>' +

            '<div class="trio">' +
                '<section class="panel p-why"><h2><span class="ic">' + I.why + '</span>The problem</h2>' +
                    '<div class="pstage"><span class="stage-tag bad">' + I.x + ' ' + esc(e.pb.cap) + '</span><div class="fig" id="pbFig"></div>' +
                    '<div class="pb-read" id="pbRead"></div></div>' +
                    '<div class="problem"><div><span class="sub">Main problem</span><br><b>' + esc(e.problem) + '</b></div></div>' +
                    '<div><span class="sub">Often recommended for</span><div class="chips" style="margin-top:6px">' +
                        e.for.map(f => '<span class="chip' + (f.indexOf(FS) === 0 ? ' fs' : '') + '">' + esc(f) + '</span>').join('') + '</div></div>' +
                    gauge(e) +
                    '<div class="goal">' + I.check + esc(e.goal) + '</div>' +
                '</section>' +
                '<section class="panel p-do"><h2><span class="ic">' + I.do + '</span>What to do</h2><div class="frames">' +
                    e.frames.map((f, k) => '<figure><div class="fp"><div class="fig" id="fr' + k + '"></div></div><figcaption><i>' + (k + 1) + '</i>' + esc(f) + '</figcaption></figure>').join('') +
                '</div></section>' +
            '</div>' +
            '<nav class="pager" aria-label="More exercises"><a href="#ex-' + prev.slug + '">‹ ' + esc(prev.name) + '</a><a href="#ex-' + next.slug + '">' + esc(next.name) + ' ›</a></nav>' +
            '</article>';
    }

    /* ======================================================================
       ANIMATION LOOP — only figures on screen are animated
       ==================================================================== */
    let items = [], io = null, stage = null, lastT = 0;
    function watch(list) {
        if (!('IntersectionObserver' in window)) { list.forEach(x => x.vis = true); return; }
        io = new IntersectionObserver(en => en.forEach(x => { const it = list.filter(k => k.host === x.target)[0]; if (it) it.vis = x.isIntersecting; }), { rootMargin: '60px' });
        list.forEach(x => io.observe(x.host));
    }
    function startHome() {
        items = [];
        document.querySelectorAll('.fig[data-id]').forEach((host, k) => {
            const e = EXS.filter(x => x.id === host.getAttribute('data-id'))[0];
            const fig = mountFig(host, e, false);
            paintNormal(fig, e, normalAt(e, reduce ? 2.6 : 0), false);
            items.push({ host, fig, e, off: k * 0.61, vis: false });
        });
        /* problem insets: still pose at the sticking point, glow pulses in CSS */
        document.querySelectorAll('.fig-pb[data-id]').forEach(host => {
            const e = EXS.filter(x => x.id === host.getAttribute('data-id'))[0];
            const fig = mountFig(host, e, false);
            const info = EF.info(e.id) || { dirs: ['both'] };
            fig.set({ theta: e.rule.c * e.pb.k, dir: info.dirs[0], labels: false });
            fig.glow(true, 1);
        });
        if (!reduce) watch(items);
    }
    function tick(now) {
        requestAnimationFrame(tick);
        if (now - lastT < 33) return;
        const t = now / 1000, cardFrame = (Math.round(now / 33) % 2) === 0;   /* cards at ~15 fps keep the 3D avatar light */
        lastT = now;
        if (cardFrame) items.forEach(it => { if (it.vis) paintNormal(it.fig, it.e, normalAt(it.e, t + it.off), false); });
        if (stage) stage.step(t);
    }

    function startDetail(e) {
        const u = U(e), full = Math.max(e.rule.c * 1.3, peakOf(e) * 1.08);
        const fig = mountFig($('#stageFig'), e, true), pfig = mountFig($('#pbFig'), e, true);
        const bar = $('#bar'), fill = $('#fill'), val = $('#val'), reps = $('#reps'), flow = Array.from($('#flow').children), pread = $('#pbRead');
        bar.insertAdjacentHTML('beforeend', '<span class="tk r" style="left:' + (e.rule.r / full * 100) + '%"><span>' + e.rule.r + u + '</span></span>' +
            '<span class="tk c" style="left:' + (e.rule.c / full * 100) + '%"><span>' + e.rule.c + u + '</span></span>');
        let playing = !reduce, marks = true, t0 = performance.now() / 1000, paused = 0, pausedAt = 0;
        let st = 0, holdStart = 0, count = 0, doneUntil = 0;
        function paint(t) {
            const s = normalAt(e, t);
            if (!marks) fig.set({ theta: s.theta, dir: s.dir, labels: false, arrow: s.phase === 'go' ? 'out' : null });
            else paintNormal(fig, e, s, true);
            const v = s.theta;
            val.textContent = Math.round(v) + u;
            fill.style.width = Math.min(100, v / full * 100) + '%';
            fill.classList.toggle('on', v >= e.rule.c);
            if ((st === 0 || st === 1) && v >= e.rule.c) { st = 2; holdStart = t; }
            else if (st === 0 && v > e.rule.r) st = 1;
            else if (st === 1 && v <= e.rule.r) st = 0;
            if (st === 2 && t - holdStart >= e.rule.h) st = 3;
            if (st === 3 && v <= e.rule.r) { st = 0; count++; reps.textContent = count; doneUntil = t + 0.8; }
            flow.forEach((f, k) => { f.className = (t < doneUntil && k === 3) ? 'done' : (k === st && !(t < doneUntil) ? 'on' : ''); });
            /* the problem */
            const p = problemAt(e, t);
            paintProblem(pfig, e, p, t);
            pread.innerHTML = '<b>' + Math.round(p.theta) + u + '</b> of ' + e.rule.c + u + ' needed' + (p.phase === 'stuck' ? ' <em>· can’t go further</em>' : '');
        }
        stage = { step: t => { if (playing) paint(t - t0 - paused); } };
        paint(reduce ? 2.6 : 0);
        $('#playBtn').addEventListener('click', function () {
            const now = performance.now() / 1000;
            if (playing) { playing = false; pausedAt = now; } else { paused += now - pausedAt; playing = true; }
            this.innerHTML = playing ? I.pause + ' Pause' : I.play + ' Play';
            this.setAttribute('aria-pressed', String(playing));
        });
        $('#lmBtn').addEventListener('click', function () {
            marks = !marks; this.setAttribute('aria-pressed', String(marks));
            if (!playing) paint(pausedAt - t0 - paused);
        });
        const info = EF.info(e.id) || { dirs: ['both'] }, pk = peakOf(e);
        [[0, null], [pk * 0.5, 'out'], [pk, null]].forEach((q, k) => {
            const f = mountFig($('#fr' + k), e, k > 0);
            f.set({ theta: q[0], dir: info.dirs[0], target: k === 2 ? e.rule.c : null, arrow: q[1], labels: k === 2 });
        });
    }

    /* ======================================================================
       ROUTER
       ==================================================================== */
    function render() {
        if (io) io.disconnect();
        io = null; items = []; stage = null;
        const h = location.hash.replace('#', '');
        const view = $('#view');
        const e = h.indexOf('ex-') === 0 ? EXS.filter(x => x.slug === h.slice(3))[0] : null;
        if (e) {
            view.innerHTML = page(e);
            document.title = e.name + ' · Rehab AI Exercise Guide';
            window.scrollTo(0, 0);
            startDetail(e);
        } else {
            view.innerHTML = home();
            document.title = 'Rehab AI Exercise Guide';
            startHome();
            const target = h && document.getElementById(h);
            if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
        }
    }
    document.addEventListener('DOMContentLoaded', function () {
        $('#jump').innerHTML = CATS.map(c => '<a href="#' + c.id + '"><i style="background:' + cvar(c.id) + '"></i>' + esc(c.name) + '</a>').join('');
        window.addEventListener('hashchange', render);
        render();
        requestAnimationFrame(tick);
    });
})();
