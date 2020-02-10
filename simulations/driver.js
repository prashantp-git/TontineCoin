"use strict";

let Block = require('../block.js');
let Client = require('../client.js');
let Miner = require('../miner.js');

let fakeNet = require('../fakeNet.js');

/*** START PROJECT MODIFICATION: ADD ***/
const BROADCAST_LEDGER = "BROADCAST_LEDGER"; 
const BROADCAST_CREATENONCES = "BROADCAST_CREATENONCES"; 
const BROADCAST_HAVESTAKE = "BROADCAST_HAVESTAKE"; 
/*** END PROJECT MODIFICATION: ADD ***/

// Clients
let alice = new Client(fakeNet.broadcast);
let bob = new Client(fakeNet.broadcast);
let charlie = new Client(fakeNet.broadcast);

// Miners
let minnie = new Miner("Minnie", fakeNet.broadcast);
let mickey = new Miner("Mickey", fakeNet.broadcast);
let popeye = new Miner("Popeye", fakeNet.broadcast);           // PROJECT MODIFICATION: ADD


let genesis = Block.makeGenesisBlock([
  { client: alice, amount: 133 },
  { client: bob, amount: 99 },
  { client: charlie, amount: 67 },
  { client: minnie, amount: 400 },
  { client: mickey, amount: 322 },
  { client: popeye, amount: 45 },                              // PROJECT MODIFICATION: ADD
]);

console.log();
console.log("Initial balances:");
console.log(`Alice has ${alice.wallet.balance} coins.`);
console.log(`Bob has ${bob.wallet.balance} coins.`);
console.log(`Charlie has ${charlie.wallet.balance} coins.`);
console.log(`Minnie has ${minnie.wallet.balance} coins.`);
console.log(`Mickey has ${mickey.wallet.balance} coins.`);
console.log(`Popeye has ${popeye.wallet.balance} coins.`);    // PROJECT MODIFICATION: ADD
console.log();

fakeNet.register(alice, bob, charlie, minnie, mickey);
fakeNet.register(popeye);                                     // PROJECT MODIFICATION: ADD

/*** START PROJECT MODIFICATION: ADD ***/
let minersLedger = {};
minersLedger[minnie.name] = 400;
minersLedger[mickey.name] = 322;
minersLedger[popeye.name] = 45;
fakeNet.broadcast(BROADCAST_LEDGER, minersLedger);
//fakeNet.broadcast(BROADCAST_CREATENONCES, minersLedger);  /*** CS298 PROJECT MODIFICATION: COMMENT ***/
minnie.haveStake(100);
mickey.haveStake(150);
popeye.haveStake(30);
console.log("Stakes:");
console.log(`Minnie's stake is ${minnie.stake}.`);
console.log(`Mickey's stake is ${mickey.stake}.`);
console.log(`Popeye's stake is ${popeye.stake}.`);
console.log();
console.log("Starting simulation.  This may take a moment...");
console.log();
/*** CS298 PROJECT MODIFICATION: START COMMENT ***/
/*minnie.init(genesis);            
mickey.init(genesis);             
popeye.init(genesis);     
setTimeout(() => minnie.startMining(), 0);     
setTimeout(() => mickey.startMining(), 0);      
setTimeout(() => popeye.startMining(), 0);         
*/
/*** CS298 PROJECT MODIFICATION: END COMMENT ***/
/*** CS298 PROJECT MODIFICATION: START ***/
setTimeout(() => minnie.start(genesis), 0);     
setTimeout(() => mickey.start(genesis), 0);      
setTimeout(() => popeye.start(genesis), 0); 
/*** CS298 PROJECT MODIFICATION: END ***/
   
/*** END PROJECT MODIFICATION: ADD ***/

/*** START PROJECT MODIFICATION: COMMENT ***/
/*
// Miners start mining.
minnie.initialize(genesis);
mickey.initialize(genesis);
*/
/*** END PROJECT MODIFICATION: COMMENT ***/


// Print out the final balances after it has been running for some time.
setTimeout(() => {
  /*** CS298 PROJECT MODIFICATION: ADD ***/
  console.log();
  console.log("Minnie bonding 60 coins");
  //alice.postTransaction([{ amount: 40, address: bobAddr }]);   
  minnie.bond(60);
  /*** CS298 PROJECT MODIFICATION: ADD ***/

  /*** CS298 PROJECT MODIFICATION: COMMENT ***/
  // Alice transfers some money to Bob.
  //let bobAddr = bob.wallet.makeAddress();                   
 // console.log();
  //console.log(`Alice is transfering 40 coins to ${bobAddr}`);
  //alice.postTransaction([{ amount: 40, address: bobAddr }]);   /*** CS298 PROJECT MODIFICATION: COMMENT ***/
//  alice.postTransaction([{ amount: 40, address: bobAddr }],0);
  /*** CS298 PROJECT MODIFICATION: END COMMENT ***/
  console.log();
  console.log(`Minnie has a chain of length ${minnie.currentBlock.chainLength}, with the following UTXOs:`);
  minnie.currentBlock.displayUTXOs();

  console.log();
  console.log(`Mickey has a chain of length ${minnie.currentBlock.chainLength}, with the following UTXOs:`);
  mickey.currentBlock.displayUTXOs();

  /*** START PROJECT MODIFICATION: ADD ***/
  console.log();
  console.log(`Popeye has a chain of length ${minnie.currentBlock.chainLength}, with the following UTXOs:`);
  popeye.currentBlock.displayUTXOs();
  /*** END PROJECT MODIFICATION: ADD ***/

  console.log();
  console.log("Final wallets:");
  console.log(`Alice has ${alice.wallet.balance} coins.`);
  console.log(`Bob has ${bob.wallet.balance} coins.`);
  console.log(`Charlie has ${charlie.wallet.balance} coins.`);
  console.log(`Minnie has ${minnie.wallet.balance} coins.`);
  console.log(`Mickey has ${mickey.wallet.balance} coins.`);
  console.log(`Popeye has ${popeye.wallet.balance} coins.`);                        // PROJECT MODIFICATION: ADD
  console.log();                                                                    // PROJECT MODIFICATION: ADD
}, 5000);



/*** CS298 PROJECT MODIFICATION: ADD ***/
setTimeout(() => {
  console.log();
  console.log("Minnie unbonding");
  minnie.unbond();
  console.log();
  console.log(`Minnie has a chain of length ${minnie.currentBlock.chainLength}, with the following UTXOs:`);
  minnie.currentBlock.displayUTXOs();

  console.log();
  console.log(`Mickey has a chain of length ${minnie.currentBlock.chainLength}, with the following UTXOs:`);
  mickey.currentBlock.displayUTXOs();

  /*** START PROJECT MODIFICATION: ADD ***/
  console.log();
  console.log(`Popeye has a chain of length ${minnie.currentBlock.chainLength}, with the following UTXOs:`);
  popeye.currentBlock.displayUTXOs();

  console.log();
  console.log("Final wallets:");
  console.log(`Alice has ${alice.wallet.balance} coins.`);
  console.log(`Bob has ${bob.wallet.balance} coins.`);
  console.log(`Charlie has ${charlie.wallet.balance} coins.`);
  console.log(`Minnie has ${minnie.wallet.balance} coins.`);
  console.log(`Mickey has ${mickey.wallet.balance} coins.`);
  console.log(`Popeye has ${popeye.wallet.balance} coins.`);                        // PROJECT MODIFICATION: ADD
  console.log();                                                                    // PROJECT MODIFICATION: ADD
}, 10000);