const {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const crypto = require('crypto');
const bs58  = require('bs58');

// ─── Solana Memo Program Public Key ───────────────────────────────────────────
// This is a native Solana program — no deployment needed.
// It accepts any UTF-8 string and writes it permanently to the chain.
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// ─── Connection ───────────────────────────────────────────────────────────────
// Devnet for hackathon. Switch to 'mainnet-beta' when going live.
let connection;
let wallet;

/**
 * initializeBlockchain
 * Sets up the Solana connection and loads the wallet from your .env PRIVATE_KEY.
 * PRIVATE_KEY should be a base58-encoded Solana private key.
 *
 * To generate one:
 *   node -e "const { Keypair } = require('@solana/web3.js'); const bs58 = require('bs58'); const k = Keypair.generate(); console.log(bs58.encode(k.secretKey));"
 */
function initializeBlockchain() {
  try {
    // Connect to Solana devnet
    connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    if (!process.env.SOLANA_PRIVATE_KEY) {
      console.warn('⚠️  No SOLANA_PRIVATE_KEY in .env. Blockchain logging disabled.');
      console.warn('   Generate one with: node scripts/generate-wallet.js');
      return false;
    }

    // Decode base58 private key into a Keypair
    const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    wallet = Keypair.fromSecretKey(secretKey);

    console.log('✅ Solana blockchain service initialized');
    console.log(`   Network:  Devnet`);
    console.log(`   Wallet:   ${wallet.publicKey.toString()}`);
    console.log(`   Explorer: https://explorer.solana.com/address/${wallet.publicKey.toString()}?cluster=devnet`);

    return true;

  } catch (error) {
    console.error('❌ Blockchain initialization failed:', error.message);
    return false;
  }
}

/**
 * logToBlockchain
 * Hashes the incident data and writes the hash to Solana via the memo program.
 *
 * What gets written on-chain (as a memo string):
 * "GF|PANIC_ALERT|vehicle-001|0x7a8f3b2c...|1717200000000"
 *
 * @param {string} eventType  - "PANIC_ALERT" | "GEOFENCE_VIOLATION" | "DEAD_MAN_SWITCH"
 * @param {string} vehicleId  - Vehicle identifier
 * @param {object} data       - Full event payload (stored in your DB, hashed for chain)
 */
async function logToBlockchain(eventType, vehicleId, data) {
  if (!connection || !wallet) {
    console.warn('⚠️  Blockchain not initialized. Skipping chain log.');
    return { success: false, error: 'Blockchain not initialized' };
  }

  try {
    // Step 1: Hash the full event data — only the hash goes on-chain (privacy + cost)
    const dataString = JSON.stringify(data);
    const dataHash   = crypto.createHash('sha256').update(dataString).digest('hex');

    // Step 2: Build the memo string written permanently to Solana
    // Format: "GF|EVENT_TYPE|VEHICLE_ID|DATA_HASH|TIMESTAMP"
    const memoString = `GF|${eventType}|${vehicleId}|${dataHash}|${Date.now()}`;

    console.log(`📝 Writing to Solana: ${memoString}`);

    // Step 3: Build the memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoString, 'utf-8')
    });

    // Step 4: Build and send the transaction
    const transaction = new Transaction().add(memoInstruction);

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

    console.log(`✅ Logged to Solana blockchain`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer:  ${explorerUrl}`);

    return {
      success:     true,
      signature,
      explorerUrl,
      dataHash,
      memoString,
      eventType,
      vehicleId,
      timestamp:   Date.now()
    };

  } catch (error) {
    console.error('❌ Blockchain logging error:', error.message);
    return {
      success: false,
      error:   error.message
    };
  }
}

/**
 * logPanicAlert
 * Convenience wrapper — called directly when a panic alert fires.
 * This is your most important blockchain event for the demo.
 */
async function logPanicAlert(vehicleId, lat, lng, driverId) {
  return logToBlockchain('PANIC_ALERT', vehicleId, {
    type:      'PANIC_ALERT',
    vehicleId,
    driverId,
    lat,
    lng,
    timestamp: new Date().toISOString()
  });
}

/**
 * logGeofenceViolation
 * Called when a vehicle exits its approved zone.
 */
async function logGeofenceViolation(vehicleId, lat, lng, geofenceName) {
  return logToBlockchain('GEOFENCE_VIOLATION', vehicleId, {
    type:         'GEOFENCE_VIOLATION',
    vehicleId,
    lat,
    lng,
    geofenceName,
    timestamp:    new Date().toISOString()
  });
}

/**
 * logDeadManSwitch
 * Called when vehicle stops anomalously for more than 10 minutes.
 */
async function logDeadManSwitch(vehicleId, lat, lng, stoppedDuration) {
  return logToBlockchain('DEAD_MAN_SWITCH', vehicleId, {
    type:            'DEAD_MAN_SWITCH',
    vehicleId,
    lat,
    lng,
    stoppedDuration, // in milliseconds
    timestamp:       new Date().toISOString()
  });
}

/**
 * verifyEvent
 * Fetches a transaction from Solana and extracts the memo data.
 * Used on the dashboard to show "Blockchain Verified" badge.
 *
 * @param {string} signature - Solana transaction signature
 */
async function verifyEvent(signature) {
  if (!connection) {
    throw new Error('Blockchain not initialized');
  }

  try {
    const tx = await connection.getTransaction(signature, {
      commitment:                       'confirmed',
      maxSupportedTransactionVersion:   0
    });

    if (!tx) {
      return { verified: false, error: 'Transaction not found' };
    }

    // Extract memo from transaction log messages
    const memoLog = tx.meta?.logMessages?.find(log =>
      log.includes('Program log: Memo')
    );

    // Parse the memo string back into structured data
    let parsedMemo = null;
    if (memoLog) {
      const memoContent = memoLog.replace('Program log: Memo (len ', '')
        .replace(/\): .*/, '');

      const parts = memoContent.split('|');
      if (parts.length >= 5 && parts[0] === 'GF') {
        parsedMemo = {
          prefix:    parts[0],
          eventType: parts[1],
          vehicleId: parts[2],
          dataHash:  parts[3],
          timestamp: parseInt(parts[4])
        };
      }
    }

    return {
      verified:    true,
      signature,
      slot:        tx.slot,
      blockTime:   tx.blockTime,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      memo:        parsedMemo
    };

  } catch (error) {
    console.error('Verification error:', error.message);
    return { verified: false, error: error.message };
  }
}

/**
 * getWalletBalance
 * Returns SOL balance — useful to know if you need to airdrop devnet SOL.
 * Airdrop command: solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
 */
async function getWalletBalance() {
  if (!connection || !wallet) return '0';

  try {
    const balance = await connection.getBalance(wallet.publicKey);
    return (balance / LAMPORTS_PER_SOL).toFixed(4) + ' SOL';
  } catch (error) {
    console.error('Get balance error:', error.message);
    return '0';
  }
}

/**
 * airdropDevnetSol
 * Requests free devnet SOL for testing — only works on devnet.
 * Call this once when setting up: GET /api/health will show balance.
 */
async function airdropDevnetSol() {
  if (!connection || !wallet) return false;

  try {
    console.log('💧 Requesting devnet SOL airdrop...');
    const signature = await connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL // Request 2 SOL
    );
    await connection.confirmTransaction(signature);
    console.log('✅ Airdrop confirmed — 2 SOL received');
    return true;
  } catch (error) {
    console.error('Airdrop failed:', error.message);
    return false;
  }
}

module.exports = {
  initializeBlockchain,
  logToBlockchain,
  logPanicAlert,
  logGeofenceViolation,
  logDeadManSwitch,
  verifyEvent,
  getWalletBalance,
  airdropDevnetSol
};