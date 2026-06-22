/**
 * GuardianFlow Wallet Generator
 * Run once to generate your Solana wallet for blockchain logging.
 *
 * Usage: node scripts/generate-wallet.js
 *
 * Copy the SOLANA_PRIVATE_KEY value into your .env file.
 * Save the public key — you'll need it to receive devnet SOL airdrops.
 */

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

const keypair = Keypair.generate();

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║       GuardianFlow Solana Wallet Generated     ║');
console.log('╚════════════════════════════════════════════════╝\n');

console.log('📋 Add this to your .env file:\n');
console.log(`SOLANA_PRIVATE_KEY=${bs58.encode(keypair.secretKey)}`);
console.log(`\n🔑 Your Public Wallet Address (save this):`);
console.log(`   ${keypair.publicKey.toString()}`);
console.log(`\n🌐 View on Solana Explorer:`);
console.log(`   https://explorer.solana.com/address/${keypair.publicKey.toString()}?cluster=devnet`);
console.log('\n⚠️  IMPORTANT:');
console.log('   - Never share your SOLANA_PRIVATE_KEY');
console.log('   - Never commit .env to GitHub');
console.log('   - After adding to .env, run: node scripts/airdrop.js\n');