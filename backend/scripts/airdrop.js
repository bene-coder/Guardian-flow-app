/**
 * GuardianFlow Devnet Airdrop Script
 * Requests free SOL on devnet for testing blockchain transactions.
 *
 * Usage: node scripts/airdrop.js
 *
 * Run this before testing — each blockchain transaction costs
 * a tiny amount of SOL. On devnet it's completely free.
 */

require('dotenv').config();
const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

async function airdrop() {
  if (!process.env.SOLANA_PRIVATE_KEY) {
    console.error('❌ No SOLANA_PRIVATE_KEY in .env');
    console.error('   Run: node scripts/generate-wallet.js first');
    process.exit(1);
  }

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const secretKey  = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    const wallet     = Keypair.fromSecretKey(secretKey);

    console.log(`\n💧 Requesting 2 SOL airdrop for: ${wallet.publicKey.toString()}`);

    const signature = await connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(signature);

    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`✅ Airdrop successful!`);
    console.log(`   New balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet\n`);

  } catch (error) {
    console.error('❌ Airdrop failed:', error.message);
    console.error('   Devnet may be rate limiting. Try again in 30 seconds.');
  }
}

airdrop();