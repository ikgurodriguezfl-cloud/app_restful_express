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

module.exports = { getAccount, getQuote, getOptionChain };
