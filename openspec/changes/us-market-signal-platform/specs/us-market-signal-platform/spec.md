## ADDED Requirements

### Requirement: Instrument and company analysis

The system MUST allow a user to analyze a US-listed instrument or company using a selectable symbol, exchange, sector, and market context.

#### Scenario: instrument selection
- GIVEN a user who wants to evaluate a stock or ETF
- WHEN the user selects an instrument or company
- THEN the system MUST attach the relevant ticker, company profile, and market context to the analysis

### Requirement: Multi-timeframe evaluation

The system MUST support signal analysis for multiple time horizons, including short-term, medium-term, and long-term perspectives.

#### Scenario: timeframe comparison
- GIVEN a selected instrument
- WHEN a user reviews the signal dashboard
- THEN the system MUST show the signal outcome across different timeframes and explain the differences

### Requirement: Technical indicators

The system MUST compute and interpret technical indicators such as trend, momentum, volatility, and support/resistance signals.

#### Scenario: technical signal generation
- GIVEN an instrument with sufficient market data
- WHEN the technical analysis engine runs
- THEN the system MUST evaluate trend and momentum conditions and contribute them to the recommendation

### Requirement: Financial analysis

The system MUST include financial analysis based on relevant company metrics, valuation signals, and profitability indicators.

#### Scenario: financial health review
- GIVEN a company with available financial statements
- WHEN the system evaluates fundamentals
- THEN it MUST score quality, valuation, earnings profile, and balance-sheet context for the asset

### Requirement: News impact assessment

The system MUST consider relevant market news and event-driven sentiment when generating a signal.

#### Scenario: impact analysis
- GIVEN the latest news for a company or sector
- WHEN the news affects price-driving factors
- THEN the system MUST estimate sentiment and incorporate the impact into the final signal

### Requirement: Volatility awareness

The system MUST evaluate volatility and risk regime before presenting a directional signal.

#### Scenario: high-volatility filtering
- GIVEN a symbol under elevated volatility
- WHEN the signal engine evaluates the opportunity
- THEN the system MUST apply risk filters and communicate the effect on conviction and position sizing

### Requirement: Options strategy context

The system MUST inspect the options chain and include option-market context in the final recommendation when available.

#### Scenario: options context
- GIVEN a tradable instrument with options data
- WHEN the analytics layer reviews the chain
- THEN the system MUST surface skew, open interest, and strategy-relevant information without guaranteeing a trade recommendation

### Requirement: Buy, hold, and sell signals

The system MUST produce actionable trade signals with a clear directional bias and explicit reasoning derived from supported analytical domains.

#### Scenario: recommendation output
- GIVEN a complete evaluation set
- WHEN the signal engine computes the final score
- THEN the system MUST output a recommendation, confidence level, and explanation summary

### Requirement: Risk disclaimers

The system MUST include clear risk and disclosure language so that signals are treated as decision-support rather than guaranteed investment advice.

#### Scenario: risk communication
- GIVEN a generated signal
- WHEN the result is displayed to a user
- THEN the system MUST include risk context, data freshness, and a disclaimer that signals are informational and not guaranteed outcomes
