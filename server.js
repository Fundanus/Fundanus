// server.js
import express from 'express';
import 'dotenv/config'; // Para carregar as chaves API do .env
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Serve o index.html
app.use(express.static(path.join(process.cwd(), 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Middleware para JSON
app.use(express.json());

// Rota para análise
app.post('/api/analyze', async (req, res) => {
  console.log(`Requisição recebida: ${req.method} ${req.url}`);
  const { ticker } = req.body;
  try {
    const alphaKey = process.env.ALPHAVANTAGE_API_KEY;
    const cmcKey = process.env.COINMARKETCAP_API_KEY;
    let adjustedTicker = ticker.toUpperCase();
    let url, data;

    if (/^[A-Z]{1,5}$/.test(adjustedTicker) && !['BTC', 'ETH', 'XRP', 'SOL', 'ADA'].includes(adjustedTicker)) {
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${adjustedTicker}&apikey=${alphaKey}`;
      const response = await fetch(url);
      data = await response.json();
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) throw new Error('Dados não disponíveis na Alpha Vantage');
      const latestDate = Object.keys(timeSeries)[0];
      var currentPrice = parseFloat(timeSeries[latestDate]['4. close']).toFixed(2);
    } else {
      url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${adjustedTicker}`;
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': cmcKey,
          'Accept': 'application/json'
        }
      });
      data = await response.json();
      if (data.status.error_code !== 0) throw new Error(data.status.error_message || 'Erro no CoinMarketCap');
      const cryptoData = Object.values(data.data)[0];
      if (!cryptoData) throw new Error('Dados de criptomoeda não encontrados');
      var currentPrice = parseFloat(cryptoData.quote.USD.price).toFixed(2);
    }

    const priceBase = parseFloat(currentPrice);
    const analysis = {
      ticker: adjustedTicker,
      currentPrice,
      targets: {
        shortTerm: (priceBase * 1.05).toFixed(2),
        mediumTerm: (priceBase * 1.10).toFixed(2),
        longTerm: (priceBase * 1.20).toFixed(2)
      },
      stopLoss: {
        shortTerm: (priceBase * 0.95).toFixed(2),
        mediumTerm: (priceBase * 0.90).toFixed(2),
        longTerm: (priceBase * 0.85).toFixed(2)
      }
    };

    res.json(analysis);
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao gerar análise' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});