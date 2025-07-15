// Detect environment
const API_BASE = window.location.hostname.includes('localhost')
  ? 'http://localhost:3000'
  : 'https://fundanus-v2.onrender.com';

// Autocomplete logic
document.getElementById('ticker-search').addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  const type = document.getElementById('asset-type').value;

  if (query.length < 2) {
    document.getElementById('autocomplete-results').innerHTML = '';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/search?q=${query}&type=${type}`);
    const results = await response.json();

    if (results.error) {
      document.getElementById('autocomplete-results').innerHTML = `<div>${results.error}</div>`;
      return;
    }

    let html = '';
    results.forEach(item => {
      html += `
        <div class="autocomplete-item" data-symbol="${item.symbol}">
          ${item.symbol} - ${item.name}
        </div>
      `;
    });

    document.getElementById('autocomplete-results').innerHTML = html;

    document.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('ticker-search').value = el.dataset.symbol;
        document.getElementById('autocomplete-results').innerHTML = '';
      });
    });
  } catch (error) {
    console.error(error);
  }
});

// Form submission logic
document.getElementById('analyzeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const ticker = document.getElementById('ticker-search').value.trim();
  const type = document.getElementById('asset-type').value;

  if (!ticker) {
    alert('Por favor insere um ticker.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, type })
    });

    const data = await response.json();

    if (data.error) {
      document.getElementById('result').innerHTML = `<p style="color:red">${data.error}</p>`;
      document.getElementById('result').style.display = 'block';
      return;
    }

    document.getElementById('result').innerHTML = `
      <h3>${data.ticker}</h3>
      <p><strong>Preço atual:</strong> ${data.currentPrice}</p>
      <p><strong>Previsões:</strong></p>
      <ul>
        <li>Curto prazo: ${data.targets.shortTerm}</li>
        <li>Médio prazo: ${data.targets.mediumTerm}</li>
        <li>Longo prazo: ${data.targets.longTerm}</li>
      </ul>
      <p><strong>Stop Loss:</strong></p>
      <ul>
        <li>Curto prazo: ${data.stopLoss.shortTerm}</li>
        <li>Médio prazo: ${data.stopLoss.mediumTerm}</li>
        <li>Longo prazo: ${data.stopLoss.longTerm}</li>
      </ul>
    `;
    document.getElementById('result').style.display = 'block';
  } catch (error) {
    console.error(error);
    document.getElementById('result').innerHTML = `<p style="color:red">${error.message}</p>`;
    document.getElementById('result').style.display = 'block';
  }
});
