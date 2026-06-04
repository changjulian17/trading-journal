'use strict';

const _D = '—';

function ti() {
  var d = new Date(), tz = d.getTimezoneOffset() * 6e4;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function bs() {
  return { asset: '', side: 'Long', entry: null, totalQty: null, stop1: null, qty1: null, stop2: null, qty2: null, takeProfit: null, notes: '' };
}

function bh() {
  return { ticker: '', side: 'Long', qty: null, hedgeQty: null, multiplier: 100, delta: null, premAdj: 0, spot: null, stop1: null, qty1: null, stop2: null, qty2: null, takeProfit: null };
}

function n(v) {
  if (v === null || v === void 0 || v === '') return null;
  var x = Number(v);
  return isNaN(x) ? null : x;
}

function fm(x, d) {
  if (x === null || x === void 0 || isNaN(x)) return _D;
  return x.toLocaleString('en-GB', { minimumFractionDigits: d || 2, maximumFractionDigits: d || 2 });
}

function $m(x) {
  if (x === null || x === void 0 || isNaN(x)) return _D;
  var v = Number(x);
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cS(p) {
  var e = n(p.entry), sp1 = n(p.stop1), q1 = n(p.qty1) || 0, sp2 = n(p.stop2), q2 = n(p.qty2) || 0, tq = n(p.totalQty), tp = n(p.takeProfit);
  var rd = null, wt = null, cb = null, rr = null;
  if (e != null && sp1 != null && q1 > 0) {
    rd = Math.abs(e - sp1) * q1;
    wt = q1;
    if (sp2 != null && q2 > 0) { rd += Math.abs(e - sp2) * q2; wt += q2; }
  }
  if (e != null && sp1 != null && tp != null && sp1 !== e)
    rr = -(tp - e) / (sp1 - e);
  return { ra: rd, q: wt, cb: e != null ? e * (wt || 0) : null, rr: rr, vq: tq != null && wt != null ? Math.abs(wt - tq) < 0.001 : true };
}

function cH(p) {
  var q = n(p.qty), hq = n(p.hedgeQty), m = n(p.multiplier), d = n(p.delta), sp = n(p.spot),
      s1 = n(p.stop1), q1 = n(p.qty1) || 0, s2 = n(p.stop2), q2 = n(p.qty2) || 0, tp = n(p.takeProfit);
  var cd = null, risk = null, rr = null;
  if (q != null && m != null && d != null) cd = q * m * d;
  if (cd != null && sp != null && (s1 != null || s2 != null)) {
    var l1 = (s1 != null && q1 != null) ? s1 * q1 : 0;
    var l2 = (s2 != null && q2 != null) ? s2 * q2 : 0;
    var sz = hq || Math.abs(cd);
    risk = Math.abs(l1 + l2) - sp * sz;
  }
  if (risk != null && risk !== 0 && tp != null && cd != null)
    rr = Math.abs((tp - sp) * Math.abs(cd) / risk);
  return { cd: cd, risk: risk, rr: rr };
}

module.exports = { n, fm, $m, esc, cS, cH, bs, bh, ti, _D };
