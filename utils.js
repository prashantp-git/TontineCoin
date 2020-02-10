"use strict";

let crypto = require('crypto');
var keypair = require('keypair');

// CRYPTO settings
const HASH_ALG = 'sha256';
const SIG_ALG = 'RSA-SHA256';

exports.hash = function hash(s, encoding) {
  encoding = encoding || 'hex';
  return crypto.createHash(HASH_ALG).update(s).digest(encoding);
}

exports.generateKeypair = function() {
  return keypair();
}

exports.sign = function(privKey, msg) {
  let signer = crypto.createSign(SIG_ALG);
  // Convert an object to its JSON representation
  let str = (msg === Object(msg)) ? JSON.stringify(msg) : ""+msg;
  return signer.update(str).sign(privKey, 'hex');
}

exports.verifySignature = function(pubKey, msg, sig) {
  let verifier = crypto.createVerify(SIG_ALG);
  // Convert an object to its JSON representation
  let str = (msg === Object(msg)) ? JSON.stringify(msg) : ""+msg;
  return verifier.update(str).verify(pubKey, sig, 'hex');
}

exports.calcAddress = function(key) {
  let addr = exports.hash(""+key, 'base64');
  //console.log(`Generating address ${addr} from ${key}`);
  return addr;
}

 /*** START PROJECT MODIFICATION: ADD ***/
const MAX_RANGE = 256;

// Returns a random number between 0 and 255.
function sample() {
  return crypto.randomBytes(1).readUInt8();
}

exports.nextInt = function(range) {
  if (range > MAX_RANGE) {
    throw new Error(`Sorry, range cannot be more than ${MAX_RANGE}`);
  }
  let ur = Math.floor(MAX_RANGE/range)*range;
  let samp = sample();
  while(samp>ur){
    samp = sample();
  }
  return samp % range;
}
/*** END PROJECT MODIFICATION: ADD ***/