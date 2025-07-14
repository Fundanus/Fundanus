import express from 'express';
import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';

const app = express();
const PORT = process.env.PORT || 3000;

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
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Endpoint para análise (mantém o teu)
app.post('/api/analyze', async (req, res) => {
  console.log('Analisar:', req.body);
  const { ticker } = req.body;
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker não fornecido' });
  }
  try {
    let adjustedTicker = ticker.toUpperCase();
    let currentPrice;

    if (/^[A-Z]{1,5}$/.test(adjustedTicker) && !["BTC","ETH","XRP","SOL","ADA","DOGE"].includes(adjustedTicker)) {
      // Alpha Vantage
      const alphaKey = process.env.ALPHAVANTAGE_API_KEY;
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${adjustedTicker}&apikey=${alphaKey}`;
      const response = await fetch(url);
      const data = await response.json();
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) throw new Error('Dados não disponíveis na Alpha Vantage');
      const latestDate = Object.keys(timeSeries)[0];
      currentPrice = parseFloat(timeSeries[latestDate]['4. close']).toFixed(2);
    } else {
      // CoinMarketCap
      const cmcKey = process.env.COINMARKETCAP_API_KEY;
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${adjustedTicker}`;
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': cmcKey,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (data.status.error_code !== 0) throw new Error(data.status.error_message);
      const cryptoData = Object.values(data.data)[0];
      currentPrice = parseFloat(cryptoData.quote.USD.price).toFixed(2);
    }

    const priceBase = parseFloat(currentPrice);
    let trendFactor = Math.random() > 0.7 ? 0.95 : 1.05;

    const analysis = {
      ticker: adjustedTicker,
      currentPrice,
      targets: {
        shortTerm: (priceBase * trendFactor).toFixed(2),
        mediumTerm: (priceBase * trendFactor * 1.05).toFixed(2),
        longTerm: (priceBase * trendFactor * 1.15).toFixed(2)
      },
      stopLoss: {
        shortTerm: (priceBase * 0.95).toFixed(2),
        mediumTerm: (priceBase * 0.90).toFixed(2),
        longTerm: (priceBase * 0.85).toFixed(2)
      }
    };

    console.log('Análise gerada:', analysis);
    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para autocomplete
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || "").toLowerCase();
  const type = req.query.type;

  if (!query || !type) {
    return res.status(400).json({ error: 'Missing query or type' });
  }

  try {
    if (type === 'crypto') {
      const raw = await fs.readFile(path.join(process.cwd(), 'public/data/cryptos.json'), 'utf-8');
      const cryptos = JSON.parse(raw);
      const matches = cryptos.filter(item =>
        item.symbol.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      );
      return res.json(matches);
    } else if (type === 'stocks') {
      const alphaKey = process.env.ALPHAVANTAGE_API_KEY;
      const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${alphaKey}`;
      const response = await fetch(url);
      const data = await response.json();
      const results = (data.bestMatches || []).map(item => ({
        symbol: item["1. symbol"],
        name: item["2. name"]
      }));
      return res.json(results);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
