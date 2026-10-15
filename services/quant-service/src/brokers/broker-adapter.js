class BrokerAdapter {
  async getAccount() {
    throw new Error('El broker debe implementar getAccount().');
  }

  async getQuote(_symbol) {
    throw new Error('El broker debe implementar getQuote().');
  }

  async getOptionChain(_filters) {
    throw new Error('El broker debe implementar getOptionChain().');
  }
}

module.exports = BrokerAdapter;
