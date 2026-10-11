## ADDED Requirements

### Requirement: Option pricing support

The system MUST support option pricing using both Black-Scholes and Binomial models to evaluate a trade under multiple assumptions.

#### Scenario: model selection
- GIVEN a user or strategy module requesting a pricing result
- WHEN the model is selected
- THEN the system MUST return a price computed according to the selected pricing engine and record the assumptions used

### Requirement: Greeks calculation

The system MUST compute the principal option Greeks: Delta, Gamma, Theta, Vega, and Rho.

#### Scenario: risk reporting
- GIVEN a valid option pricing input
- WHEN the Greeks engine runs
- THEN the system MUST return each Greek with consistent units and metadata for auditability

### Requirement: Implied volatility estimation

The system MUST estimate implied volatility numerically using a root-finding method and must expose convergence details when the estimate is computed.

#### Scenario: IV solve
- GIVEN a market option price and model assumptions
- WHEN the implied volatility solver runs
- THEN the system MUST calculate the volatility that makes model price match the observed price, using a numerical method such as Newton-Raphson with safeguards

### Requirement: Multi-source option chains

The system MUST ingest option-chain data from multiple sources such as OPRA, Cboe, and Interactive Brokers and normalize them into a single canonical representation.

#### Scenario: provider normalization
- GIVEN raw option-chain data from a provider
- WHEN it is ingested
- THEN the system MUST map the fields to a canonical schema and keep provider metadata for traceability

### Requirement: Dynamic catalog support

The system MUST support a dynamic catalog for option metadata, strategy classification, and market context so that downstream modules can share configuration without duplicating business rules.

#### Scenario: catalog lookup
- GIVEN a strategy or instrument definition
- WHEN a catalog lookup is requested
- THEN the system MUST resolve the relevant metadata using the project catalog conventions and return structured values

### Requirement: Margin and tier logic

The system MUST calculate margin exposure and classify trading scenarios into risk tiers according to the configured strategy and market conditions.

#### Scenario: risk tier evaluation
- GIVEN a trade or scenario with known exposure
- WHEN the margin engine evaluates it
- THEN the system MUST return the required margin, tier classification, and any relevant constraints or warnings

### Requirement: Scenario-based P&L matrix

The system MUST generate a profit-and-loss matrix across multiple scenario assumptions, including price shifts, volatility changes, and time-to-expiry effects.

#### Scenario: scenario run
- GIVEN a strategy setup and market assumptions
- WHEN the scenario matrix is generated
- THEN the system MUST output the relevant magnitude of profit or loss under each scenario, including risk indicators and summary metrics

### Requirement: Explainable quant outputs

The system MUST return output in a human- and machine-readable format so that downstream teams can understand assumptions and reproduction conditions.

#### Scenario: result review
- GIVEN a numerical output from the quant engine
- WHEN a user or client reviews the result
- THEN the system MUST include model type, assumptions, timestamps, and explanatory metadata in the payload
