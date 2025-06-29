# Auto-Verify NFT Scripts

This directory contains executable scripts to interact with your auto-verification NFT program.

## Prerequisites

1. Install dependencies:

```bash
npm install @solana/web3.js @solana/spl-token @project-serum/anchor @metaplex-foundation/mpl-token-metadata
```

2. Have your wallet private keys ready (as arrays of numbers)

## Scripts Overview

### 1. `run_initialize_collection.ts` - Initialize Collection (Admin)

Creates a new NFT collection with program PDA as authority.

### 2. `run_mint_nft.ts` - Mint NFTs with Auto-Verification (Users)

Mints NFTs that are automatically verified in the collection.

## Setup Instructions

### Step 1: Configure Admin Wallet

Edit `run_initialize_collection.ts`:

```typescript
// Replace with your admin wallet private key
const ADMIN_PRIVATE_KEY = [
  174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
  // ... rest of your private key array
];

// Configure your collection
const COLLECTION_CONFIG = {
  seed: "my_nft_collection_v1",
  metadata: {
    name: "My NFT Collection",
    symbol: "MNC",
    uri: "https://example.com/my-collection.json",
    seller_fee_basis_points: 500, // 5% royalty
  },
};
```

### Step 2: Configure User Wallet

Edit `run_mint_nft.ts`:

```typescript
// Replace with your user wallet private key
const USER_PRIVATE_KEY = [
  174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
  // ... rest of your private key array
];

// Update with collection mint from Step 3
const COLLECTION_CONFIG = {
  mint: "PASTE_COLLECTION_MINT_ADDRESS_HERE", // Update this!
  seed: "my_nft_collection_v1", // Same seed as admin script
};
```

## Running the Scripts

### Step 3: Initialize Collection (Run Once)

```bash
# Initialize the collection
npx ts-node script/run_initialize_collection.ts
```

**Expected Output:**

```
🚀 Starting Collection Initialization Script...

🔗 Connecting to Solana...
🔑 Loading admin wallet...
👤 Admin Public Key: [ADMIN_PUBLIC_KEY]
💰 Admin Balance: 1.5 SOL
🔧 Setting up Anchor provider...
🎨 Creating collection client...
📋 Initializing collection with the following details:
   • Seed: my_nft_collection_v1
   • Name: My NFT Collection
   • Symbol: MNC
   • URI: https://example.com/my-collection.json
   • Royalty: 5%

✅ Collection initialized successfully!
📊 Results:
   • Transaction: [TRANSACTION_SIGNATURE]
   • Collection Mint: [COLLECTION_MINT_ADDRESS] ← SAVE THIS!
   • Collection Authority PDA: [PDA_ADDRESS]
```

**Important:** Save the `Collection Mint` address from the output!

### Step 4: Update Mint Script

Copy the Collection Mint address from Step 3 and paste it into `run_mint_nft.ts`:

```typescript
const COLLECTION_CONFIG = {
  mint: "[COLLECTION_MINT_ADDRESS_FROM_STEP_3]", // Paste here!
  seed: "my_nft_collection_v1",
};
```

### Step 5: Mint NFTs (Unlimited)

```bash
# Mint a single NFT
npx ts-node script/run_mint_nft.ts

# Or mint multiple NFTs at once
npx ts-node script/run_mint_nft.ts batch 5
```

**Expected Output:**

```
🎨 Starting NFT Minting Script...

🔗 Connecting to Solana...
🔑 Loading user wallet...
👤 User Public Key: [USER_PUBLIC_KEY]
💰 User Balance: 0.8 SOL
🔗 Collection Mint: [COLLECTION_MINT]
🔧 Setting up Anchor provider...
🎨 Creating NFT mint client...
📋 Minting NFT with the following details:
   • Name: My Awesome NFT #001
   • Symbol: MNC
   • URI: https://example.com/my-nft-001.json
   • Royalty: 2.5%
   • Collection: [COLLECTION_MINT]

🎉 NFT MINTED AND VERIFIED SUCCESSFULLY!
📊 Results:
   • Transaction: [TRANSACTION_SIGNATURE]
   • NFT Mint: [NFT_MINT_ADDRESS]
   • User Token Account: [TOKEN_ACCOUNT]

✅ NFT is automatically verified in the collection!
```

## Key Features

### ✅ Automatic Verification

- NFTs are automatically verified in the collection
- No manual verification step required
- Program PDA signs the verification

### ✅ Batch Minting Support

- Mint multiple NFTs in sequence
- Customizable batch sizes
- Progress tracking and error handling

### ✅ Comprehensive Logging

- Detailed transaction information
- Explorer links for easy viewing
- Balance checking and warnings

### ✅ Error Handling

- Validates wallet balances
- Checks collection mint addresses
- Graceful error recovery

## Troubleshooting

### "Low balance" Warning

```bash
# On devnet, you can request SOL
solana airdrop 1 [YOUR_WALLET_ADDRESS] --url devnet
```

### "Cannot find module" Errors

```bash
# Install missing dependencies
npm install @solana/web3.js @solana/spl-token @project-serum/anchor
```

### "Collection mint not found" Error

- Make sure you ran the initialize collection script first
- Copy the correct Collection Mint address to the mint script
- Ensure you're using the same network (devnet/mainnet)

### Transaction Failures

- Check wallet balances (need ~0.05 SOL for minting)
- Verify program is deployed on the correct network
- Check RPC connection stability

## Customization

### Change Network

Update `RPC_URL` in both scripts:

```typescript
// For mainnet
const RPC_URL = "https://api.mainnet-beta.solana.com";

// For devnet
const RPC_URL = "https://api.devnet.solana.com";
```

### Modify NFT Metadata

Edit `NFT_CONFIG` in `run_mint_nft.ts`:

```typescript
const NFT_CONFIG = {
  name: "Custom NFT Name #001",
  symbol: "CUSTOM",
  uri: "https://your-metadata-uri.json",
  seller_fee_basis_points: 250, // 2.5% royalty
};
```

### Change Collection Settings

Edit `COLLECTION_CONFIG` in `run_initialize_collection.ts`:

```typescript
const COLLECTION_CONFIG = {
  seed: "unique_collection_seed_v1",
  metadata: {
    name: "Your Collection Name",
    symbol: "YOUR",
    uri: "https://your-collection-metadata.json",
    seller_fee_basis_points: 750, // 7.5% royalty
  },
};
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Keys**: Never commit private keys to version control
2. **Environment Variables**: Consider using `.env` files for production
3. **Network**: Verify you're on the correct network before transactions
4. **Balances**: Always check wallet balances before large operations

## Support

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify all addresses and configuration
3. Ensure sufficient SOL balance for transactions
4. Check network connectivity and RPC endpoint status

## Example Full Workflow

```bash
# 1. Initialize collection (admin, one time)
npx ts-node script/run_initialize_collection.ts

# 2. Copy collection mint address from output

# 3. Update run_mint_nft.ts with collection mint

# 4. Mint NFTs (users, unlimited)
npx ts-node script/run_mint_nft.ts

# 5. Mint multiple NFTs
npx ts-node script/run_mint_nft.ts batch 10
```

🎉 **That's it!** Your NFTs will be automatically verified in the collection.
