'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { n, fm, $m, esc, cS, cH, bs, bh, ti, _D } = require('../logic.js');

// ---------------------------------------------------------------------------
// n() — number parser
// ---------------------------------------------------------------------------
test('n: null returns null', () => { assert.equal(n(null), null); });
test('n: undefined returns null', () => { assert.equal(n(undefined), null); });
test('n: empty string returns null', () => { assert.equal(n(''), null); });
test('n: NaN string returns null', () => { assert.equal(n('abc'), null); });
test('n: integer string', () => { assert.equal(n('42'), 42); });
test('n: float string', () => { assert.equal(n('3.14'), 3.14); });
test('n: numeric 0 returns 0', () => { assert.equal(n(0), 0); });
test('n: negative number', () => { assert.equal(n(-5), -5); });

// ---------------------------------------------------------------------------
// fm() — number formatter
// ---------------------------------------------------------------------------
test('fm: null returns dash', () => { assert.equal(fm(null), _D); });
test('fm: undefined returns dash', () => { assert.equal(fm(undefined), _D); });
test('fm: NaN returns dash', () => { assert.equal(fm(NaN), _D); });
test('fm: formats with 2 decimals by default', () => { assert.equal(fm(1000), '1,000.00'); });
test('fm: respects custom decimal places', () => { assert.equal(fm(1.5, 4), '1.5000'); });
test('fm: rounds correctly', () => { assert.equal(fm(1.005, 2), '1.01'); });

// ---------------------------------------------------------------------------
// $m() — money formatter
// ---------------------------------------------------------------------------
test('$m: null returns dash', () => { assert.equal($m(null), _D); });
test('$m: undefined returns dash', () => { assert.equal($m(undefined), _D); });
test('$m: NaN returns dash', () => { assert.equal($m(NaN), _D); });
test('$m: positive amount', () => { assert.equal($m(1500), '$1,500.00'); });
test('$m: negative amount prefixes minus outside $', () => { assert.equal($m(-250), '-$250.00'); });
test('$m: zero', () => { assert.equal($m(0), '$0.00'); });

// ---------------------------------------------------------------------------
// esc() — HTML escaper
// ---------------------------------------------------------------------------
test('esc: escapes ampersand', () => { assert.equal(esc('a&b'), 'a&amp;b'); });
test('esc: escapes double-quote', () => { assert.equal(esc('"x"'), '&quot;x&quot;'); });
test('esc: escapes less-than', () => { assert.equal(esc('<div>'), '&lt;div&gt;'); });
test('esc: escapes greater-than', () => { assert.equal(esc('>tag'), '&gt;tag'); });
test('esc: null/undefined coerces to empty string', () => { assert.equal(esc(null), ''); });
test('esc: plain string unchanged', () => { assert.equal(esc('hello'), 'hello'); });

// ---------------------------------------------------------------------------
// bs() / bh() — default position shapes
// ---------------------------------------------------------------------------
test('bs: returns correct keys with null numerics', () => {
  const p = bs();
  assert.equal(p.side, 'Long');
  assert.equal(p.entry, null);
  assert.equal(p.totalQty, null);
  assert.equal(p.notes, '');
});
test('bs: returns fresh object each call', () => {
  assert.notEqual(bs(), bs());
});
test('bh: returns correct keys with defaults', () => {
  const p = bh();
  assert.equal(p.multiplier, 100);
  assert.equal(p.premAdj, 0);
  assert.equal(p.delta, null);
});
test('bh: returns fresh object each call', () => {
  assert.notEqual(bh(), bh());
});

// ---------------------------------------------------------------------------
// ti() — today's date
// ---------------------------------------------------------------------------
test('ti: returns YYYY-MM-DD format', () => {
  assert.match(ti(), /^\d{4}-\d{2}-\d{2}$/);
});
test('ti: matches today in local timezone', () => {
  const d = new Date(), tz = d.getTimezoneOffset() * 6e4;
  const expected = new Date(d - tz).toISOString().slice(0, 10);
  assert.equal(ti(), expected);
});

// ---------------------------------------------------------------------------
// cS() — simple position calculator
// ---------------------------------------------------------------------------
test('cS: empty position returns all nulls, vq true', () => {
  const r = cS(bs());
  assert.equal(r.ra, null);
  assert.equal(r.q, null);
  assert.equal(r.rr, null);
  assert.equal(r.vq, true);
});

test('cS: entry + stop1 + qty1 computes risk', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 10 });
  assert.equal(r.ra, 100);   // |100-90| * 10
  assert.equal(r.q, 10);
});

test('cS: short position stop above entry', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 110, qty1: 5, side: 'Short' });
  assert.equal(r.ra, 50);    // |100-110| * 5
});

test('cS: two stops combine risk and qty', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 5, stop2: 95, qty2: 5 });
  assert.equal(r.ra, 75);    // 10*5 + 5*5
  assert.equal(r.q, 10);
});

test('cS: cost basis = entry * total qty', () => {
  const r = cS({ ...bs(), entry: 50, stop1: 45, qty1: 20 });
  assert.equal(r.cb, 1000);
});

test('cS: R/R ratio with take profit', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 10, takeProfit: 120 });
  // rr = -(120-100)/(90-100) = -(-20)/(-10) wait: -(tp-e)/(sp1-e) = -(120-100)/(90-100) = -20/-10 = 2
  assert.equal(r.rr, 2);
});

test('cS: vq true when qty matches totalQty', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 10, totalQty: 10 });
  assert.equal(r.vq, true);
});

test('cS: vq false when qty does not match totalQty', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 8, totalQty: 10 });
  assert.equal(r.vq, false);
});

test('cS: vq true when totalQty is null (no validation)', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 10, totalQty: null });
  assert.equal(r.vq, true);
});

test('cS: stop1 === entry produces no R/R', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 100, qty1: 10, takeProfit: 120 });
  assert.equal(r.rr, null);
});

test('cS: no stop → no risk, no qty', () => {
  const r = cS({ ...bs(), entry: 100, qty1: 10 });
  assert.equal(r.ra, null);
  assert.equal(r.q, null);
});

test('cS: qty1=0 → no risk computed', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 0 });
  assert.equal(r.ra, null);
});

test('cS: string inputs are parsed via n()', () => {
  const r = cS({ ...bs(), entry: '100', stop1: '90', qty1: '10' });
  assert.equal(r.ra, 100);
});

// ---------------------------------------------------------------------------
// cH() — hedged / options position calculator
// ---------------------------------------------------------------------------
test('cH: empty position returns all nulls', () => {
  const r = cH(bh());
  assert.equal(r.cd, null);
  assert.equal(r.risk, null);
  assert.equal(r.rr, null);
});

test('cH: cash delta = qty * multiplier * delta (no hedge)', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: 0.5 });
  assert.equal(r.cd, 100);  // 2 * 100 * 0.5 - 0
});

test('cH: cash delta subtracts hedgeQty', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: 0.5, hedgeQty: 80 });
  assert.equal(r.cd, 20);  // 2 * 100 * 0.5 - 80
});

test('cH: risk with stop1 and hedgeQty', () => {
  // cd = 2*100*0.5 - 80 = 20, spot=50, hedgeQty=80
  // sz=80 (hedgeQty overrides |cd|), l1=45*80=3600, risk=|3600|-50*80=-400
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: 0.5, spot: 50, stop1: 45, qty1: 80, hedgeQty: 80 });
  assert.equal(r.risk, -400);
});

test('cH: risk uses |cd| as sz when hedgeQty is null', () => {
  // cd = 1*100*0.5 = 50, spot=10, stop1=9, qty1=50, sz=|50|=50
  // risk = |9*50| - 10*50 = 450 - 500 = -50
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 0.5, spot: 10, stop1: 9, qty1: 50 });
  assert.equal(r.risk, -50);
});

test('cH: no R/R when risk is zero', () => {
  // make risk = 0: |l1| = sp*sz
  // cd=100, sp=9, stop1=9, qty1=100 (sz=100, l1=900, sp*sz=900) → risk=0
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 1, spot: 9, stop1: 9, qty1: 100, takeProfit: 20 });
  assert.equal(r.rr, null);
});

test('cH: R/R computed when risk non-zero', () => {
  // cd=100, sp=10, stop1=8, qty1=100, sz=100
  // risk = |800| - 10*100 = 800 - 1000 = -200
  // tp=15, rr = |(15-10)*100 / -200| = |500/-200| = 2.5
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 1, spot: 10, stop1: 8, qty1: 100, takeProfit: 15 });
  assert.equal(r.rr, 2.5);
});

test('cH: missing delta → no cash delta', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100 });
  assert.equal(r.cd, null);
});

test('cH: two stops sum for risk', () => {
  // cd=50, sp=10, stop1=9, qty1=25, stop2=8, qty2=25, sz=50
  // l1=9*25=225, l2=8*25=200, risk=|225+200|-10*50 = 425-500=-75
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 0.5, spot: 10, stop1: 9, qty1: 25, stop2: 8, qty2: 25 });
  assert.equal(r.risk, -75);
});
