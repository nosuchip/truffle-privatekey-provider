/* Description: lightweight wallet with helpful functionhttps
Resource: github.com/ethereumjs/ethereumjs-wallet */
const Wallet = require('ethereumjs-wallet')  

/* Description: A collection of utility functions for ethereum. It can be used in node.js
Resource: https://github.com/ethereumjs/ethereumjs-util */
const ethUtils = require('ethereumjs-util')

// var bip39 = require("bip39");
// var hdkey = require('ethereumjs-wallet/hdkey');

/* Description: Web3 ProviderEngine is a tool for composing your own web3 providers. */
var ProviderEngine = require("web3-provider-engine"); 
var FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
var HookedSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
var Web3Subprovider = require("web3-provider-engine/subproviders/web3.js");
var Web3 = require("web3");
var Transaction = require('ethereumjs-tx');

//function to be used instead of HDWalletProvider to use private key instead of mnemonic 
function PrivateKeyProvider(privateKey, provider_url) {
  this.wallets = {};
  this.addresses = [];

  const privateKeyBuffer = ethUtils.toBuffer(privateKey)
  const wallet = Wallet.fromPrivateKey(privateKeyBuffer) //generate instance of wallet from provided private key (pk) 
  const addr = wallet.getAddressString() //get public address of the wallet that was generated 

  this.addresses.push(addr); //add this to list of addresses we have access to 
  this.wallets[addr] = wallet; //make this the addr attribute in our wallet object 

  const tmp_accounts = this.addresses; //make the addresses the temp accounts we are accessing 
  const tmp_wallets = this.wallets; //same thing for our temp wallets variable 

  this.engine = new ProviderEngine(); //creating new provider instance with a few methods we can use later 
  this.engine.addProvider(new HookedSubprovider({ 
    getAccounts: function(cb) { cb(null, tmp_accounts) }, //f1: gets the accounts that are on provider's network 
    getPrivateKey: function(address, cb) { // f2: gets pk from the accounts gotten prior in function 1 compares to temp
      if (!tmp_wallets[address]) { return cb('Account not found'); }
      else { cb(null, tmp_wallets[address].getPrivateKey().toString('hex')); }
    },
    signTransaction: function(txParams, cb) { //if our wallet is the one that sent the tx, record the pk from that wallet
      let pkey;
      if (tmp_wallets[txParams.from]) { pkey = tmp_wallets[txParams.from].getPrivateKey(); }
      else { cb('Account not found'); }
      var tx = new Transaction(txParams); //create a new transaction with the tx parameters 
      tx.sign(pkey); //sign transaction with the pk
      var rawTx = '0x' + tx.serialize().toString('hex'); //create a raw tx by serializing the tx
      cb(null, rawTx);
    },
    signMessage: function(a, cb) {
      /* sign message function, input a representing the message
      note: cb is an optional callback function, returns an error object as first 
      parameter and the result as second. */
      let pkey;
      if (tmp_wallets[a.from]) { pkey = tmp_wallets[a.from].getPrivateKey(); }
      else { cb('Account not found'); }

      const web3 = new Web3()
      const prefix = "\x19Ethereum Signed Message:\n32";
      const prefixedBytes = web3.fromAscii(prefix) + a.data.slice(2)
      const prefixedHash = web3.sha3(prefixedBytes, { encoding: 'hex' })
      var echash = Buffer.from(prefixedHash.slice(2), 'hex')
      const ecresult = ethUtils.ecsign(echash, pkey)
      const result = ethUtils.toRpcSig(ecresult.v, ecresult.r, ecresult.s)
      //sending nothing or the result via cb
      cb(null, result)
    }
  }));
  this.engine.addProvider(new FiltersSubprovider());
  this.engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(provider_url)));
  this.engine.start(); // Required by the provider engine.
};

privateKeyProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

privateKeyProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};

// returns the address of the given address_index, first checking the cache
privateKeyProvider.prototype.getAddress = function(idx) {
  console.log('getting addresses', this.addresses[0], idx)
  if (!idx) { return this.addresses[0]; }
  else { return this.addresses[idx]; }
}

// returns the addresses cache
privateKeyProvider.prototype.getAddresses = function() {
  return this.addresses;
}

module.exports = PrivateKeyProvider;
