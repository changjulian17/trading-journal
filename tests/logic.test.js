'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { n, fm, $m, esc, cS, cH, bs, bh, ti, _D, fetchSpot, groupStructures } = require('../logic.js');

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
  assert.equal(p.gamma, null);
  assert.equal(p.vega, null);
  assert.equal(p.theta, null);
  assert.equal(p.iv, null);
  assert.equal(p.theoEntry, null);
  assert.equal(p.ivRank, null);
  assert.equal(p.trailingRv, null);
  assert.equal(p.rvForecast, null);
  assert.equal(p.commission, null);
  assert.equal(p.rehedgeMode, 'delta');
  assert.equal(p.rehedgeValue, null);
  assert.equal(p.timeExitDte, null);
  assert.equal(p.notes, '');
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
  assert.equal(r.ra, -100);  // |90*10| - 100*10 = 900-1000
  assert.equal(r.q, 10);
});

test('cS: two stops combine risk and qty', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 5, stop2: 95, qty2: 5 });
  assert.equal(r.ra, -75);   // |90*5+95*5| - 100*10 = 925-1000
  assert.equal(r.q, 10);
});

test('cS: short position risk is positive', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 110, qty1: 5, side: 'Short' });
  assert.equal(r.ra, 50);    // |110*5| - 100*5 = 550-500
});

test('cS: R/R ratio with take profit', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 10, takeProfit: 120 });
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
  assert.equal(r.ra, -100);  // |90*10| - 100*10
});

// ---------------------------------------------------------------------------
// cS() — es (effective/weighted-average stop price)
// ---------------------------------------------------------------------------
test('es: empty position returns null', () => {
  const r = cS(bs());
  assert.equal(r.es, null);
});

test('es: single stop equals that stop price', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 10 });
  assert.equal(r.es, 90);
});

test('es: two equal-qty stops average evenly', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 5, stop2: 100, qty2: 5 });
  assert.equal(r.es, 95); // (90*5 + 100*5) / 10
});

test('es: two unequal-qty stops weight toward the larger quantity', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 30, stop2: 100, qty2: 10 });
  assert.equal(r.es, 92.5); // (90*30 + 100*10) / 40
});

test('es: only stop2 set (no stop1) still computes', () => {
  const r = cS({ ...bs(), entry: 100, stop2: 95, qty2: 20 });
  assert.equal(r.es, 95);
});

test('es: stop set but qty is 0 is excluded from the average', () => {
  const r = cS({ ...bs(), entry: 100, stop1: 90, qty1: 0, stop2: 95, qty2: 10 });
  assert.equal(r.es, 95);
});

test('es: independent of entry/takeProfit — computes even without entry', () => {
  const r = cS({ stop1: 90, qty1: 5, stop2: 100, qty2: 5 });
  assert.equal(r.es, 95);
});

test('es: string inputs are parsed via n()', () => {
  const r = cS({ ...bs(), stop1: '90', qty1: '5', stop2: '100', qty2: '5' });
  assert.equal(r.es, 95);
});

// ---------------------------------------------------------------------------
// cH() — hedged / options position calculator
// Delta/Gamma/Vega/Theta are entered "per contract" on the standard 100-share
// basis (as a broker/vol-book would quote them for a long holder) — e.g. an
// ATM call is delta ≈ 50, not 0.50. Multiplier rescales that (100 -> 1x) and
// Side (Long/Short) flips the sign to get the actual position exposure.
// ---------------------------------------------------------------------------
test('cH: empty position returns all nulls', () => {
  const r = cH(bh());
  assert.equal(r.cd, null);
  assert.equal(r.posGamma, null);
  assert.equal(r.posVega, null);
  assert.equal(r.posTheta, null);
  assert.equal(r.risk, null);
  assert.equal(r.rr, null);
  assert.equal(r.dte, null);
  assert.equal(r.mny, null);
});

test('cH: position delta = qty * (multiplier/100) * delta (no hedge)', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: 50 });
  assert.equal(r.cd, 100);  // 2 * 1 * 50 - 0
});

test('cH: position delta subtracts hedgeQty', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: 50, hedgeQty: 80 });
  assert.equal(r.cd, 20);  // 2 * 1 * 50 - 80
});

test('cH: multiplier other than 100 rescales the per-contract greek', () => {
  // sh = 250/100 = 2.5 -> cd = 1 * 2.5 * 50 = 125
  const r = cH({ ...bh(), qty: 1, multiplier: 250, delta: 50 });
  assert.equal(r.cd, 125);
});

test('cH: Short flips the sign of the quoted-long delta', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: 50, side: 'Short' });
  assert.equal(r.cd, -100);  // -1 * 2 * 1 * 50 - 0
});

test('cH: Short a put (negative delta) gives positive exposure', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: -50, side: 'Short' });
  assert.equal(r.cd, 100);  // -1 * 2 * 1 * -50 - 0
});

test('cH: position gamma/vega/theta scale the same way as delta', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, gamma: 1.5, vega: 40, theta: -6 });
  assert.equal(r.posGamma, 3);     // 2 * 1 * 1.5
  assert.equal(r.posVega, 80);     // 2 * 1 * 40
  assert.equal(r.posTheta, -12);   // 2 * 1 * -6
});

test('cH: Short flips sign for gamma/vega/theta too (short theta collects decay)', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100, gamma: 1.5, vega: 40, theta: -6, side: 'Short' });
  assert.equal(r.posGamma, -3);
  assert.equal(r.posVega, -80);
  assert.equal(r.posTheta, 12);    // short theta is positive P&L per day
});

test('cH: risk with stop1 and hedgeQty', () => {
  // cd = 2*1*50 - 80 = 20, sz=|cd|=20, spot=50
  // l1=45*80=3600, risk=|3600| - 50*20 = 3600 - 1000 = 2600
  const r = cH({ ...bh(), qty: 2, multiplier: 100, delta: 50, spot: 50, stop1: 45, qty1: 80, hedgeQty: 80 });
  assert.equal(r.risk, 2600);
});

test('cH: risk uses |cd| as sz', () => {
  // cd = 1*1*50 = 50, spot=10, stop1=9, qty1=50, sz=|50|=50
  // risk = |9*50| - 10*50 = 450 - 500 = -50
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 50, spot: 10, stop1: 9, qty1: 50 });
  assert.equal(r.risk, -50);
});

test('cH: no R/R when risk is zero', () => {
  // make risk = 0: |l1| = sp*sz
  // cd=100, sp=9, stop1=9, qty1=100 (sz=100, l1=900, sp*sz=900) → risk=0
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 100, spot: 9, stop1: 9, qty1: 100, takeProfit: 20 });
  assert.equal(r.rr, null);
});

test('cH: R/R computed when risk non-zero', () => {
  // cd=100, sp=10, stop1=8, qty1=100, sz=100
  // risk = |800| - 10*100 = 800 - 1000 = -200
  // tp=15, rr = |(15-10)*100 / -200| = |500/-200| = 2.5
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 100, spot: 10, stop1: 8, qty1: 100, takeProfit: 15 });
  assert.equal(r.rr, 2.5);
});

test('cH: missing delta → no position delta', () => {
  const r = cH({ ...bh(), qty: 2, multiplier: 100 });
  assert.equal(r.cd, null);
});

test('cH: two stops sum for risk', () => {
  // cd=50, sp=10, stop1=9, qty1=25, stop2=8, qty2=25, sz=50
  // l1=9*25=225, l2=8*25=200, risk=|225+200|-10*50 = 425-500=-75
  const r = cH({ ...bh(), qty: 1, multiplier: 100, delta: 50, spot: 10, stop1: 9, qty1: 25, stop2: 8, qty2: 25 });
  assert.equal(r.risk, -75);
});

test('cH: dte counts calendar days from asOf to expiry', () => {
  const r = cH({ ...bh(), expiry: '2026-09-19' }, '2026-09-09');
  assert.equal(r.dte, 10);
});

test('cH: dte defaults asOf to today when omitted', () => {
  const today = ti();
  const r = cH({ ...bh(), expiry: today });
  assert.equal(r.dte, 0);
});

test('cH: moneyness = (strike - spot) / spot', () => {
  const r = cH({ ...bh(), spot: 716.34, strike: 645 });
  assert.ok(Math.abs(r.mny - (-0.0996)) < 0.0005);
});

test('cH: moneyness null when spot is 0', () => {
  const r = cH({ ...bh(), spot: 0, strike: 100 });
  assert.equal(r.mny, null);
});

// ---------------------------------------------------------------------------
// cH() — edge (RV forecast vs IV bought) and maxLoss (defined-risk, Long only)
// ---------------------------------------------------------------------------
test('cH: edge = rvForecast - iv', () => {
  const r = cH({ ...bh(), iv: 25, rvForecast: 32 });
  assert.equal(r.edge, 7);
});

test('cH: edge negative when forecast below IV bought', () => {
  const r = cH({ ...bh(), iv: 30, rvForecast: 18 });
  assert.equal(r.edge, -12);
});

test('cH: edge null when rvForecast missing', () => {
  const r = cH({ ...bh(), iv: 25 });
  assert.equal(r.edge, null);
});

test('cH: edge null when iv missing', () => {
  const r = cH({ ...bh(), rvForecast: 25 });
  assert.equal(r.edge, null);
});

test('cH: maxLoss = premium * qty * (multiplier/100) for a Long leg', () => {
  const r = cH({ ...bh(), side: 'Long', qty: 2, multiplier: 100, premAdj: 4.35 });
  assert.equal(r.maxLoss, 8.7);
});

test('cH: maxLoss rescales with a non-standard multiplier', () => {
  const r = cH({ ...bh(), side: 'Long', qty: 1, multiplier: 250, premAdj: 2 });
  assert.equal(r.maxLoss, 5);
});

test('cH: maxLoss null for a Short leg (undefined risk)', () => {
  const r = cH({ ...bh(), side: 'Short', qty: 2, multiplier: 100, premAdj: 4.35 });
  assert.equal(r.maxLoss, null);
});

test('cH: maxLoss null when premium missing', () => {
  // bh() defaults premAdj to 0 (a valid $0 premium), so explicitly null it out here.
  const r = cH({ ...bh(), side: 'Long', qty: 2, multiplier: 100, premAdj: null });
  assert.equal(r.maxLoss, null);
});

// ---------------------------------------------------------------------------
// groupStructures() — one row per (ticker, expiry), matching blotter discipline
// ---------------------------------------------------------------------------
test('groupStructures: empty input returns empty array', () => {
  assert.deepEqual(groupStructures([]), []);
  assert.deepEqual(groupStructures(null), []);
});

test('groupStructures: single leg becomes a 1-leg structure using its own IV', () => {
  const g = groupStructures([{ ...bh(), ticker: 'NVDA', expiry: '2026-10-16', iv: 41 }]);
  assert.equal(g.length, 1);
  assert.equal(g[0].ticker, 'NVDA');
  assert.equal(g[0].legCount, 1);
  assert.equal(g[0].weightedIv, 41);
});

test('groupStructures: two legs same ticker+expiry merge into one structure', () => {
  const call = { ...bh(), ticker: 'spy', expiry: '2026-10-16', qty: 1, multiplier: 100, vega: 40, iv: 20 };
  const put  = { ...bh(), ticker: 'SPY', expiry: '2026-10-16', qty: 1, multiplier: 100, vega: 40, iv: 22 };
  const g = groupStructures([call, put]);
  assert.equal(g.length, 1);
  assert.equal(g[0].legCount, 2);
  // equal vega weights -> simple average of 20 and 22
  assert.equal(g[0].weightedIv, 21);
});

test('groupStructures: ticker grouping is case-insensitive', () => {
  const a = { ...bh(), ticker: 'qqq', expiry: '2026-11-20' };
  const b = { ...bh(), ticker: 'QQQ', expiry: '2026-11-20' };
  const g = groupStructures([a, b]);
  assert.equal(g.length, 1);
  assert.equal(g[0].legCount, 2);
});

test('groupStructures: different expiry splits into separate structures', () => {
  const a = { ...bh(), ticker: 'SPY', expiry: '2026-10-16' };
  const b = { ...bh(), ticker: 'SPY', expiry: '2026-11-20' };
  const g = groupStructures([a, b]);
  assert.equal(g.length, 2);
});

test('groupStructures: weightedIv weights by |position vega|, not raw vega', () => {
  // leg A: qty 1, vega 10 -> posVega 10 (weight 10, iv 20)
  // leg B: qty 2, vega 10 -> posVega 20 (weight 20, iv 30)
  // weighted = (10*20 + 20*30) / 30 = 26.667
  const a = { ...bh(), ticker: 'IWM', expiry: '2026-10-16', qty: 1, multiplier: 100, vega: 10, iv: 20 };
  const b = { ...bh(), ticker: 'IWM', expiry: '2026-10-16', qty: 2, multiplier: 100, vega: 10, iv: 30 };
  const g = groupStructures([a, b]);
  assert.ok(Math.abs(g[0].weightedIv - 26.667) < 0.01);
});

test('groupStructures: premiumTotal nets Short legs against Long legs', () => {
  // long call premium 5 (debit), short put premium 2 (credit) -> net debit 3
  const longCall = { ...bh(), ticker: 'TLT', expiry: '2026-10-16', side: 'Long', qty: 1, multiplier: 100, premAdj: 5 };
  const shortPut  = { ...bh(), ticker: 'TLT', expiry: '2026-10-16', side: 'Short', qty: 1, multiplier: 100, premAdj: 2 };
  const g = groupStructures([longCall, shortPut]);
  assert.equal(g[0].premiumTotal, 3);
});

test('groupStructures: edge = rvForecast (avg across legs) - weightedIv', () => {
  const a = { ...bh(), ticker: 'GLD', expiry: '2026-10-16', qty: 1, multiplier: 100, vega: 10, iv: 20, rvForecast: 30 };
  const b = { ...bh(), ticker: 'GLD', expiry: '2026-10-16', qty: 1, multiplier: 100, vega: 10, iv: 20, rvForecast: 34 };
  const g = groupStructures([a, b]);
  assert.equal(g[0].weightedIv, 20);
  assert.equal(g[0].rvForecast, 32); // avg(30,34)
  assert.equal(g[0].edge, 12);
});

// ---------------------------------------------------------------------------
// fetchSpot() — direct Yahoo Finance with AllOrigins proxy fallback
// ---------------------------------------------------------------------------

// fetchSpot makes up to 2 calls: (1) direct Yahoo, (2) AllOrigins proxy.
// Direct Yahoo returns raw Yahoo JSON; proxy returns { contents: '...' } wrapper.
function yahooJson(price) {
  return price != null
    ? { chart: { result: [{ meta: { regularMarketPrice: price } }] } }
    : { chart: { result: [{ meta: {} }] } };
}
function directResp(price)  { return { ok: true,  json: async () => yahooJson(price) }; }
function directFail()       { return { ok: false, json: async () => ({}) }; }
function proxyResp(price)   { return { ok: true,  json: async () => ({ contents: JSON.stringify(yahooJson(price)) }) }; }
function proxyFail()        { return { ok: false, json: async () => ({}) }; }

function mockFetch(specs) {
  let idx = 0;
  return async function(url) {
    const spec = specs[idx++];
    if (spec instanceof Error) throw spec;
    return spec;
  };
}

test('fetchSpot: returns price directly from Yahoo (fast path)', async () => {
  const price = await fetchSpot('AAPL', mockFetch([directResp(195.5)]));
  assert.equal(price, 195.5);
});

test('fetchSpot: falls back to proxy when direct returns non-ok', async () => {
  const price = await fetchSpot('TSLA', mockFetch([directFail(), proxyResp(250)]));
  assert.equal(price, 250);
});

test('fetchSpot: falls back to proxy when direct throws (network error)', async () => {
  const price = await fetchSpot('MSFT', mockFetch([new Error('network'), proxyResp(420)]));
  assert.equal(price, 420);
});

test('fetchSpot: falls back to proxy when direct returns null price', async () => {
  const price = await fetchSpot('SPY', mockFetch([directResp(null), proxyResp(500)]));
  assert.equal(price, 500);
});

test('fetchSpot: throws when proxy returns non-ok', async () => {
  await assert.rejects(
    () => fetchSpot('BAD', mockFetch([directFail(), proxyFail()])),
    /Proxy error/
  );
});

test('fetchSpot: throws when proxy price is null', async () => {
  await assert.rejects(
    () => fetchSpot('NONE', mockFetch([directResp(null), proxyResp(null)])),
    { message: 'No price for NONE' }
  );
});

test('fetchSpot: throws when proxy contents JSON is malformed', async () => {
  const badProxy = { ok: true, json: async () => ({ contents: 'not-json' }) };
  await assert.rejects(
    () => fetchSpot('X', mockFetch([directFail(), badProxy])),
    { message: 'No price for X' }
  );
});

test('fetchSpot: hits Yahoo directly first, then proxy on failure', async () => {
  const urls = [];
  const spy = async (url) => {
    urls.push(url);
    if (urls.length === 1) return directFail();
    return proxyResp(1);
  };
  await fetchSpot('BRK.B', spy);
  assert.ok(urls[0].includes('query1.finance.yahoo.com') && !urls[0].includes('allorigins'), 'first call is direct Yahoo');
  assert.ok(urls[1].includes('allorigins.win'), 'second call routes through proxy');
  assert.ok(urls[1].includes('BRK.B'), 'ticker present in proxy URL');
});
