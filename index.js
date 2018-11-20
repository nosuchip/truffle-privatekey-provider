const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
const WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');
const ProviderSubprovider = require("web3-provider-engine/subproviders/provider.js");
const EthereumjsWallet = require('ethereumjs-wallet');
const Web3 = require("web3");
const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker.js');

function PrivateKeyProvider(privateKey, providerUrl) {
  if (!privateKey) {
    throw new Error(`Private Key missing, non-empty string expected, got "${privateKey}"`);
  }

  if (!providerUrl) {
    throw new Error(`Provider URL missing, non-empty string expected, got "${providerUrl}"`);
  }

  this.wallet = EthereumjsWallet.fromPrivateKey(new Buffer(privateKey, "hex"));
  this.address = "0x" + this.wallet.getAddress().toString("hex");

  this.engine = new ProviderEngine();

  this.engine.addProvider(new FiltersSubprovider());
  this.engine.addProvider(new NonceSubprovider());
  this.engine.addProvider(new WalletSubprovider(this.wallet, {}));

  // HACK: `sendAsync` was removed
  if (!Web3.providers.HttpProvider.prototype.sendAsync) {
    Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send
  }

  this.engine.addProvider(new ProviderSubprovider(new Web3.providers.HttpProvider(providerUrl)));
  this.engine.start();
}

PrivateKeyProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

PrivateKeyProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};


module.exports = PrivateKeyProvider;
