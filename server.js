// server.js
import http from 'http';
import 'dotenv/config'; // Para carregar as chaves API do .env

const server = http.createServer((req, res) => {
  console.log(`Requisição recebida: ${req.method} ${req.url}`);

  // Adiciona cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*'); // Para testes locais
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Servidor Fundanus a correr!');
  } else if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      console.log('Dados recebidos:', body);
      const { ticker } = JSON.parse(body);
      try {
        const alphaKey = process.env.ALPHAVANTAGE_API_KEY;
        const cmcKey = process.env.COINMARKETCAP_API_KEY;
        let adjustedTicker = ticker.toUpperCase();
        let url, data;

        // Lógica refinada para escolher a API
        if (/^[A-Z]{1,5}$/.test(adjustedTicker) && !['BTC', 'ETH', 'XRP', 'SOL', 'ADA'].includes(adjustedTicker)) {
          // Ações americanas (ex.: AAPL, GOOGL) vão para Alpha Vantage
          url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${adjustedTicker}&apikey=${alphaKey}`;
          const response = await fetch(url);
          data = await response.json();
          const timeSeries = data['Time Series (Daily)'];
          if (!timeSeries) throw new Error('Dados não disponíveis na Alpha Vantage');
          const latestDate = Object.keys(timeSeries)[0];
          var currentPrice = parseFloat(timeSeries[latestDate]['4. close']).toFixed(2);
        } else {
          // Criptomoedas (ex.: BTC, ETH, SOL, ADA) vão para CoinMarketCap
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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(analysis));
      } catch (error) {
        console.error('Erro:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Erro ao gerar análise' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Rota não encontrada');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});