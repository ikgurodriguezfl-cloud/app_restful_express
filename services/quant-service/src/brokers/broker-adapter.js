class BrokerAdapter {
  async getAccount() {
    throw new Error('El broker debe implementar getAccount().');
  }

  async getQuote(_symbol) {
    throw new Error('El broker debe implementar getQuote().');
  }

  async getCandles(_filters) {
    throw new Error('El broker debe implementar getCandles().');
  }

  async createOrder(_order) {
    throw new Error('El broker debe implementar createOrder().');
  }

  async getOptionChain(_filters) {
    throw new Error('El broker debe implementar getOptionChain().');
  }
}

module.exports = BrokerAdapter;
