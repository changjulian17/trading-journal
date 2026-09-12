'use strict';

const _D = '—';

function ti() {
  var d = new Date(), tz = d.getTimezoneOffset() * 6e4;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function bs() {
  return { asset: '', side: 'Long', entry: null, spot: null, totalQty: null, stop1: null, qty1: null, stop2: null, qty2: null, takeProfit: null, notes: '', entryLocked: false, stop1Hit: false, stop2Hit: false };
}

function bh() {
  return { ticker: '', structureType: '', openedAt: '', side: 'Long', qty: null, hedgeQty: null, multiplier: 100, delta: null, gamma: null, vega: null, theta: null, iv: null, premAdj: 0, spot: null, expiry: '', strike: null, stop1: null, qty1: null, stop2: null, qty2: null, takeProfit: null,
    theoEntry: null, ivRank: null, trailingRv: null, rvForecast: null, commission: null, rehedgeMode: 'delta', rehedgeValue: null, timeExitDte: null, notes: '' };
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
  var rd = null, wt = null, rr = null;
  if (e != null && sp1 != null && q1 > 0) {
    var l1 = sp1 * q1, l2 = 0;
    wt = q1;
    if (sp2 != null && q2 > 0) { l2 = sp2 * q2; wt += q2; }
    rd = Math.abs(l1 + l2) - e * wt;
  }
  if (rd != null && rd !== 0 && tp != null)
    rr = Math.abs((tp - e) * wt / rd);
  var es = null, wsum = 0, wq = 0;
  if (sp1 != null && q1 > 0) { wsum += sp1 * q1; wq += q1; }
  if (sp2 != null && q2 > 0) { wsum += sp2 * q2; wq += q2; }
  if (wq > 0) es = wsum / wq;
  return { ra: rd, q: wt, rr: rr, vq: tq != null && wt != null ? Math.abs(wt - tq) < 0.001 : true, es: es };
}

function cH(p, asOf) {
  var q = n(p.qty), hq = n(p.hedgeQty), m = n(p.multiplier), d = n(p.delta), g = n(p.gamma), v = n(p.vega), th = n(p.theta),
      sp = n(p.spot), s1 = n(p.stop1), q1 = n(p.qty1) || 0, s2 = n(p.stop2), q2 = n(p.qty2) || 0, tp = n(p.takeProfit),
      strike = n(p.strike);
  // Delta/Gamma/Vega/Theta are quoted "per contract" on the standard 100-share basis (as
  // long-holder greeks) — sh rescales that to the actual Multiplier (100 -> 1x), and Side
  // flips the sign to turn the quoted-long greek into this position's actual exposure.
  var sign = p.side === 'Short' ? -1 : 1, sh = m != null ? m / 100 : 1;
  var cd = null, posGamma = null, posVega = null, posTheta = null, risk = null, rr = null, dte = null, mny = null;
  if (q != null && d != null) cd = sign * q * sh * d - (hq != null ? hq : 0);
  if (q != null && g != null) posGamma = sign * q * sh * g;
  if (q != null && v != null) posVega = sign * q * sh * v;
  if (q != null && th != null) posTheta = sign * q * sh * th;
  if (cd != null && sp != null && (s1 != null || s2 != null)) {
    var l1 = (s1 != null && q1 != null) ? s1 * q1 : 0;
    var l2 = (s2 != null && q2 != null) ? s2 * q2 : 0;
    var sz = Math.abs(cd);
    risk = Math.abs(l1 + l2) - sp * sz;
  }
  if (risk != null && risk !== 0 && tp != null && cd != null)
    rr = Math.abs((tp - sp) * Math.abs(cd) / risk);
  if (p.expiry) {
    var ed = new Date(p.expiry + 'T00:00:00'), jd = new Date((asOf || ti()) + 'T00:00:00');
    if (!isNaN(ed) && !isNaN(jd)) dte = Math.round((ed - jd) / 86400000);
  }
  if (sp != null && sp !== 0 && strike != null) mny = (strike - sp) / sp;
  // Edge is the actual gamma-scalp thesis: your forward RV view vs. the IV you paid.
  // Deliberately compared against RV forecast, never trailingRv (that's backward-looking, a
  // fact, not a view) — see README "Gamma-Scalp Initial Conditions".
  var rvf = n(p.rvForecast), iv = n(p.iv);
  var edge = (rvf != null && iv != null) ? (rvf - iv) : null;
  // Max loss only has a clean definition for a long (defined-risk) leg — premium paid is the
  // cap. A short leg's risk is undefined/unbounded here, so it's left null rather than guessed.
  var prem = n(p.premAdj);
  var maxLoss = (p.side !== 'Short' && prem != null && q != null) ? prem * q * sh : null;
  return { cd: cd, posGamma: posGamma, posVega: posVega, posTheta: posTheta, risk: risk, rr: rr, dte: dte, mny: mny, edge: edge, maxLoss: maxLoss };
}

// Groups hedged legs into one row per structure (same ticker + expiry), matching the
// blotter-discipline convention of logging a straddle/strangle as one record, not N.
// weightedIv is vega-weighted across legs (falls back to the lone leg's IV when no vega is
// available to weight with). premiumTotal/theoTotal are net signed sums (Short legs subtract).
function groupStructures(hedged, asOf) {
  var groups = {}, order = [];
  (hedged || []).forEach(function(p, idx) {
    var key = (p.ticker || '').toUpperCase() + '|' + (p.expiry || '');
    if (!groups[key]) { groups[key] = { ticker: p.ticker || '', expiry: p.expiry || '', structureType: p.structureType || '', legs: [] }; order.push(key); }
    groups[key].legs.push({ idx: idx, leg: p });
  });
  return order.map(function(key) {
    var legs = groups[key].legs;
    var wSum = 0, wIvSum = 0, premTotal = 0, theoTotal = 0, rvVals = [], cdTotal = 0, cdSeen = false, dte = null;
    legs.forEach(function(entry) {
      var p = entry.leg, r = cH(p, asOf), sign = p.side === 'Short' ? -1 : 1;
      var m = n(p.multiplier), sh = m != null ? m / 100 : 1, q = n(p.qty);
      var w = r.posVega != null ? Math.abs(r.posVega) : null, iv = n(p.iv);
      if (w != null && iv != null) { wSum += w; wIvSum += w * iv; }
      var prem = n(p.premAdj);
      if (prem != null && q != null) premTotal += sign * prem * q * sh;
      var theo = n(p.theoEntry);
      if (theo != null && q != null) theoTotal += sign * theo * q * sh;
      var rv = n(p.rvForecast);
      if (rv != null) rvVals.push(rv);
      if (r.cd != null) { cdTotal += r.cd; cdSeen = true; }
      if (dte == null && r.dte != null) dte = r.dte; // legs of one structure share an expiry -> same DTE
    });
    var weightedIv = wSum > 0 ? wIvSum / wSum : (n(legs[0].leg.iv) != null ? n(legs[0].leg.iv) : null);
    var rvForecast = rvVals.length ? rvVals.reduce(function(a, b) { return a + b; }, 0) / rvVals.length : null;
    var edge = (rvForecast != null && weightedIv != null) ? (rvForecast - weightedIv) : null;
    return { ticker: groups[key].ticker, expiry: groups[key].expiry, structureType: groups[key].structureType, dte: dte, legIdx: legs.map(function(e) { return e.idx; }), legCount: legs.length, weightedIv: weightedIv, rvForecast: rvForecast, edge: edge, premiumTotal: premTotal, theoTotal: theoTotal, cd: cdSeen ? cdTotal : null };
  });
}

async function fetchSpot(t, _fetch) {
  var fetcher = _fetch || (typeof fetch !== 'undefined' ? fetch : null);
  var yahooUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(t) + '?interval=1d&range=1d';
  // Try direct first (fast) — works if Yahoo allows the browser origin
  try {
    var r = await fetcher(yahooUrl);
    if (r.ok) {
      var j = await r.json();
      var p = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta && j.chart.result[0].meta.regularMarketPrice;
      if (p != null) return p;
    }
  } catch(e) {}
  // Fall back to AllOrigins CORS proxy
  var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(yahooUrl);
  var r2 = await fetcher(proxyUrl);
  if (!r2.ok) throw new Error('Proxy error ' + r2.status);
  var j2 = await r2.json();
  var p2 = null;
  try { var inner = JSON.parse(j2.contents); p2 = inner && inner.chart && inner.chart.result && inner.chart.result[0] && inner.chart.result[0].meta && inner.chart.result[0].meta.regularMarketPrice; } catch(e) {}
  if (p2 == null) throw new Error('No price for ' + t);
  return p2;
}

module.exports = { n, fm, $m, esc, cS, cH, bs, bh, ti, _D, fetchSpot, groupStructures };
