'use strict';
const { fetchSpot } = require('../logic.js');

async function getSpot(req, res) {
  const ticker = (req.query.ticker || '').trim();
  if (!ticker) {
    return res.status(400).json({ error: 'ticker query param required' });
  }
  try {
    const price = await fetchSpot(ticker, fetch);
    res.json({ price });
  } catch (e) {
    res.status(502).json({ error: e.message || 'spot fetch failed' });
  }
}

module.exports = { getSpot };
