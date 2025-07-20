import { fetchSMA, fetchEMA, fetchRSI, fetchMACD } from './indicators/alphaVantage.js';
import { fetchCryptoSMAs } from './indicators/coinmarketcap.js';
import express from 'express';
import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 4000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Serve ficheiros estáticos
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Middleware JSON e CORS
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// -------------------------------
// Endpoint para análise
// -------------------------------
app.post('/api/analyze', async (req, res) => {
  console.log('Analisar:', req.body);
  const { ticker, type, userId } = req.body;

  if (!ticker || !type || !userId) {
    return res.status(400).json({ error: 'ticker, type e userId são obrigatórios' });
  }

  try {
    let adjustedTicker = ticker.toUpperCase();
    let currentPrice;
    let indicators = {};
    let analysis;

    if (type === 'stocks') {
      const alphaKey = process.env.ALPHAVANTAGE_API_KEY;
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${adjustedTicker}&apikey=${alphaKey}`;
      const response = await fetch(url);
      const data = await response.json();

      const timeSeries = data["Time Series (Daily)"];
      if (!timeSeries) throw new Error("Dados não disponíveis na Alpha Vantage");
      const latestDate = Object.keys(timeSeries)[0];
      currentPrice = parseFloat(timeSeries[latestDate]["4. close"]).toFixed(2);

      indicators = {
        SMA20: await fetchSMA(adjustedTicker, 20),
        SMA50: await fetchSMA(adjustedTicker, 50),
        SMA200: await fetchSMA(adjustedTicker, 200),
        EMA9: await fetchEMA(adjustedTicker, 9),
        EMA21: await fetchEMA(adjustedTicker, 21),
        RSI14: await fetchRSI(adjustedTicker, 'daily', 14),
        MACD: await fetchMACD(adjustedTicker),
      };

      const priceBase = parseFloat(currentPrice);
      let trendFactor = Math.random() > 0.7 ? 0.95 : 1.05;

      analysis = {
        ticker: adjustedTicker,
        currentPrice,
        indicators,
        targets: {
          shortTerm: (priceBase * trendFactor).toFixed(2),
          mediumTerm: (priceBase * trendFactor * 1.05).toFixed(2),
          longTerm: (priceBase * trendFactor * 1.15).toFixed(2),
        },
        stopLoss: {
          shortTerm: (priceBase * 0.95).toFixed(2),
          mediumTerm: (priceBase * 0.90).toFixed(2),
          longTerm: (priceBase * 0.85).toFixed(2),
        },
      };

    } else if (type === 'crypto') {
      const cmcKey = process.env.COINMARKETCAP_API_KEY;
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${adjustedTicker}`;
      const response = await fetch(url, {
        headers: {
          "X-CMC_PRO_API_KEY": cmcKey,
          Accept: "application/json",
        },
      });
      const data = await response.json();

      if (data.status.error_code !== 0) throw new Error(data.status.error_message);

      const cryptoData = Object.values(data.data)[0];
      currentPrice = parseFloat(cryptoData.quote.USD.price).toPrecision(8);

      const percent_change_24h = cryptoData.quote.USD.percent_change_24h?.toFixed(2) || null;
      const percent_change_7d = cryptoData.quote.USD.percent_change_7d?.toFixed(2) || null;
      const percent_change_30d = cryptoData.quote.USD.percent_change_30d?.toFixed(2) || null;

      const rank = cryptoData.cmc_rank || null;
      const market_cap = cryptoData.quote.USD.market_cap?.toFixed(0) || null;
      const volume_24h = cryptoData.quote.USD.volume_24h?.toFixed(0) || null;

      let cryptoSMAs = {};
      try {
        cryptoSMAs = await fetchCryptoSMAs(adjustedTicker);
      } catch (e) {
        console.error(`Erro ao obter SMAs para ${adjustedTicker}:`, e.message);
      }

      const priceBase = parseFloat(currentPrice);
      let trendFactor = Math.random() > 0.7 ? 0.95 : 1.05;

      analysis = {
        ticker: adjustedTicker,
        currentPrice,
        percent_change_24h,
        percent_change_7d,
        percent_change_30d,
        rank,
        market_cap,
        volume_24h,
        indicators: cryptoSMAs,
        targets: {
          shortTerm: (priceBase * trendFactor).toPrecision(8),
          mediumTerm: (priceBase * trendFactor * 1.05).toPrecision(8),
          longTerm: (priceBase * trendFactor * 1.15).toPrecision(8),
        },
        stopLoss: {
          shortTerm: (priceBase * 0.95).toPrecision(8),
          mediumTerm: (priceBase * 0.90).toPrecision(8),
          longTerm: (priceBase * 0.85).toPrecision(8),
        },
      };
    }

    console.log("Análise gerada:", analysis);

    // Gravar na Supabase
    const { error: insertError } = await supabase.from('reports_log').insert([
      {
        user_id: userId,
        ticker: adjustedTicker,
        type,
        generated_at: new Date().toISOString(),
        report_content: JSON.stringify(analysis)
      }
    ]);

    if (insertError) {
      console.error("❌ Erro ao gravar na Supabase:", insertError.message);
    } else {
      console.log(`✅ Relatório gravado na Supabase para user_id=${userId}`);
    }

    return res.json(analysis);

  } catch (error) {
    console.error("❌ Erro geral:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// -------------------------------
// Endpoint para autocomplete
// -------------------------------
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || "").toLowerCase();
  const type = req.query.type;

  if (!query || !type) {
    return res.status(400).json({ error: 'Missing query or type' });
  }

  try {
    if (type === 'crypto') {
      const raw = await fs.readFile(
        path.join(process.cwd(), 'public/data/cryptos.json'),
        'utf-8'
      );
      const cryptos = JSON.parse(raw);
      const matches = cryptos.filter(
        (item) =>
          item.symbol.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query)
      );
      return res.json(matches);
    } else if (type === 'stocks') {
      const alphaKey = process.env.ALPHAVANTAGE_API_KEY;
      const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${alphaKey}`;
      const response = await fetch(url);
      const data = await res.json();
      const results = (data.bestMatches || []).map((item) => ({
        symbol: item["1. symbol"],
        name: item["2. name"],
      }));
      return res.json(results);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
