import fetch from 'node-fetch';

/**
 * Busca candles diários de uma cripto via CoinMarketCap
 */
export async function fetchCryptoCandles(symbol, days = 200) {
  const apiKey = process.env.COINMARKETCAP_API_KEY;

  // Ajusta data final para ontem (garante dados fechados)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);

  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days - 10); // pedir dias extra para cálculos

  const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/ohlcv/historical?symbol=${symbol}&convert=USD&time_start=${Math.floor(startDate.getTime() / 1000)}&time_end=${Math.floor(endDate.getTime() / 1000)}`;

  const response = await fetch(url, {
    headers: {
      'X-CMC_PRO_API_KEY': apiKey,
      'Accept': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.data || !data.data.quotes || data.data.quotes.length === 0) {
    throw new Error(`No OHLCV data for ${symbol}`);
  }

  const closes = data.data.quotes.map(q => ({
    date: q.time_open.split("T")[0],
    close: q.quote.USD.close
  }));

  return closes.reverse(); // do mais antigo para o mais recente
}

/**
 * Calcula SMA para um array de closes
 */
export function calculateSMA(closes, period) {
  if (closes.length < period) {
    return null;
  }
  const recent = closes.slice(-period);
  const sum = recent.reduce((acc, val) => acc + val.close, 0);
  const avg = sum / period;
  return {
    date: recent[recent.length - 1].date,
    sma: avg.toFixed(8)
  };
}

/**
 * Calcula SMA para vários períodos
 */
export async function fetchCryptoSMAs(symbol) {
  try {
    const closes = await fetchCryptoCandles(symbol, 200);

    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);

    return {
      SMA20: sma20,
      SMA50: sma50,
      SMA200: sma200,
    };
  } catch (e) {
    console.error(`Erro ao obter SMAs para ${symbol}:`, e.message);
    return {
      SMA20: null,
      SMA50: null,
      SMA200: null,
    };
  }
}
