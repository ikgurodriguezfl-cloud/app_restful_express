const erf = (x) => {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
  return sign * y;
};

const normalCdf = (value) => 0.5 * (1 + erf(value / Math.sqrt(2)));
const normalPdf = (value) => Math.exp(-(value * value) / 2) / Math.sqrt(2 * Math.PI);

const getTimeToMaturity = (expiration) => {
  if (!expiration) {
    return 0.25;
  }

  const target = new Date(expiration);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  const years = diff / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(years, 0.01);
};

const blackScholesPrice = ({
  spot,
  strike,
  rate,
  dividendYield,
  volatility,
  timeToMaturity,
  optionType,
}) => {
  if (!spot || !strike || !volatility || !timeToMaturity || !optionType) {
    throw new Error('Faltan parámetros obligatorios para Black-Scholes.');
  }

  const t = Number(timeToMaturity);
  const sigma = Number(volatility);
  const s = Number(spot);
  const k = Number(strike);
  const r = Number(rate || 0);
  const q = Number(dividendYield || 0);
  const sqrtT = Math.sqrt(t);

  const d1 = (Math.log(s / k) + (r - q + (sigma * sigma) / 2) * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const discountedStrike = k * Math.exp(-r * t);
  const discountedSpot = s * Math.exp(-q * t);
  const callValue = discountedSpot * normalCdf(d1) - discountedStrike * normalCdf(d2);
  const putValue = discountedStrike * normalCdf(-d2) - discountedSpot * normalCdf(-d1);

  return optionType === 'call' ? callValue : putValue;
};

const blackScholesGreeks = ({
  spot,
  strike,
  rate,
  dividendYield,
  volatility,
  timeToMaturity,
  optionType,
}) => {
  const t = Number(timeToMaturity);
  const sigma = Number(volatility);
  const s = Number(spot);
  const k = Number(strike);
  const r = Number(rate || 0);
  const q = Number(dividendYield || 0);

  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(s / k) + (r - q + (sigma * sigma) / 2) * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const df = Math.exp(-q * t);
  const discount = Math.exp(-r * t);
  const phiD1 = normalPdf(d1);

  const delta = optionType === 'call'
    ? df * normalCdf(d1)
    : -df * normalCdf(-d1);

  const gamma = df * phiD1 / (s * sigma * sqrtT);

  const theta = optionType === 'call'
    ? (-(df * s * phiD1 * sigma) / (2 * sqrtT)) - r * k * discount * normalCdf(d2) + q * s * df * normalCdf(d1)
    : (-(df * s * phiD1 * sigma) / (2 * sqrtT)) + r * k * discount * normalCdf(-d2) - q * s * df * normalCdf(-d1);

  const vega = s * df * phiD1 * sqrtT;
  const rho = optionType === 'call'
    ? k * t * discount * normalCdf(d2)
    : -k * t * discount * normalCdf(-d2);

  return {
    delta: Number(delta.toFixed(6)),
    gamma: Number(gamma.toFixed(6)),
    theta: Number(theta.toFixed(6)),
    vega: Number(vega.toFixed(6)),
    rho: Number(rho.toFixed(6)),
  };
};

module.exports = {
  blackScholesPrice,
  blackScholesGreeks,
  normalCdf,
  getTimeToMaturity,
};
