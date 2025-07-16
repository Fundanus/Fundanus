/**
 * alphaVantage.js
 * Serviços para indicadores técnicos via API Alpha Vantage
 */

import fetch from 'node-fetch';

/* ==========================================
   SMA (Simple Moving Average)
   ========================================== */
export async function fetchSMA(symbol, period) {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=SMA&symbol=${symbol}&interval=daily&time_period=${period}&series_type=close&apikey=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data["Technical Analysis: SMA"]) {
    const values = Object.entries(data["Technical Analysis: SMA"]);
    if (values.length > 0) {
      const [date, obj] = values[0];
      return {
        date,
        sma: parseFloat(obj.SMA).toFixed(2)
      };
    }
  }
  throw new Error(`SMA data not available for ${symbol} period ${period}`);
}

/* ==========================================
   EMA (Exponential Moving Average)
   ========================================== */
export async function fetchEMA(symbol, period) {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=EMA&symbol=${symbol}&interval=daily&time_period=${period}&series_type=close&apikey=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data["Technical Analysis: EMA"]) {
    const values = Object.entries(data["Technical Analysis: EMA"]);
    if (values.length > 0) {
      const [date, obj] = values[0];
      return {
        date,
        ema: parseFloat(obj.EMA).toFixed(2),
      };
    }
  }

  throw new Error(`EMA data not available for ${symbol} period ${period}`);
}

/* ==========================================
   RSI (Relative Strength Index)
   ========================================== */
export async function fetchRSI(symbol, interval = 'daily', timePeriod = 14) {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  const key = Object.keys(data).find(k => k.includes('Technical Analysis'));
  if (!key) {
    console.error('RSI not found for symbol:', symbol);
    return null;
  }

  const series = data[key];
  const latestDate = Object.keys(series)[0];
  const rsi = series[latestDate]["RSI"];

  return {
    date: latestDate,
    rsi: parseFloat(rsi).toFixed(2)
  };
}

/* ==========================================
   MACD (Moving Average Convergence Divergence)
   ========================================== */
export async function fetchMACD(
  symbol,
  interval = 'daily',
  fastperiod = 12,
  slowperiod = 26,
  signalperiod = 9
) {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=MACD&symbol=${symbol}&interval=${interval}&series_type=close&fastperiod=${fastperiod}&slowperiod=${slowperiod}&signalperiod=${signalperiod}&apikey=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  const key = Object.keys(data).find(k => k.includes('Technical Analysis'));
  if (!key) {
    console.error('MACD not found for symbol:', symbol);
    return null;
  }

  const series = data[key];
  const latestDate = Object.keys(series)[0];
  const macdObj = series[latestDate];

  return {
    date: latestDate,
    macd: parseFloat(macdObj["MACD"]).toFixed(2),
    signal: parseFloat(macdObj["MACD_Signal"]).toFixed(2),
    hist: parseFloat(macdObj["MACD_Hist"]).toFixed(2),
  };
}
