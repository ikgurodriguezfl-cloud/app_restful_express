const BrokerAdapter = require('../broker-adapter');

class AlpacaAdapter extends BrokerAdapter {
  constructor({
    keyId,
    secretKey,
    tradingBaseUrl,
    dataBaseUrl,
    optionsFeed = 'indicative',
    fetchImplementation = fetch,
  }) {
    super();
    this.keyId = keyId;
    this.secretKey = secretKey;
    this.tradingBaseUrl = tradingBaseUrl.replace(/\/$/, '');
    this.dataBaseUrl = dataBaseUrl.replace(/\/$/, '');
    this.optionsFeed = optionsFeed;
    this.fetch = fetchImplementation;
  }

  async request(baseUrl, path) {
    const response = await this.fetch(`${baseUrl}${path}`, {
      headers: {
        'APCA-API-KEY-ID': this.keyId,
        'APCA-API-SECRET-KEY': this.secretKey,
      },
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body.message || 'Alpaca rechazó la solicitud.');
      error.status = response.status;
      throw error;
    }
    return body;
  }

  async getAccount() {
    const account = await this.request(this.tradingBaseUrl, '/v2/account');
    return {
      provider: 'alpaca',
      id: account.id,
      status: account.status,
      currency: account.currency,
      buyingPower: account.buying_power,
      cash: account.cash,
      tradingBlocked: account.trading_blocked,
    };
  }

  async getQuote(symbol) {
    if (!symbol || !/^[A-Z0-9.-]+$/i.test(symbol)) {
      const error = new Error('symbol debe ser un ticker válido.');
      error.status = 400;
      throw error;
    }
    const quote = await this.request(
      this.dataBaseUrl,
      `/v2/stocks/${encodeURIComponent(symbol.toUpperCase())}/quotes/latest`,
    );
    return {
      provider: 'alpaca',
      symbol: symbol.toUpperCase(),
      bid: quote.quote?.bp ?? null,
      ask: quote.quote?.ap ?? null,
      bidSize: quote.quote?.bs ?? null,
      askSize: quote.quote?.as ?? null,
      timestamp: quote.quote?.t ?? null,
    };
  }

  async getOptionChain({ symbol, expiration, strikeRange, limit = 100 }) {
    if (!symbol || !/^[A-Z0-9.-]+$/i.test(symbol)) {
      const error = new Error('symbol debe ser un ticker válido.');
      error.status = 400;
      throw error;
    }
    if (expiration && !/^\d{4}-\d{2}-\d{2}$/.test(expiration)) {
      const error = new Error('expiration debe usar el formato YYYY-MM-DD.');
      error.status = 400;
      throw error;
    }

    const params = new URLSearchParams({
      underlying_symbols: symbol.toUpperCase(),
      status: 'active',
      limit: String(Math.min(Math.max(Number(limit) || 100, 1), 1000)),
    });
    if (expiration) params.set('expiration_date', expiration);
    if (strikeRange) {
      params.set('strike_price_gte', String(strikeRange[0]));
      params.set('strike_price_lte', String(strikeRange[1]));
    }
    const contractsResponse = await this.request(
      this.tradingBaseUrl,
      `/v2/options/contracts?${params.toString()}`,
    );
    const contracts = contractsResponse.option_contracts || contractsResponse.contracts || [];
    const quoteSymbols = contracts.map((contract) => contract.symbol).slice(0, 100);
    let quotes = {};
    if (quoteSymbols.length) {
      const quoteParams = new URLSearchParams({
        symbols: quoteSymbols.join(','),
        feed: this.optionsFeed,
      });
      const quoteResponse = await this.request(
        this.dataBaseUrl,
        `/v1beta1/options/quotes/latest?${quoteParams.toString()}`,
      );
      quotes = quoteResponse.quotes || {};
    }

    const normalizedContracts = contracts.map((contract) => {
      const symbolValue = contract.symbol;
      const quote = quotes[symbolValue] || {};
      return {
        contractSymbol: symbolValue,
        underlyingSymbol: contract.underlying_symbol,
        type: String(contract.type || '').toLowerCase(),
        strike: Number(contract.strike_price),
        expiration: contract.expiration_date,
        multiplier: Number(contract.size || 100),
        status: contract.status,
        bid: quote.bp ?? null,
        ask: quote.ap ?? null,
        bidSize: quote.bs ?? null,
        askSize: quote.as ?? null,
        timestamp: quote.t ?? null,
      };
    });

    return {
      provider: 'alpaca',
      symbol: symbol.toUpperCase(),
      expiration: expiration || null,
      contracts: normalizedContracts,
      capturedAt: new Date().toISOString(),
    };
  }
}

module.exports = AlpacaAdapter;
