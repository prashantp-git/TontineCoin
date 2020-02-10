"use strict";

const utils = require('./utils.js');
const UNB_PERIOD = 3;                                                           /*** CS298 PROJECT MODIFICATION: ADD ***/
/**
 * A transaction is made up of a collection of inputs and outputs.
 * The total value of the outputs must equal or exceed the inputs.
 * 
 * One exception: coinbase transactions have no inputs; Their total
 * outputs should match up with the transaction fees from the
 * transactions in the block, plus an extra reward for for the block
 * itself.
 * 
 * For a transaction, the mining fee is specified as the difference
 * between the total value of the inputs and the total value of the
 * outputs.
 * 
 */
module.exports = class Transaction {

  /**
   * The constructor for a transaction specifies an array of inputs
   * and outputs.  The inputs are optional, in order to support
   * coinbase transactions.
   * 
   * An output is a pair of an amount of coins and the hash of a
   * public key (also called the address), in the form:
   *  {amount, address}
   * 
   * An input is a triple of a transaction ID, the index of an output
   * within that transaction ID, and the public key that matches the
   * hash of the public key from a previous output.  It is in the form:
   *  {txID, outputIndex, pubKey, sig}
   * 
   * @constructor
   * @param {Object} obj - The inputs and outputs of the transaction.
   * @param {Array} obj.outputs - An array of the outputs.
   * @param {Array} obj.inputs - An array of the inputs.
   */
  //constructor({outputs, inputs=[]}) {                             /*** CS298 PROJECT MODIFICATION: COMMENT ***/
  constructor({outputs, inputs=[], type = "REG"}) {                 /*** CS298 PROJECT MODIFICATION: ADD ***/
    this.inputs = inputs;
    this.outputs = outputs;
    /*** CS298 PROJECT MODIFICATION: START ***/
    this.type = type; 
    this.undPeriod = 0;                  
    if (type === "BND") {
      this.undPeriod = UNB_PERIOD;
    }       
    /*** CS298 PROJECT MODIFICATION: END ***/
    
    // The id is determined at creation and remains constant,
    // even if outputs change.  (This case should only come up
    // with coinbase transactions).
    //this.id = utils.hash("" + JSON.stringify({inputs, outputs})); /*** CS298 PROJECT MODIFICATION: COMMENT ***/
    this.id = utils.hash("" + JSON.stringify({type, inputs, outputs}));   /*** CS298 PROJECT MODIFICATION: ADD ***/
  }

  /*** CS298 PROJECT MODIFICATION: START ***/

  /*** CS298 PROJECT MODIFICATION: END ***/

  /**
   * Validates the input and returns the amount of tokens in the output.
   * If the input is invalid, either due to an invalid signature or due
   * to the wrong transaction ID, an exception is raised.
   * 
   * @param {Object} input - The object representing an input
   */
  spendOutput(input) {
    let {txID, outputIndex, pubKey, sig} = input;
    if (txID !== this.id) {
      throw new Error(`Transaction id of input was ${txID}, but this transaction's id is ${this.id}`);
    }
    let output = this.outputs[outputIndex];
    let {amount, address} = output;
    if (utils.calcAddress(pubKey) !== address) {
      throw new Error(`Public key does not match its hash for tx ${this.id}, output ${outputIndex}.`);
    } else if (!utils.verifySignature(pubKey, output, sig)) {
      throw new Error(`Invalid signature for ${this.id}, outpout ${outputIndex}.`);
    } else {
      return amount;
    }
  }

  /**
   * Validates that a transaction's inputs and outputs are valid.
   * In order to validate a transaction, the map of UTXOs is needed.
   * 
   * A transaction is valid if the sum of the UTXOs matching the inputs
   * must be at least as large as the sum out the outputs.  Also, the
   * signatures of the inputs must be valid and match the address
   * specified in the corresponding UTXOs.
   * 
   * Note that coinbase transactions are **not** valid according to this
   * method, and should not be tested with it.
   * 
   * @param {Object} utxos - The UTXOs matching the inputs.
   * @returns {boolean} True if the transaction is valid, false otherwise.
   */
  isValid(utxos) {

    //
    // **YOUR CODE HERE**
    //
    // Return false if the sum of inputs is less than the sum of outputs.
    //
    // This is more difficult than it sounds, since the inputs do not have
    // a value listed.  In order to calculate their value:
    //
    // 1) Look up the list of UTXOs available for the transaction in the
    //      'utxos' argument.
    // 2) From that list, find the matching utxo.  (If you can't find it,
    //      the transaction is invalid).
    // 3) Verify the public key hash in the previous output matches the
    //      transaction's public key, and that the signature on the UTXO
    //      is valid.
    // 4) From here, you can gather the amount of **input** available to
    //      this transaction.

    if(!this.inputs.length){
      console.log("Success by inputs.length 0");
      return true;
    }
    if(!utxos){
      console.log("Failure by no UTXOs");
      return false;
    }
    let totalIn = 0;
    for(let i = 0; i < this.inputs.length; i++) {
      let input = this.inputs[i];
      let txUXTOs = utxos[input.txID];      
      if (txUXTOs && txUXTOs[input.outputIndex]) {
        if(utils.calcAddress(input.pubKey) !== txUXTOs[input.outputIndex].address){
          console.log("Failure by wrong address");
          return false;
        }
        if(!utils.verifySignature(input.pubKey,txUXTOs[input.outputIndex],input.sig)){
          console.log("Failure by wrong signature");
          return false;
        }
        totalIn += txUXTOs[input.outputIndex].amount;
      }
      else{
        console.log("Failure by no txUTXOs");
        return false;
      }
    }
    let totalOut = this.totalOutput();

    //if(totalOut > totalIn){                             /*** CS298 PROJECT MODIFICATION: COMMENT ***/
    if(totalOut > totalIn && this.type !== "UND"){      /*** CS298 PROJECT MODIFICATION: ADD ***/  
      console.log("Failure by totalOut > totalIn");
      return false;
    }

    console.log("Success by all conditions satisfied");
    return true;
  }

  /**
   * This method is used to give an additional reward to the miner for including a
   * transaction.  All rewards are added to the first output in this transaction.
   * 
   * This should only be called on coinbase transactions.
   * 
   * Also note the this changes the contents, but not the id.  That means that the
   * hash of the transaction and the tranasction ID are no longer connected.
   * 
   * @param {number} amount - The number of coins offered as a miner reward.
   */
  addFee(amount) {
    this.outputs[0].amount += amount;
  }

  /**
   * Calculates the total value of all outputs.
   */
  totalOutput() {
    return this.outputs.reduce(
      (acc, {amount}) => acc + amount,
      0);
  }
}
