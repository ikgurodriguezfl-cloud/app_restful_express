const { createBroker } = require('../../../brokers');
const {
  brokerProvider,
  alpacaKeyId,
  alpacaSecretKey,
  alpacaTradingBaseUrl,
  alpacaDataBaseUrl,
  alpacaOptionsFeed,
} = require('../../../config/env');

const broker = createBroker({
  provider: brokerProvider,
  keyId: alpacaKeyId,
  secretKey: alpacaSecretKey,
  tradingBaseUrl: alpacaTradingBaseUrl,
  dataBaseUrl: alpacaDataBaseUrl,
  optionsFeed: alpacaOptionsFeed,
});

const ALLOWED_TIMEFRAMES = ['1Min', '5Min', '15Min', '30Min', '1Hour', '4Hour', '12Hour', '1Day', '1Week'];

const getAccount = async (_request, response) => {
  try {
    return response.json(await broker.getAccount());
  } catch (error) {
    return response.status(error.status || 502).json({
      message: 'No se pudo consultar la cuenta del broker.',
      detail: error.message,
    });
  }
};

const getQuote = async (request, response) => {
  try {
    return response.json(await broker.getQuote(request.query.symbol));
  } catch (error) {
    return response.status(error.status || 502).json({
      message: 'No se pudo consultar la cotización.',
      detail: error.message,
    });
  }
};

const getOptionChain = async (request, response) => {
  try {
    const { symbol, expiration, minStrike, maxStrike, limit } = request.query;
    const strikeRange = minStrike !== undefined && maxStrike !== undefined
      ? [minStrike, maxStrike]
      : undefined;
    return response.json(await broker.getOptionChain({
      symbol,
      expiration,
      strikeRange,
      limit,
    }));
  } catch (error) {
    return response.status(error.status || 502).json({
      message: 'No se pudo consultar la cadena de opciones.',
      detail: error.message,
    });
  }
};

const getCandles = async (request, response) => {
  try {
    const { symbol, timeframe, limit, start, end, sort } = request.query;

    if (!symbol || !/^[A-Z0-9.-]+$/i.test(symbol)) {
      return response.status(400).json({ message: 'symbol debe ser un ticker válido.' });
    }

    const normalizedTimeframe = ALLOWED_TIMEFRAMES.includes(timeframe) ? timeframe : '1Day';
    const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 10000);

    const bars = await broker.getCandles({
      symbol,
      timeframe: normalizedTimeframe,
      limit: normalizedLimit,
      start,
      end,
      sort,
    });

    return response.json(bars);
  } catch (error) {
    return response.status(error.status || 502).json({
      message: 'No se pudo obtener las velas del ticker.',
      detail: error.message,
    });
  }
};

const createOrder = async (request, response) => {
  try {
    const { symbol, qty, side, type = 'market', timeInForce = 'day', limitPrice, stopLossPrice } = request.body || {};

    if (!symbol || !qty || !side) {
      return response.status(400).json({ message: 'Se requiere symbol, qty y side (buy|sell) para crear la orden.' });
    }

    if (!['buy', 'sell'].includes(String(side).toLowerCase())) {
      return response.status(400).json({ message: 'side debe ser buy o sell.' });
    }

    const order = await broker.createOrder({
      symbol,
      qty,
      side,
      type,
      timeInForce,
      limitPrice,
      stopLossPrice,
    });

    return response.status(201).json(order);
  } catch (error) {
    return response.status(error.status || 502).json({
      message: 'No se pudo crear la orden en el broker.',
      detail: error.message,
    });
  }
};

const createSpread = async (request, response) => {
  try {
    const { symbol, legs } = request.body || {};
    if (!symbol || !Array.isArray(legs) || legs.length < 2) {
      return response.status(400).json({ message: 'Se requiere symbol y legs con al menos dos patas para crear el spread.' });
    }
    const spread = await broker.createSpread({ symbol, legs });
    return response.status(201).json(spread);
  } catch (error) {
    return response.status(error.status || 502).json({
      message: 'No se pudo crear el spread en el broker.',
      detail: error.message,
    });
  }
};

module.exports = { getAccount, getQuote, getOptionChain, getCandles, createOrder, createSpread };
