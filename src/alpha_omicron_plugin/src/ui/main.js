/**
 * main.js — Alpha Omicron plugin UI
 *
 * Parameter conventions (must match PluginProcessor APVTS):
 *   outputVolume : normalised 0..1  →  -24 dB .. +6 dB
 *   bypass       : 0.0 = effect active, 1.0 = bypassed
 */

const OUTPUT_MIN = -24.0;
const OUTPUT_MAX =   6.0;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const canvas     = document.getElementById('knob');
const ctx        = canvas.getContext('2d');
const knobWrap   = document.getElementById('knob-wrap');
const valEl      = document.getElementById('val');
const led        = document.getElementById('led');
const stomp      = document.getElementById('stomp');
const stompLabel = document.getElementById('stomp-label');

// ── State ─────────────────────────────────────────────────────────────────────

let norm      = 0.6;   // normalised output volume (~0 dB default)
let active    = false; // true = effect active (bypass param = 0.0)
let dragging  = false;
let dragStartY    = 0;
let dragStartNorm = 0;

// ── Canvas knob drawing ───────────────────────────────────────────────────────

function drawKnob(n) {
    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r  = W / 2 - 18; // knob radius
    const or = r + 16;      // outer tick ring radius

    ctx.clearRect(0, 0, W, H);

    // Graduation ticks (printed on the faceplate, outside the knob)
    const TICKS    = 11;
    const startRad = 225 * Math.PI / 180;
    const sweepRad = 270 * Math.PI / 180;

    for (let i = 0; i < TICKS; i++) {
        const t     = i / (TICKS - 1);
        const a     = startRad + t * sweepRad;
        const large = i % 5 === 0;
        const r1    = or;
        const r2    = or - (large ? 13 : 8);

        ctx.strokeStyle = t <= n ? '#00b8b2' : '#303030';
        ctx.lineWidth   = large ? 2 : 1.2;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
    }

    // Drop shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur    = 20;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle     = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Knob body — radial gradient for 3D depth
    const grad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.3, r * 0.04, cx, cy, r);
    grad.addColorStop(0,   '#484848');
    grad.addColorStop(0.5, '#272727');
    grad.addColorStop(1,   '#131313');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Knob rim
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Top specular arc (light catching the curved surface)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Decorative inner ring
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    // Pointer dot (orange, glowing)
    const pAngle = (225 + n * 270) * Math.PI / 180;
    const pR     = r - 11;

    ctx.save();
    ctx.shadowColor = '#00b8b2';
    ctx.shadowBlur  = 9;
    ctx.fillStyle   = '#00b8b2';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(pAngle) * pR, cy + Math.sin(pAngle) * pR, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderKnob(n) {
    norm = n;
    drawKnob(n);
    const db = OUTPUT_MIN + n * (OUTPUT_MAX - OUTPUT_MIN);
    valEl.textContent = (db >= 0 ? '+' : '') + db.toFixed(1) + ' dB';
}

function renderBypass(a) {
    active = a;
    led.classList.toggle('on', a);
    stompLabel.classList.toggle('on', a);
    stompLabel.textContent = a ? 'ACTIVE' : 'BYPASS';
    stomp.setAttribute('aria-pressed', String(a));
}

// ── Knob interaction ──────────────────────────────────────────────────────────

const DRAG_SENS      = 0.005; // normalised units per pixel
const DRAG_SENS_FINE = 0.001; // with shift held

knobWrap.addEventListener('mousedown', e => {
    dragging      = true;
    dragStartY    = e.clientY;
    dragStartNorm = norm;
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
});

document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const sens = e.shiftKey ? DRAG_SENS_FINE : DRAG_SENS;
    const n    = Math.max(0, Math.min(1, dragStartNorm + (dragStartY - e.clientY) * sens));
    renderKnob(n);
    sendOutputVolume(n);
});

document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
});

// Double-click resets to 0 dB
knobWrap.addEventListener('dblclick', () => {
    const zero = -OUTPUT_MIN / (OUTPUT_MAX - OUTPUT_MIN);
    renderKnob(zero);
    sendOutputVolume(zero);
});

// Scroll wheel support (shift for fine)
knobWrap.addEventListener('wheel', e => {
    e.preventDefault();
    const step = e.shiftKey ? DRAG_SENS_FINE : 0.012;
    const n    = Math.max(0, Math.min(1, norm - Math.sign(e.deltaY) * step));
    renderKnob(n);
    sendOutputVolume(n);
}, { passive: false });

// ── Footswitch ────────────────────────────────────────────────────────────────

stomp.addEventListener('click', () => {
    renderBypass(!active);
    sendBypass(!active);
});

// ── JUCE bridge ───────────────────────────────────────────────────────────────

function sendOutputVolume(n) {
    if (typeof window.__JUCE__ === 'undefined') return;
    window.__JUCE__.initialisationData.outputVolume.setValue(n);
}

function sendBypass(a) {
    if (typeof window.__JUCE__ === 'undefined') return;
    // bypass param: 0.0 = effect active, 1.0 = bypassed
    window.__JUCE__.initialisationData.bypass.setValue(a ? 0.0 : 1.0);
}

function initBridge() {
    if (typeof window.__JUCE__ === 'undefined') {
        renderKnob(norm);
        renderBypass(false);
        return;
    }

    const outRelay = window.__JUCE__.initialisationData.outputVolume;
    const byRelay  = window.__JUCE__.initialisationData.bypass;

    renderKnob(outRelay.getNormalisedValue());
    renderBypass(byRelay.getValue() < 0.5);

    // Stay in sync with DAW automation
    outRelay.addEventListener('valueChanged', e => renderKnob(e.value));
    byRelay.addEventListener('valueChanged',  e => renderBypass(e.value < 0.5));
}

initBridge();