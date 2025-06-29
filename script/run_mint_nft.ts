import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, web3 } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  PROGRAM_ID,
  PROGRAM_IDL,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  CURRENT_NETWORK,
  TRANSACTION_CONFIG,
  getCollectionAuthorityPDA,
  getMetadataPDA,
  getMasterEditionPDA,
  getExplorerUrl,
  lamportsToSol,
  validateCollectionSeed,
  validateMetadata,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  type NftMetadata,
  type MintResult,
  type ProgramType,
} from "./constants";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

// =====================================
// CONFIGURATION
// =====================================

// User wallet private key (replace with your actual private key)
const USER_PRIVATE_KEY = "";

// Collection information (from the initialize collection script)
const COLLECTION_CONFIG = {
  mint: "WjsA66zacT83copcLdfdmaSvRaMx9nbLi9RL8qiPRRC", // From initialize collection result
  seed: "my_nft_collection_v1", // Same seed used in collection initialization
};

// NFT configuration
const NFT_CONFIG = {
  name: "Murk Murk 6 Legend",
  symbol: "KAGE",
  uri: "https://gateway.pinata.cloud/ipfs/bafybeife2koh3udrs4yh53foxmrrbewhnd6n3gxzl4tnm6f5gcbgiznave/1.json",
  sellerFeeBasisPoints: 250, // 2.5% royalty
} as NftMetadata;

// =====================================
// MAIN EXECUTION FUNCTION
// =====================================

async function runMintNft(): Promise<MintResult> {
  try {
    console.log("🎨 Starting NFT Minting Script...\n");

    // Validate inputs
    validateCollectionSeed(COLLECTION_CONFIG.seed);
    validateMetadata(NFT_CONFIG);

    // 1. Setup connection and provider
    console.log("🔗 Connecting to Solana...");
    const connection = new Connection(
      CURRENT_NETWORK.rpcUrl,
      CURRENT_NETWORK.commitment
    );

    // 2. Create user keypair from private key
    console.log("🔑 Loading user wallet...");
    const userKeypair = Keypair.fromSecretKey(bs58.decode(USER_PRIVATE_KEY));
    console.log(`👤 User Public Key: ${userKeypair.publicKey.toString()}`);

    // 3. Check user balance
    const userBalance = await connection.getBalance(userKeypair.publicKey);
    console.log(`💰 User Balance: ${lamportsToSol(userBalance)} SOL`);

    if (userBalance < TRANSACTION_CONFIG.MIN_USER_BALANCE) {
      console.log(`⚠️  ${ERROR_MESSAGES.INSUFFICIENT_BALANCE}`);
      console.log(
        `💡 Required: ${lamportsToSol(TRANSACTION_CONFIG.MIN_USER_BALANCE)} SOL`
      );
      // Uncomment the line below if you're on devnet and need SOL
      // await connection.requestAirdrop(userKeypair.publicKey, 1e9);
    }

    // 4. Validate collection mint address
    if (COLLECTION_CONFIG.mint === "PASTE_COLLECTION_MINT_ADDRESS_HERE") {
      console.error(`❌ ${ERROR_MESSAGES.INVALID_COLLECTION_MINT}!`);
      console.log(
        "💡 You can get this from the initialize collection script output."
      );
      process.exit(1);
    }

    const collectionMint = new PublicKey(COLLECTION_CONFIG.mint);
    console.log(`🔗 Collection Mint: ${collectionMint.toString()}`);

    // 5. Setup Anchor provider and program
    console.log("🔧 Setting up Anchor provider...");
    const wallet = new Wallet(userKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: CURRENT_NETWORK.commitment,
    });

    // Load the actual program with IDL
    console.log("📦 Loading program IDL...");
    const program = new Program<ProgramType>(PROGRAM_IDL, provider);

    // 6. Generate NFT mint keypair
    const nftMintKeypair = Keypair.generate();
    console.log(`🆔 NFT Mint: ${nftMintKeypair.publicKey.toString()}`);

    // 7. Derive all required PDAs
    console.log("🔍 Deriving Program Derived Addresses...");

    // Collection Authority PDA
    const [collectionAuthorityPda] = getCollectionAuthorityPDA(
      COLLECTION_CONFIG.seed
    );
    console.log(
      `🤖 Collection Authority PDA: ${collectionAuthorityPda.toString()}`
    );

    // NFT Metadata PDA
    const [nftMetadata] = getMetadataPDA(nftMintKeypair.publicKey);
    console.log(`📄 NFT Metadata: ${nftMetadata.toString()}`);

    // NFT Master Edition PDA
    const [nftMasterEdition] = getMasterEditionPDA(nftMintKeypair.publicKey);
    console.log(`📖 NFT Master Edition: ${nftMasterEdition.toString()}`);

    // Collection Metadata PDA
    const [collectionMetadata] = getMetadataPDA(collectionMint);
    console.log(`📄 Collection Metadata: ${collectionMetadata.toString()}`);

    // Collection Master Edition PDA
    const [collectionMasterEdition] = getMasterEditionPDA(collectionMint);
    console.log(
      `📖 Collection Master Edition: ${collectionMasterEdition.toString()}`
    );

    // User Token Account
    const userTokenAccount = await getAssociatedTokenAddress(
      nftMintKeypair.publicKey,
      userKeypair.publicKey
    );
    console.log(`💰 User Token Account: ${userTokenAccount.toString()}`);

    // 8. Mint the NFT with automatic verification
    console.log("\n📋 Minting NFT with the following details:");
    console.log(`   • Name: ${NFT_CONFIG.name}`);
    console.log(`   • Symbol: ${NFT_CONFIG.symbol}`);
    console.log(`   • URI: ${NFT_CONFIG.uri}`);
    console.log(`   • Royalty: ${NFT_CONFIG.sellerFeeBasisPoints / 100}%`);
    console.log(`   • Collection: ${collectionMint.toString()}`);
    console.log(`   • Collection Seed: ${COLLECTION_CONFIG.seed}\n`);

    console.log("🔨 Sending mint and verify NFT transaction...");
    console.log("⚡ This will automatically verify the NFT in the collection!");

    const tx = await program.methods
      .mintAndVerifyNft(COLLECTION_CONFIG.seed, NFT_CONFIG)
      .accounts({
        user: userKeypair.publicKey,
        nftMint: nftMintKeypair.publicKey,
        // @ts-ignore
        userTokenAccount,
        nftMetadata,
        nftMasterEdition,
        collectionMint,
        collectionMetadata,
        collectionMasterEdition,
        collectionAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([userKeypair, nftMintKeypair])
      .preInstructions([
        web3.ComputeBudgetProgram.setComputeUnitLimit({
          units: 400_000, // Increase from default 200k to 400k
        }),
      ])
      .rpc();

    console.log("✅ Transaction sent! Confirming...");

    // Wait for confirmation
    await connection.confirmTransaction(tx, CURRENT_NETWORK.commitment);

    console.log(`\n🎉 ${SUCCESS_MESSAGES.NFT_MINTED}!`);
    console.log("📊 Results:");
    console.log(`   • Transaction: ${tx}`);
    console.log(`   • NFT Mint: ${nftMintKeypair.publicKey.toString()}`);
    console.log(`   • User Token Account: ${userTokenAccount.toString()}`);
    console.log(`   • NFT Metadata: ${nftMetadata.toString()}`);
    console.log(`   • NFT Master Edition: ${nftMasterEdition.toString()}`);

    console.log("\n🔗 View on Explorer:");
    console.log(`   • Transaction: ${getExplorerUrl(tx, "tx")}`);
    console.log(
      `   • NFT Mint: ${getExplorerUrl(
        nftMintKeypair.publicKey.toString(),
        "address"
      )}`
    );
    console.log(
      `   • User Token Account: ${getExplorerUrl(
        userTokenAccount.toString(),
        "address"
      )}`
    );

    console.log("\n✅ NFT is automatically verified in the collection!");
    console.log("🎨 Your NFT is ready to use!");

    return {
      signature: tx,
      nftMint: nftMintKeypair.publicKey,
      nftMetadata,
      nftMasterEdition,
      userTokenAccount,
    };
  } catch (error) {
    console.error(`\n❌ ${ERROR_MESSAGES.PROGRAM_ERROR}:`, error);

    // Enhanced error handling
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if ("logs" in error) {
        console.error("Program logs:", (error as any).logs);
      }
    }

    process.exit(1);
  }
}

// =====================================
// BATCH MINTING FUNCTION
// =====================================

async function runBatchMintNfts(count: number = 3): Promise<MintResult[]> {
  try {
    console.log(`🚀 Starting Batch NFT Minting Script (${count} NFTs)...\n`);

    const connection = new Connection(
      CURRENT_NETWORK.rpcUrl,
      CURRENT_NETWORK.commitment
    );
    const userKeypair = Keypair.fromSecretKey(bs58.decode(USER_PRIVATE_KEY));

    // Validate collection mint
    if (COLLECTION_CONFIG.mint === "PASTE_COLLECTION_MINT_ADDRESS_HERE") {
      console.error(`❌ ${ERROR_MESSAGES.INVALID_COLLECTION_MINT}!`);
      process.exit(1);
    }

    const collectionMint = new PublicKey(COLLECTION_CONFIG.mint);

    console.log(`👤 User: ${userKeypair.publicKey.toString()}`);
    console.log(`🔗 Collection: ${collectionMint.toString()}`);
    console.log(`📦 Minting ${count} NFTs...\n`);

    const wallet = new Wallet(userKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: CURRENT_NETWORK.commitment,
    });

    const program = new Program<ProgramType>(PROGRAM_IDL, provider);

    // Mint multiple NFTs
    const results: MintResult[] = [];
    for (let i = 1; i <= count; i++) {
      console.log(`🎨 Minting NFT #${i}...`);

      try {
        // Generate unique NFT mint
        const nftMintKeypair = Keypair.generate();

        // Derive PDAs for this NFT
        const [collectionAuthorityPda] = getCollectionAuthorityPDA(
          COLLECTION_CONFIG.seed
        );
        const [nftMetadata] = getMetadataPDA(nftMintKeypair.publicKey);
        const [nftMasterEdition] = getMasterEditionPDA(
          nftMintKeypair.publicKey
        );
        const [collectionMetadata] = getMetadataPDA(collectionMint);
        const [collectionMasterEdition] = getMasterEditionPDA(collectionMint);

        const userTokenAccount = await getAssociatedTokenAddress(
          nftMintKeypair.publicKey,
          userKeypair.publicKey
        );

        // Create unique metadata for this NFT
        const nftMetadata_config: NftMetadata = {
          name: `${NFT_CONFIG.name.split("#")[0]}#${i
            .toString()
            .padStart(3, "0")}`,
          symbol: NFT_CONFIG.symbol,
          uri: NFT_CONFIG.uri.replace(/\/\d+\.json$/, `/${i}.json`),
          sellerFeeBasisPoints: NFT_CONFIG.sellerFeeBasisPoints,
        };

        // Validate metadata
        validateMetadata(nftMetadata_config);

        // Mint the NFT
        const tx = await program.methods
          .mintAndVerifyNft(COLLECTION_CONFIG.seed, nftMetadata_config)
          .accounts({
            user: userKeypair.publicKey,
            nftMint: nftMintKeypair.publicKey,
            // @ts-ignore
            userTokenAccount,
            nftMetadata,
            nftMasterEdition,
            collectionMint,
            collectionMetadata,
            collectionMasterEdition,
            collectionAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([userKeypair, nftMintKeypair])
          .preInstructions([
            web3.ComputeBudgetProgram.setComputeUnitLimit({
              units: 400_000, // Increase from default 200k to 400k
            }),
          ])
          .rpc();

        await connection.confirmTransaction(tx, CURRENT_NETWORK.commitment);

        results.push({
          signature: tx,
          nftMint: nftMintKeypair.publicKey,
          nftMetadata,
          nftMasterEdition,
          userTokenAccount,
        });

        console.log(
          `✅ NFT #${i} minted successfully! Mint: ${nftMintKeypair.publicKey.toString()}`
        );
      } catch (error) {
        console.error(`❌ Failed to mint NFT #${i}:`, error);
      }

      // Small delay between mints
      if (i < count) {
        await new Promise((resolve) =>
          setTimeout(resolve, TRANSACTION_CONFIG.BATCH_DELAY)
        );
      }
    }

    console.log(`\n🎉 ${SUCCESS_MESSAGES.BATCH_COMPLETED}!`);
    console.log(`📊 Successfully minted ${results.length}/${count} NFTs`);
    console.log("✅ All NFTs are automatically verified in the collection!");

    return results;
  } catch (error) {
    console.error(`\n❌ ${ERROR_MESSAGES.PROGRAM_ERROR}:`, error);
    process.exit(1);
  }
}

// =====================================
// SCRIPT EXECUTION
// =====================================

// Check command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (require.main === module) {
  if (command === "batch") {
    const count = parseInt(args[1]) || 3;
    runBatchMintNfts(count)
      .then((results) => {
        console.log(
          `\n🏁 Batch script completed! Minted ${results.length} NFTs.`
        );
        console.log(
          "🎯 All NFTs are automatically verified in the collection!"
        );
        process.exit(0);
      })
      .catch((error) => {
        console.error("\n💥 Batch script failed:", error);
        process.exit(1);
      });
  } else {
    runMintNft()
      .then((result) => {
        console.log("\n🏁 Script completed successfully!");
        console.log("🎯 NFT is automatically verified in the collection!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("\n💥 Script failed:", error);
        process.exit(1);
      });
  }
}

export { runMintNft, runBatchMintNfts };
