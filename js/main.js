   // ========= Funções de data/hora =========
    function formatTimeHM(date) {
      if (!date) return '';
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    function formatDateDM(date) {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate();
      const month = d.toLocaleDateString('pt-BR', { month: 'long' });
      return `${day} de ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
    }

    function formatDayOfWeek(date) {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR', { weekday: 'long' });
    }

    function setBadgeText(id, date) {
      const badge = document.getElementById(id);
      if (!badge) return;
      if (!date) { badge.textContent = '—'; return; }
      const timeStr = formatTimeHM(date) || 'agora';
      badge.textContent = timeStr;
    }

    // ========= Relógio =========
    function updateClock() {
      const now = new Date();
      const timeElement = document.getElementById('time');
      const dateElement = document.getElementById('date');
      const dayOfWeekElement = document.getElementById('day-of-week');
      const lastSyncElement = document.getElementById('last-sync');

      if (timeElement) timeElement.textContent = formatTimeHM(now);
      if (dateElement) dateElement.textContent = formatDateDM(now);
      if (dayOfWeekElement) dayOfWeekElement.textContent = formatDayOfWeek(now);
      if (lastSyncElement) lastSyncElement.textContent = `Última sincronização: ${formatTimeHM(now)}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ========= Clima =========
    async function fetchWeather() {
      try {
        const apiKey = 'de9ee2ae39544f302cd1bbd2f9e75eb3';
        const lat = -23.3961;
        const lon = -46.3200;
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=pt_br&units=metric`;

        const res = await fetch(url);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Erro OpenWeather:', res.status, errorText);
          const descElErr = document.getElementById('weather-desc');
          if (descElErr) descElErr.textContent = 'Aguardando ativação da API...';
          return;
        }
        const data = await res.json();

        const temp = Math.round(data.main.temp);
        const feels = Math.round(data.main.feels_like);
        const humidity = data.main.humidity;
        const wind = data.wind.speed;
        const desc = data.weather?.[0]?.description || '';
        const iconCode = data.weather?.[0]?.icon || '';

        const tempEl = document.getElementById('weather-temp');
        const descEl = document.getElementById('weather-desc');
        const feelsEl = document.getElementById('weather-feels');
        const humidityEl = document.getElementById('weather-humidity');
        const windEl = document.getElementById('weather-wind');
        const iconEl = document.getElementById('weather-icon');

        if (tempEl) tempEl.textContent = `${temp}°C`;
        if (descEl) descEl.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);
        if (feelsEl) feelsEl.textContent = `Sensação: ${feels}°C`;
        if (humidityEl) humidityEl.textContent = `Umidade: ${humidity}%`;
        if (windEl) windEl.textContent = `Vento: ${wind.toFixed(1)} m/s`;

        if (iconEl) {
          if (iconCode.startsWith('01')) iconEl.textContent = '☀️';
          else if (iconCode.startsWith('02')) iconEl.textContent = '🌤️';
          else if (iconCode.startsWith('03') || iconCode.startsWith('04')) iconEl.textContent = '☁️';
          else if (iconCode.startsWith('09') || iconCode.startsWith('10')) iconEl.textContent = '🌧️';
          else if (iconCode.startsWith('11')) iconEl.textContent = '⛈️';
          else if (iconCode.startsWith('13')) iconEl.textContent = '❄️';
          else if (iconCode.startsWith('50')) iconEl.textContent = '🌫️';
        }

        setBadgeText('weather-updated', new Date());
      } catch (err) {
        console.error('❌ Erro clima:', err);
        const descElCatch = document.getElementById('weather-desc');
        if (descElCatch) descElCatch.textContent = 'Aguardando ativação...';
      }
    }
    fetchWeather();
    setInterval(fetchWeather, 10 * 60 * 1000);

    // ========= Dados para Ticker =========
    window.tickerData = {
      usdbrl: null,
      eurbrl: null,
      btc: null,
      eth: null,
      sp500: null,
      ibov: null,
      gold: null,
      silver: null
    };

    async function fetchQuotes() {
      try {
        const usdRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        const usdData = await usdRes.json();
        if (usdData.USDBRL) {
          const price = parseFloat(usdData.USDBRL.bid);
          const change = parseFloat(usdData.USDBRL.pctChange);
          window.tickerData.usdbrl = { price, change };
        }

        const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
        const cryptoData = await cryptoRes.json();
        if (cryptoData.bitcoin) {
          window.tickerData.btc = {
            price: cryptoData.bitcoin.usd,
            change: cryptoData.bitcoin.usd_24h_change || 0
          };
        }
        if (cryptoData.ethereum) {
          window.tickerData.eth = {
            price: cryptoData.ethereum.usd,
            change: cryptoData.ethereum.usd_24h_change || 0
          };
        }

        setBadgeText('quotes-updated', new Date());
      } catch (err) {
        console.error('❌ Erro geral ao buscar cotações:', err);
        setBadgeText('quotes-updated', null);
      }

      buildTickerBar();
    }

    function isMetalsPauseTime() {
      const now = new Date();
      const hour = now.getHours();
      return hour < 9 || hour >= 18;
    }

    async function fetchMetals() {
      if (isMetalsPauseTime()) {
        loadMetalsFromCache();
        buildTickerBar();
        return;
      }

      try {
        const usdBrlData = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL').then(r => r.json());
        const usdBrlRate = parseFloat(usdBrlData.USDBRL?.bid || 5.0);

        const OUNCE_TO_GRAM = 31.1035;
        const alphaApiKey = '7DLPNZGF5ZSIVP0V';
        const baseUrl = 'https://www.alphavantage.co/query';

        const [goldData, silverData] = await Promise.all([
          fetch(`${baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${alphaApiKey}`).then(r => r.json()),
          fetch(`${baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=XAG&to_currency=USD&apikey=${alphaApiKey}`).then(r => r.json())
        ]);

        const now = new Date();

        if (goldData['Realtime Currency Exchange Rate']) {
          const goldRate = goldData['Realtime Currency Exchange Rate'];
          const goldUSDPerOunce = parseFloat(goldRate['5. Exchange Rate']);
          const goldUSDPerGram = goldUSDPerOunce / OUNCE_TO_GRAM;
          const goldBRLPerGram = goldUSDPerGram * usdBrlRate;

          localStorage.setItem('gold_price', goldBRLPerGram.toFixed(2));
          localStorage.setItem('gold_updated', now.toISOString());

          window.tickerData.gold = { price: parseFloat(goldBRLPerGram.toFixed(2)) };
        } else {
          loadMetalsFromCache();
        }

        if (silverData['Realtime Currency Exchange Rate']) {
          const silverRate = silverData['Realtime Currency Exchange Rate'];
          const silverUSDPerOunce = parseFloat(silverRate['5. Exchange Rate']);
          const silverUSDPerGram = silverUSDPerOunce / OUNCE_TO_GRAM;
          const silverBRLPerGram = silverUSDPerOunce / OUNCE_TO_GRAM * usdBrlRate;

          localStorage.setItem('silver_price', silverBRLPerGram.toFixed(2));
          localStorage.setItem('silver_updated', now.toISOString());

          window.tickerData.silver = { price: parseFloat(silverBRLPerGram.toFixed(2)) };
        } else {
          loadMetalsFromCache();
        }

      } catch (err) {
        console.error('❌ Erro ao buscar metais:', err);
        loadMetalsFromCache();
      }

      buildTickerBar();
    }

    function loadMetalsFromCache() {
      const goldPrice = localStorage.getItem('gold_price');
      const silverPrice = localStorage.getItem('silver_price');

      if (goldPrice) {
        window.tickerData.gold = { price: parseFloat(goldPrice) };
      }
      if (silverPrice) {
        window.tickerData.silver = { price: parseFloat(silverPrice) };
      }
    }

    async function fetchExtraForTicker() {
      try {
        const eurRes = await fetch('https://economia.awesomeapi.com.br/json/last/EUR-BRL');
        const eurData = await eurRes.json();
        if (eurData.EURBRL) {
          const price = parseFloat(eurData.EURBRL.bid);
          const change = parseFloat(eurData.EURBRL.pctChange);
          window.tickerData.eurbrl = { price, change };
        }
      } catch (e) {
        console.warn('⚠️ EUR falhou, usando padrão');
      }

      try {
        const ibovRes = await fetch('https://economia.awesomeapi.com.br/json/last/IBOV');
        const ibovData = await ibovRes.json();
        if (ibovData.IBOV) {
          const price = parseFloat(ibovData.IBOV.bid);
          const change = parseFloat(ibovData.IBOV.pctChange);
          window.tickerData.ibov = { price, change };
        }
      } catch (e) {
        console.warn('⚠️ IBOVESPA falhou');
      }

      try {
        const yahooUrl = 'https://query2.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d';
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const proxyData = await res.json();
          const spData = JSON.parse(proxyData.contents);
          if (spData.chart && spData.chart.result && spData.chart.result.length > 0) {
            const result = spData.chart.result[0];
            const meta = result.meta;
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose;
            const change = ((price - prevClose) / prevClose) * 100;
            window.tickerData.sp500 = { price, change };
          }
        }
      } catch (e) {
        console.warn('⚠️ S&P 500 falhou ou CORS bloqueou, usando padrão');
      }

      buildTickerBar();
    }

    function buildTickerBar() {
      const track = document.getElementById('ticker-track');
      if (!track) return;

      track.innerHTML = '';

      function createTickerItem(label, price, change, isCurrency, suffix) {
        const item = document.createElement('div');
        item.className = 'ticker-item';

        const sym = document.createElement('span');
        sym.className = 'ticker-symbol';
        sym.textContent = label;

        const p = document.createElement('span');
        p.className = 'ticker-price';

        if (price == null || isNaN(price)) {
          p.textContent = '--';
        } else {
          if (isCurrency) {
            p.textContent = `R$ ${price.toFixed(2)}`;
          } else if (suffix) {
            p.textContent = `${price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ${suffix}`;
          } else {
            p.textContent = price.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
          }
        }

        const ch = document.createElement('span');
        ch.className = 'ticker-change';
        if (typeof change === 'number' && !isNaN(change)) {
          const sign = change > 0 ? '+' : '';
          ch.textContent = `${sign}${change.toFixed(2)}%`;
          if (change > 0) ch.classList.add('up');
          if (change < 0) ch.classList.add('down');
        } else {
          ch.textContent = '';
        }

        item.appendChild(sym);
        item.appendChild(p);
        if (ch.textContent) item.appendChild(ch);
        return item;
      }

      const d = window.tickerData;

      track.appendChild(createTickerItem('DÓLAR', d.usdbrl?.price ?? null, d.usdbrl?.change ?? null, true));
      track.appendChild(createTickerItem('EURO', d.eurbrl?.price ?? null, d.eurbrl?.change ?? null, true));
      track.appendChild(createTickerItem('BITCOIN', d.btc?.price ?? null, d.btc?.change ?? null, false, 'USD'));
      track.appendChild(createTickerItem('ETHEREUM', d.eth?.price ?? null, d.eth?.change ?? null, false, 'USD'));
      track.appendChild(createTickerItem('S&P 500', d.sp500?.price ?? null, d.sp500?.change ?? null, false, 'pts'));
      track.appendChild(createTickerItem('IBOVESPA', d.ibov?.price ?? null, d.ibov?.change ?? null, false, 'pts'));

      if (d.gold?.price != null) {
        track.appendChild(createTickerItem('OURO', d.gold.price, null, true));
      } else {
        track.appendChild(createTickerItem('OURO', null, null, true));
      }

      if (d.silver?.price != null) {
        track.appendChild(createTickerItem('PRATA', d.silver.price, null, true));
      } else {
        track.appendChild(createTickerItem('PRATA', null, null, true));
      }

      const itemsHTML = track.innerHTML;
      track.innerHTML = itemsHTML + itemsHTML;
    }

    async function fetchRSSFeed(rssUrl, containerId, badgeId) {
      try {
        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro ao buscar RSS');
        const data = await res.json();

        const container = document.getElementById(containerId);
        if (!container) {
          console.warn(`Container not found: ${containerId}`);
          return;
        }
        container.innerHTML = '';

        const items = (data.items || []).slice(0, 25);
        if (!items.length) {
          container.innerHTML = '<div class="news-item"><div class="news-item-title">Sem manchetes no momento.</div></div>';
          return;
        }

        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'news-item';

          const title = document.createElement('div');
          title.className = 'news-item-title';
          title.textContent = item.title;

          const meta = document.createElement('div');
          meta.className = 'news-item-meta';
          const pubTime = item.pubDate ? formatTimeHM(item.pubDate) : '';
          const pubDateFormatted = item.pubDate ? formatDateDM(item.pubDate) : '';

          if (pubTime && pubDateFormatted) {
            meta.textContent = `Publicado às ${pubTime} - ${pubDateFormatted}`;
          } else if (pubTime) {
            meta.textContent = `Publicado às ${pubTime}`;
          } else if (pubDateFormatted) {
            meta.textContent = `Publicado em ${pubDateFormatted}`;
          } else {
            meta.textContent = '';
          }

          div.appendChild(title);
          if (meta.textContent) div.appendChild(meta);
          container.appendChild(div);
        });

        setBadgeText(badgeId, new Date());
      } catch (err) {
        console.error(`❌ Erro RSS (${containerId}):`, err);
        const containerErr = document.getElementById(containerId);
        if (containerErr) {
          containerErr.innerHTML =
            '<div class="news-item"><div class="news-item-title">Erro ao carregar notícias.</div></div>';
        }
        setBadgeText(badgeId, null);
      }
    }

    function updateNews() {
      const infomoney = 'https://www.infomoney.com.br/feed/';
      const googleNews = 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419';

      // Tênis esportivo em PT-BR: busca afinada para reduzir “calçado”
      const googleTennisPt = 'https://news.google.com/rss/search?q=' +
        encodeURIComponent('tênis AND (ATP OR WTA OR "Grand Slam" OR Roland Garros OR Wimbledon OR "US Open" OR "Australian Open")') +
        '&hl=pt-BR&gl=BR&ceid=BR:pt-419';

      fetchRSSFeed(infomoney, 'news-finance', 'news-finance-updated');
      fetchRSSFeed(googleNews, 'news-world', 'news-world-updated');
      fetchRSSFeed(googleTennisPt, 'news-tennis', 'news-tennis-updated');
    }

    updateNews();
    setInterval(updateNews, 5 * 60 * 1000);

    // ========= Inicialização =========
    fetchQuotes();
    setInterval(fetchQuotes, 60 * 1000);

    loadMetalsFromCache();
    fetchMetals();
    setInterval(fetchMetals, 60 * 60 * 1000);

    buildTickerBar();
    fetchExtraForTicker();
    setInterval(buildTickerBar, 60 * 1000);
  