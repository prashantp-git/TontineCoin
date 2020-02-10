"use strict";

let Block = require('./block.js');
let Client = require('./client.js');
let Transaction = require('./transaction.js');

const NUM_ROUNDS_MINING = 2000;

const PROOF_FOUND = "PROOF_FOUND";
const START_MINING = "START_MINING";
const POST_TRANSACTION = "POST_TRANSACTION";

/*** START PROJECT MODIFICATION: ADD ***/
let utils = require('./utils');
const BigInteger = require('jsbn').BigInteger;
const NUM_NONCES = 50;
const NUM_BLOCKS = 2;
const BROADCAST_CREATENONCES = "BROADCAST_CREATENONCES";
const BROADCAST_STAKE = "BROADCAST_STAKE";
const BROADCAST_LEDGER = "BROADCAST_LEDGER";
const BROADCAST_MINDIFF_NONCE = "BROADCAST_MINDIFF_NONCE";
const BROADCAST_WINNER = "BROADCAST_WINNER";
/*** CS298 PROJECT MODIFICATION: START ***/
const BROADCAST_PROPOSER = "BROADCAST_PROPOSER";  
const BROADCAST_PROPOSAL = "BROADCAST_PROPOSAL";  
const BROADCAST_PREVOTE = "BROADCAST_PREVOTE";
const BROADCAST_PRECOMMIT = "BROADCAST_PRECOMMIT";
const BROADCAST_COMMIT = "BROADCAST_COMMIT";
/*** CS298 PROJECT MODIFICATION: END ***/
/*** END PROJECT MODIFICATION: ADD ***/

/**
 * Miners are clients, but they also mine blocks looking for "proofs".
 * 
 * Each miner stores a map of blocks, where the hash of the block
 * is the key.
 */
module.exports = class Miner extends Client {
  /**
   * When a new miner is created, but the PoW search is **not** yet started.
   * The initialize method kicks things off.
   * 
   * @param {function} broadcast - The function that the miner will use
   *      to send messages to all other clients.
   */
  constructor(name, broadcast) {
    super(broadcast);

    // Used for debugging only.
    this.name = name;

    this.previousBlocks = {};

    /*** START PROJECT MODIFICATION: ADD ***/
    this.nonces = [];
    this.stake;
    this.stakes = {};
    this.ledger = {};
    this.minDiffNonces = {};
    this.minDiffNonceBlocks = {};
    this.receivedWinners = {};    
    /*** CS298 PROJECT MODIFICATION: START ***/
    //this.height = 0;
    this.bndTxs = [];
    this.accumPower = {};
    this.totalStakes = 0;
    this.receivedProposers = {}; 
    this.proposal; 
    this.proofOfLock = [];
    this.precommits = [];
    this.commits = [];
    /*** CS298 PROJECT MODIFICATION: END ***/
    this.on(BROADCAST_CREATENONCES,this.createNonces);
    this.on(BROADCAST_LEDGER, this.registerLedger);
    this.on(BROADCAST_STAKE, this.registerStake);
    this.on(BROADCAST_MINDIFF_NONCE, this.registerMinDiffNonce);
    this.on(BROADCAST_WINNER, this.receiveWinner);
    /*** CS298 PROJECT MODIFICATION: START ***/
    this.on(POST_TRANSACTION, this.addTransaction);
    this.on(BROADCAST_PROPOSER, this.receiveProposer); 
    this.on(BROADCAST_PROPOSAL, this.receiveProposal);
    this.on(BROADCAST_PREVOTE, this.receivePrevote);
    this.on(BROADCAST_PRECOMMIT, this.receivePrecommit);
    this.on(BROADCAST_COMMIT, this.receiveCommit);
    /*** CS298 PROJECT MODIFICATION: END ***/
    /*** END PROJECT MODIFICATION: ADD ***/
  }

  /*** START PROJECT MODIFICATION: ADD ***/
  registerLedger(ledger) {
    this.ledger = JSON.parse(JSON.stringify(ledger));
  }
  createNonces() {
    for (let i = 0; i < NUM_NONCES; i++) {
      this.nonces.push(utils.nextInt(100));
    }
  }
  haveStake(stake) {
    /*** CS298 PROJECT MODIFICATION: START ***/
    //TODO: spendUTXO (stake) at the lock address and then create a sig from it
    /*** CS298 PROJECT MODIFICATION: END ***/
    this.stake = stake;
    let o = { name: this.name, stake: stake };
    this.broadcast(BROADCAST_STAKE, o);
  }

  registerStake(o) {
    let { name, stake } = o;
    if (stake > this.ledger[name]) {
      throw new Error(`Insufficient funds in ${name}'s wallet. Error while staking amount - ${stake}.`);
    }
    this.ledger[name] -= stake;
    //TODO: Remove blocknum from stakes
    this.stakes[name] = {
      stake: stake,
      blockNum: 0
    }
    this.accumPower[name] = 0;
    this.totalStakes += stake;
  }
  
  init(startingBlock) {
    this.currentBlock = startingBlock;
    this.startNewSearch();
  }

  /*** CS298 PROJECT MODIFICATION: START ***/
  start(startingBlock){
    this.currentBlock = startingBlock;
    //this.startNewSearch();
    this.findProposer();
  }


  bond(amount){
    if (amount > this.wallet.balance) {
      throw new Error(`Requested ${amount}, but wallet only has ${this.wallet.balance}.`);
    }
    let { inputs, changeAmt } = this.wallet.spendUTXOs(amount);
    let outputs = [];
    let selfAddr = this.wallet.makeAddress();
    outputs.push({ address: selfAddr, amount: amount  });
    if (changeAmt > 0) {
      let changeAddr = this.wallet.makeAddress();
      outputs.push({ address: changeAddr, amount: changeAmt });
    }
    let tx = new Transaction({
      inputs: inputs,
      outputs: outputs,
      type: "BND",
    }); 
    this.bndTxs.push(tx);
    console.log("Bond tx created: ");
    console.log(tx);
    console.log();
    this.broadcast(POST_TRANSACTION, tx);
  }

  unbond(){
    let bndTx = this.bndTxs.pop();
    console.log("Bond tx popped: ");
    console.log(bndTx);
    console.log();
    if (bndTx) {
      let inputs = this.wallet.undInputsFromBnd(bndTx);
      let outputs = bndTx.outputs;
      let tx = new Transaction({
        inputs: inputs,
        outputs: outputs,
        type: "UND",
      }); 
      console.log("Unbond tx created: ");
      console.log(tx);
      console.log();
      this.broadcast(POST_TRANSACTION, tx);
    }
  }


  findProposer(){
    let stakesKeys = Object.keys(this.stakes);
    let proposer = this.name;
    let maxStake = -1;
    stakesKeys.forEach(name =>{
      let { stake, blockNum } = this.stakes[name];
      this.accumPower[name] += stake;
      if(maxStake<this.accumPower[name]){
        proposer = name;
        maxStake = this.accumPower[name];
      }
      //console.log(this.name + ": Stake of " + name +" is " + stake);
    });
    //console.log(this.name + ": Broadcasting proposer " + proposer);
    setTimeout(() => {
      ////console.log("findProposer() --> {" + this.name + "}: Proposer is [" + proposer + "]. Broadcasting..."); 
      this.broadcast(BROADCAST_PROPOSER, { name: this.name, proposer: proposer })
    },0);
  }

  receiveProposer(o){
    let { name, proposer} = o;
    this.receivedProposers[name] = proposer;
    let receivedProposersKeys = Object.keys(this.receivedProposers);
    let stakesKeys = Object.keys(this.stakes);
    if (receivedProposersKeys.length === stakesKeys.length) {
      //TODO : Validate all received proposers are same
      this.accumPower[proposer] -= this.totalStakes;
      if(this.name === proposer){
        ////console.log("receiveProposer() --> {"+this.name + "}: Received proposer from <"+name+">. Hurray!! I am the proposer!!");
        setTimeout(() => this.propose(),0);
      }
      else{
        ////console.log("receiveProposer() --> {"+this.name + "}: Recieved proposer from <"+name+">. Validating proposer... Proposer is [" + proposer +"]");
      }
    }
  }

  propose(){
    //TODO: Add height, round etc. to the proposal
    ////console.log("propose() --> {"+this.name + "}: Broadcasting proposal...");
    this.startNewSearch();
    this.broadcast(BROADCAST_PROPOSAL, {proposal: this.currentBlock, name: this.name});
  }

  receiveProposal(o){
    //TODO: Might have a proposal from earlier round
    //TODO: Decision - sign and broadcast prevote for previous proposal / new proposal
    let {proposal, name} = o;
    this.proposal = proposal;
    ////console.log("receiveProposal() --> {"+this.name + "}: Received proposal from <"+name+">");
    setTimeout(() => this.prevote(),0);
  }

  prevote(){
    //TODO: sign and broadcast prevote for previous proposal / new proposal
    let blockHash = utils.hash(this.proposal.serialize(true));
    ////console.log("prevote() --> {"+this.name + "}: Broadcasting prevote...");
    this.broadcast(BROADCAST_PREVOTE, {blochH:blockHash,name:this.name});
  }

  receivePrevote(o){
    //TODO: Check if 2/3 of prevotes are received for the same block that he has, if received, package them in proof-of-lock 
    //      and also lock on to that block
    //      else propose step will happen again.
    // block => blockHash
    let {blochH,name}=o;
    ////console.log("receivePrevote() --> {"+this.name + "}: Received prevote from <"+name+">");
    this.proofOfLock.push(blochH);
    //this.receivedProposers[name] = proposer;
    //let receivedProposersKeys = Object.keys(this.receivedProposers);
    let stakesKeys = Object.keys(this.stakes);
    if (this.proofOfLock.length === (2/3) * stakesKeys.length) {
      //console.log(this.name + ": Ready to precommit");
      setTimeout(() => this.precommit(),0);
    }
  }

  precommit(){
    //TODO: sign and broadcast precommit for locked block
    let blockHash = utils.hash(this.proposal.serialize(true));
    ////console.log("precommit() --> {"+this.name + "}: Broadcasting precommit...");
    this.broadcast(BROADCAST_PRECOMMIT, {blochH:blockHash,name:this.name});
  }

  receivePrecommit(o){
    let {blochH,name}=o;
    ////console.log("receivePrecommit() --> {"+this.name + "}: Received precommit from <"+name+">");
    this.precommits.push(blochH);
    let stakesKeys = Object.keys(this.stakes);
    if (this.precommits.length === (2/3) * stakesKeys.length) {
      //console.log(this.name + ": Ready to commit");
      setTimeout(() => this.commit(),0);
    }
  }

  commit(){
    //TODO: sign and broadcast commit for locked block
    let blockHash = utils.hash(this.proposal.serialize(true));
    ////console.log("commit() --> {"+this.name + "}: Broadcasting commit...");
    this.broadcast(BROADCAST_COMMIT, {blochH:blockHash,name:this.name});
  }

  receiveCommit(o){
    let {blochH,name}=o;
    ////console.log("receiveCommit() --> {"+this.name + "}: Received commit from <"+name+">");
    this.commits.push(blochH);
    let stakesKeys = Object.keys(this.stakes);
    if (this.commits.length === (2/3) * stakesKeys.length) {
      //Set "Commit time"
      //Set "New height"
      ////console.log("receiveCommit() --> {"+this.name + "}: Set Commit time");
      ////console.log("{"+this.name + "}: ************** STARTING NEW ROUND ************");
      //this.startNewSearch();
      setTimeout(() => { 
        this.receivedProposers = {};
        this.proposal = null;
        this.proofOfLock = [];
        this.precommits = [];
        this.commits = [];
        this.findProposer();
      },0); 
    }
  }
  /*** CS298 PROJECT MODIFICATION: END ***/


  startMining(){
    this.findMinDiffNonce();
  }

  findMinDiffNonce() {
    let minDiff = this.currentBlock.target;
    let minNonce = this.nonces[0];
    this.nonces.forEach(n => {
      this.currentBlock.proof = n;
      let h = utils.hash(this.currentBlock.serialize(true));
      let b = new BigInteger(h, 16);
      let diff = this.currentBlock.target.subtract(b);
      //console.log(this.name+": BigInt of Target: "+this.currentBlock.target+" BigInt of block: "+b+" \nDiff in javascript number: "+diff);
      if (minDiff.compareTo(diff.abs()) > 0) {
        minDiff = diff.abs();
        minNonce = n;
      }
    });
    let o = { name: this.name, minDiffNonce: minNonce, blockNum: this.currentBlock.chainLength, block: this.currentBlock.serialize(true) };
    this.broadcast(BROADCAST_MINDIFF_NONCE, o);
  }

  registerMinDiffNonce(o) {
    let { name, minDiffNonce, blockNum, block } = o;
    this.minDiffNonces[name] = minDiffNonce;
    this.minDiffNonceBlocks[name] = block;
    let minDiffNoncesKeys = Object.keys(this.minDiffNonces);
    let stakesKeys = Object.keys(this.stakes);
    if (minDiffNoncesKeys.length === stakesKeys.length) {
      let winner = this.findWinner(minDiffNoncesKeys);
      if (winner === undefined) {
        console.log(this.name + ": Failed to select the next miner");
      }
      else {
        if (winner === this.name) {
          let coinbaseTX = this.currentBlock.coinbaseTX;
          this.wallet.addUTXO(coinbaseTX.outputs[0], coinbaseTX.id, 0);
          console.log(this.name + ": HURRRAYYY!!! I am the winner for block#" + this.currentBlock.chainLength);
        }
        let o = { sender: this.name, winner: winner};
        this.broadcast(BROADCAST_WINNER, o);
        console.log();
      }          
      setTimeout(() => {
        this.startNewSearch(true);
        this.findMinDiffNonce();
      },10000); 
    }
  }

  findWinner(keys) {
    let prob = 0;
    let winner;
    console.log(this.name+": Calculating the probability of the miners for block#"+this.currentBlock.chainLength+" : ");
    keys.forEach(name => {      
      let mNBlock = Block.deserialize(this.minDiffNonceBlocks[name]);
      let { stake, blockNum } = this.stakes[name];
      let blockDiff = mNBlock.chainLength - blockNum;
      if (blockDiff >= NUM_BLOCKS) {
        mNBlock.proof = this.minDiffNonces[name];
        let h = utils.hash(mNBlock.serialize(true));
        let b = new BigInteger(h, 16);
        let diff = mNBlock.target.subtract(b);
        let diffAbs = diff.abs();
        //console.log("---"+name+" eligible with stake: "+stake+" and closeness to the target: "+diffAbs);
        let probTemp = stake * blockDiff * (diffAbs.divide(mNBlock.target));
        console.log("---"+name+"'s probability is "+probTemp);
        if (probTemp > prob) {
          winner = name;
          prob = probTemp;
        }
      }else{
        console.log("---"+name+" has to wait "+blockDiff+" block(s) to be eligible");
      }
    });
    console.log();
    if(winner !== undefined) console.log(this.name+": Winner for block#"+this.currentBlock.chainLength+" is "+winner);
    return winner;
  }

  receiveWinner(o) {
    let { sender, winner } = o;
    this.receivedWinners[sender] = winner;
    let receivedWinsKeys = Object.keys(this.receivedWinners);
    let stakesKeys = Object.keys(this.stakes);
    if (receivedWinsKeys.length === stakesKeys.length) {
      let tempWinner = this.receivedWinners[0];
      for (let i = 1; i < receivedWinsKeys.length; i++) {
        if(this.receivedWinners[i] !== tempWinner){
          console.log(this.name + ": No consensus on a valid winner");
          console.log();                  
          this.minDiffNonces = {};
          this.minDiffNonceBlocks = {};                        
          this.receivedWinners = {};
          return;
        }        
      }

      let b = Block.deserialize(this.minDiffNonceBlocks[winner]);
      if (!this.isBlockValid(b)) {
        console.log(this.name + ": "+winner+" tampered with the blockchain");
        console.log("Seizing "+ winner + "'s stake");
        this.stakes[winner].stake = 0;
      }else{
        console.log();
        console.log(this.name + ": Finalizing the iteration of block#"+this.currentBlock.chainLength+": ");
        console.log("---Resetting winner - " + winner + "'s block number in his/her stake (He/she will be eligible only after "+NUM_BLOCKS+" blocks are produced)");
        this.stakes[winner].blockNum = b.chainLength;
        if (!this.previousBlocks[b.hashVal()]) {
          console.log("---Storing winner's block in my blockchain")
          this.previousBlocks[b.hashVal()] = b;
        }
      }
      this.currentBlock = b;
      this.minDiffNonces = {};
      this.minDiffNonceBlocks = {};                        
      this.receivedWinners = {};
    }
  }

  isBlockValid(b){
    let prevBlock = this.previousBlocks[b.prevBlockHash];
    if(prevBlock === undefined){
      console.log(this.name+": Do not have previous block's data to validate block"+b.serialize(true));
      return true;
    }else{
      let prevBlockHash = prevBlock.hashVal();
      if(prevBlockHash === b.prevBlockHash){
        return true;
      }else{
        console.log(this.name + ": rejecting invalid block " + +b.serialize(true));
        return false;
      }
    }
  }
  /*** END PROJECT MODIFICATION: ADD ***/



  /**
   * Starts listeners and begins mining.
   * 
   * @param {Block} startingBlock - This is the latest block with a proof.
   *      The miner will try to add new blocks on top of it.
   */
  initialize(startingBlock) {
    this.currentBlock = startingBlock;
    this.startNewSearch();

    this.on(START_MINING, this.findProof);
    this.on(PROOF_FOUND, this.receiveBlock);
    this.on(POST_TRANSACTION, this.addTransaction);

    this.emit(START_MINING);
  }

  /**
   * Sets up the miner to start searching for a new block.
   * 
   * @param {boolean} reuseRewardAddress - If set, the miner's previous
   *      coinbase reward address will be reused.
   */
  startNewSearch(reuseRewardAddress = false) {
    // Creating a new address for receiving coinbase rewards.
    // We reuse the old address if 
    if (!reuseRewardAddress) {
      this.rewardAddress = this.wallet.makeAddress();
    }

    // Create a new block, chained to the previous block.
    let b = new Block(this.rewardAddress, this.currentBlock);

    // Store the previous block, and then switch over to the new block.
    this.previousBlocks[b.prevBlockHash] = this.currentBlock;
    this.currentBlock = b;

    // Start looking for a proof at 0.
    this.currentBlock.proof = 0;
  }

  /**
   * Looks for a "proof".  It breaks after some time to listen for messages.  (We need
   * to do this since JS does not support concurrency).
   * 
   * The 'oneAndDone' field is used
   * for testing only; it prevents the findProof method from looking for the proof again
   * after the first attempt.
   * 
   * @param {boolean} oneAndDone - Give up after the first PoW search (testing only).
   */
  findProof(oneAndDone = false) {
    let pausePoint = this.currentBlock.proof + NUM_ROUNDS_MINING;
    while (this.currentBlock.proof < pausePoint) {

      //
      // **YOUR CODE HERE**
      //
      // Search for a proof.  If one is found, the miner should add the coinbase
      // rewards (including the transaction fees) to its wallet.
      //
      // Next, announce the proof to all other miners.
      //
      // After that, create a new block and start searching for a proof.
      // The 'startNewSearch' method might be useful for this last step.

      if (this.currentBlock.verifyProof()) {
        let coinbaseTX = this.currentBlock.coinbaseTX;
        this.wallet.addUTXO(coinbaseTX.outputs[0], coinbaseTX.id, 0);
        this.announceProof();
        this.startNewSearch(true);
        break;
      }
      this.currentBlock.proof++;
    }
    // If we are testing, don't continue the search.
    if (!oneAndDone) {
      // Check if anyone has found a block, and then return to mining.
      setTimeout(() => this.emit(START_MINING), 0);
    }
  }

  /**
   * Broadcast the block, with a valid proof included.
   */
  announceProof() {
    this.broadcast(PROOF_FOUND, this.currentBlock.serialize(true));
  }

  /**
   * Verifies if a blocks proof is valid and all of its
   * transactions are valid.
   * 
   * @param {Block} b - The new block to be verified.
   */
  isValidBlock(b) {
    // FIXME: Should verify that a block chains back to a previously accepted block.
    if (!b.verifyProof()) {
      this.log(`Invalid proof.`);
      return false;
    }
    return true;
  }

  /**
   * Receives a block from another miner. If it is valid,
   * the block will be stored. If it is also a longer chain,
   * the miner will accept it and replace the currentBlock.
   * 
   * @param {string} s - The block in serialized form.
   */
  receiveBlock(s) {
    let b = Block.deserialize(s);
    // FIXME: should not rely on the other block for the utxos.
    if (!this.isValidBlock(b)) {
      this.log(`rejecting invalid block: ${s}`);
      return false;
    }

    // If we don't have it, we store it in case we need it later.
    if (!this.previousBlocks[b.hashVal()]) {
      this.previousBlocks[b.hashVal()] = b;
    }

    // We switch over to the new chain only if it is better.
    if (b.chainLength > this.currentBlock.chainLength) {
      this.log(`cutting over to new chain.`);
      this.currentBlock = b;
      this.startNewSearch(true);
    }
  }

  /**
   * Returns false if transaction is not accepted. Otherwise adds
   * the transaction to the current block.
   * 
   * @param {Transaction} tx - The transaction to add.
   */
  addTransaction(tx) {
    if (!this.currentBlock.willAcceptTransaction(tx)) {
      console.log(this.name+": Didnt accept tx of type "+tx.type);
      return false;
    }
    
    /*** CS298 PROJECT MODIFICATION: START ***/
    ///console.log("Received transaction of type: "+tx.type);
    if (tx.type === "BND") {
      ////In bond transaction, 1st output will be bond amount
      ////and 2nd output will be change. Change should go to 
      ////miner's wallet. Bond amount will go to miner's wallet
      ////when it is unbonded
      let chngAmtOutput = tx.outputs[1];
      if(chngAmtOutput !== undefined && this.wallet.hasKey(chngAmtOutput.address)) {
        this.wallet.addUTXO(chngAmtOutput);
      }
    }
    else if (tx.type === "UND") {
      let bndOutput = tx.outputs[0];
      console.log(this.name+": addTransaction called tx of type "+tx.type);
      console.log(bndOutput);
      console.log();
      if(bndOutput !== undefined && this.wallet.hasKey(bndOutput.address)) {
        console.log(this.name+": unbonding coins ");
        console.log(bndOutput);
        console.log();
        this.wallet.addUTXO(bndOutput);
      }
    }
    /*** CS298 PROJECT MODIFICATION: END ***/

    // FIXME: Toss out duplicate transactions, but store pending transactions.
    console.log(this.name+": adding transaction to current block");
    this.currentBlock.addTransaction(tx);
    return true;
  }

  /**
   * Like console.log, but includes the miner's name to make debugging easier.
   * 
   * @param {String} msg - The message to display to the console.
   */
  log(msg) {
    console.log(`${this.name}: ${msg}`);
  }
}
