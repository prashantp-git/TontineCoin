"use strict";

const keypair = require('keypair');

const utils = require('./utils.js')

/**
 * A wallet is a collection of "coins", where a coin is defined as
 * a UTXO (unspent transaction output) and its associated
 * transaction ID and output index.
 * 
 * In order to spend the coins, we also hold the public/private keys
 * associated with each coin.
 * 
 * For simplicity, we use a JBOK ("just a bag of keys") wallet.
 */
module.exports = class Wallet {
  
  /**
   * Initializes an array for coins as well as an address->keypair map.
   * 
   * A coin is a triple of the UTXO, a transaction ID, and an output index,
   * in the form:
   * { output, txID, outputIndex }
   * 
   * An address is the hash of the corresponding public key.
   */
  constructor() {
    // An array of the UTXOs
    this.coins = [];

    // An address is the hash of the public key.
    // Its value is the public/private key pair.
    this.addresses = {};
  }

  /**
   * Return the total balance of all UTXOs.
   * 
   * @returns The total number of coins in the wallet.
   */
  get balance() {
    return this.coins.reduce((acc, {output}) => acc + output.amount, 0);
  }

  /**
   * Accepts and stores a UTXO and the information needed to create
   * the input to spend it.
   * 
   * @param {Object} utxo - The unspent transaction output.
   * @param {String} txID - The hex string representing the ID of the transaction
   *          where the UTXO was created.
   * @param {number} outputIndex - The index of the output in the transaction.
   */
  addUTXO(utxo, txID, outputIndex) {
    if (this.addresses[utxo.address] === undefined) {
      throw new Error(`Wallet does not have key for ${utxo.address}`);
    }

    // We store the coins in a queue, so that we spend the oldest
    // (and most likely finalized) first.
    this.coins.unshift({
      output: utxo,
      txID: txID,
      outputIndex: outputIndex,
    });
  }

  /**
   * Returns inputs to spend enough UTXOs to meet or exceed the specified
   * amount of coins.
   * 
   * Calling this method also **deletes** the UTXOs used. This approach
   * optimistically assumes that the transaction will be accepted.  Just
   * in case, the keys are not deleted.  From the blockchain and the
   * key pair, the wallet can manually recreate the UTXO if it fails to
   * be created.
   * 
   * If the amount requested exceeds the available funds, an exception is
   * thrown.
   * 
   * @param {number} amount - The amount that is desired to spend.
   * 
   * @returns An object containing an array of inputs that meet or exceed
   *    the amount required, and the amount of change left over.
   */
  spendUTXOs(amount) {
    if (amount > this.balance) {
      throw new Error(`Insufficient funds.  Requested ${amount}, but only ${this.balance} is available.`);
    }

    //
    // **YOUR CODE HERE**
    //
    // Gather enough "coins" from the wallet to meet or exceed
    // the specified amount.  Create an array of inputs that
    // can unlock the UTXOs.
    //
    // Return an object containing the array of inputs and the
    // amount of change needed.

    
    let inputs =  [];
    let changeAmt = 0;
    let currBalance = 0;
    while(this.coins.length){
      if(currBalance >= amount){
        break;
      }
      let {output, txID, outputIndex} = this.coins.pop();
      currBalance += output.amount;
      let kp = this.addresses[output.address];
      let sig = utils.sign(kp.private, output);
      inputs.push({
        txID: txID,
        outputIndex: outputIndex,
        pubKey: kp.public,
        sig: sig 
      });
    }
    return {
      inputs: inputs,
      changeAmt: currBalance-amount
    };
  }

  /*** CS298 PROJECT MODIFICATION: START ***/
  undInputsFromBnd(tx) {
    let inputs = [];
    let output = tx.outputs[0];
    let kp = this.addresses[output.address];
    let sig = utils.sign(kp.private, output);
    inputs.push({
      txID: tx.id,
      outputIndex: 0,
      pubKey: kp.public,
      sig: sig 
    });
    return inputs;
  }
  /*** CS298 PROJECT MODIFICATION: END ***/

  /**
   * Makes a new keypair and calculates its address from that.
   * The address is the hash of the public key.
   * 
   * @returns The address.
   */
  makeAddress() {
    let kp = keypair();
    let addr = utils.calcAddress(kp.public);
    this.addresses[addr] = kp;
    return addr;
  }

  /**
   * Checks to see if the wallet contains the specified public key.
   * This function allows a client to check if a broadcast output
   * should be added to the client's wallet.
   * 
   * @param {String} address - The hash of the public key identifying an address.
   */
  hasKey(address) {
    return !!this.addresses[address];
  }
}
