import express from 'express';

const app = express();

// Middleware básico
app.use((req, res, next) => {
  console.log(`Requisição recebida: ${req.method} ${req.url}`);
  next();
});

// Rota GET simples
app.get('/', (req, res) => {
  res.send('Servidor Fundanus a correr!');
});

// Rota POST simples
app.post('/api/analyze', (req, res) => {
  console.log('Rota /api/analyze chamada com ticker:', req.body.ticker);
  res.json({ message: 'Rota funcionando!', ticker: req.body.ticker });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});