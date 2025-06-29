import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, web3 } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { AutoVerifyNft } from "../target/types/auto_verify_nft";
import IDL from "../target/idl/auto_verify_nft.json";
import {
  PROGRAM_ID,
  PROGRAM_IDL,
  TOKEN_METADATA_PROGRAM_ID,
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
  type CollectionMetadata,
  type CollectionResult,
  type ProgramType,
} from "./constants";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

// =====================================
// CONFIGURATION
// =====================================

// Admin wallet private key (replace with your actual private key)

const ADMIN_PRIVATE_KEY = "";

// Collection configuration
const COLLECTION_CONFIG = {
  seed: "my_nft_collection_v1",
  metadata: {
    name: "Operation 5k",
    symbol: "OP5k",
    uri: "https://gateway.pinata.cloud/ipfs/bafkreibtf2mwqicfboaijcl63y77fzwcklfkqessbdsfxglqzuqcgramma/",
    sellerFeeBasisPoints: 500, // 5% royalty
  } as CollectionMetadata,
};

// =====================================
// MAIN EXECUTION FUNCTION
// =====================================

async function runInitializeCollection(): Promise<CollectionResult> {
  try {
    console.log("🚀 Starting Collection Initialization Script...\n");

    // Validate inputs
    validateCollectionSeed(COLLECTION_CONFIG.seed);
    validateMetadata(COLLECTION_CONFIG.metadata);

    // 1. Setup connection and provider
    console.log("🔗 Connecting to Solana...");
    const connection = new Connection(
      CURRENT_NETWORK.rpcUrl,
      CURRENT_NETWORK.commitment
    );

    // 2. Create admin keypair from private key
    console.log("🔑 Loading admin wallet...");
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(ADMIN_PRIVATE_KEY));
    console.log(`👤 Admin Public Key: ${adminKeypair.publicKey.toString()}`);

    // 3. Check admin balance
    const adminBalance = await connection.getBalance(adminKeypair.publicKey);
    console.log(`💰 Admin Balance: ${lamportsToSol(adminBalance)} SOL`);

    if (adminBalance < TRANSACTION_CONFIG.MIN_ADMIN_BALANCE) {
      console.log(`⚠️  ${ERROR_MESSAGES.INSUFFICIENT_BALANCE}`);
      console.log(
        `💡 Required: ${lamportsToSol(
          TRANSACTION_CONFIG.MIN_ADMIN_BALANCE
        )} SOL`
      );
      // Uncomment the line below if you're on devnet and need SOL
      // await connection.requestAirdrop(adminKeypair.publicKey, 1e9);
    }

    // 4. Setup Anchor provider and program
    console.log("🔧 Setting up Anchor provider...");
    const wallet = new Wallet(adminKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: CURRENT_NETWORK.commitment,
    });

    // Load the actual program with IDL
    console.log("📦 Loading program IDL...");
    const program = new Program<AutoVerifyNft>(PROGRAM_IDL, provider);

    // 5. Generate collection mint keypair
    const collectionMintKeypair = Keypair.generate();
    console.log(
      `🏷️  Collection Mint: ${collectionMintKeypair.publicKey.toString()}`
    );

    // 6. Derive all required PDAs
    console.log("🔍 Deriving Program Derived Addresses...");

    // Collection Authority PDA
    const [collectionAuthorityPda] = getCollectionAuthorityPDA(
      COLLECTION_CONFIG.seed
    );
    console.log(
      `🤖 Collection Authority PDA: ${collectionAuthorityPda.toString()}`
    );

    // Collection Metadata PDA
    const [collectionMetadata] = getMetadataPDA(
      collectionMintKeypair.publicKey
    );
    console.log(`📄 Collection Metadata: ${collectionMetadata.toString()}`);

    // Collection Master Edition PDA
    const [collectionMasterEdition] = getMasterEditionPDA(
      collectionMintKeypair.publicKey
    );
    console.log(
      `📖 Collection Master Edition: ${collectionMasterEdition.toString()}`
    );

    // Admin Token Account
    const adminTokenAccount = await getAssociatedTokenAddress(
      collectionMintKeypair.publicKey,
      adminKeypair.publicKey
    );
    console.log(`💰 Admin Token Account: ${adminTokenAccount.toString()}`);

    // 7. Initialize the collection
    console.log("\n📋 Initializing collection with the following details:");
    console.log(`   • Seed: ${COLLECTION_CONFIG.seed}`);
    console.log(`   • Name: ${COLLECTION_CONFIG.metadata.name}`);
    console.log(`   • Symbol: ${COLLECTION_CONFIG.metadata.symbol}`);
    console.log(`   • URI: ${COLLECTION_CONFIG.metadata.uri}`);
    console.log(
      `   • Royalty: ${
        COLLECTION_CONFIG.metadata.sellerFeeBasisPoints / 100
      }%\n`
    );

    console.log("🔨 Sending initialize collection transaction...");

    const tx = await program.methods
      .initializeCollection(COLLECTION_CONFIG.seed, COLLECTION_CONFIG.metadata)
      .accounts({
        admin: adminKeypair.publicKey,
        collectionMint: collectionMintKeypair.publicKey,
        // @ts-ignore
        adminTokenAccount,
        collectionMetadata,
        collectionMasterEdition,
        collectionAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([adminKeypair, collectionMintKeypair])
      .rpc();

    console.log("✅ Transaction sent! Confirming...");

    // Wait for confirmation
    await connection.confirmTransaction(tx, CURRENT_NETWORK.commitment);

    console.log(`\n🎉 ${SUCCESS_MESSAGES.COLLECTION_INITIALIZED}!`);
    console.log("📊 Results:");
    console.log(`   • Transaction: ${tx}`);
    console.log(
      `   • Collection Mint: ${collectionMintKeypair.publicKey.toString()}`
    );
    console.log(
      `   • Collection Authority PDA: ${collectionAuthorityPda.toString()}`
    );
    console.log(`   • Admin Token Account: ${adminTokenAccount.toString()}`);

    console.log("\n🔗 View on Explorer:");
    console.log(`   • Transaction: ${getExplorerUrl(tx, "tx")}`);
    console.log(
      `   • Collection Mint: ${getExplorerUrl(
        collectionMintKeypair.publicKey.toString(),
        "address"
      )}`
    );

    console.log("\n✅ Collection is now ready for NFT minting!");
    console.log("💡 Save the Collection Mint address for minting NFTs:");
    console.log(
      `   Collection Mint: ${collectionMintKeypair.publicKey.toString()}`
    );

    return {
      signature: tx,
      collectionMint: collectionMintKeypair.publicKey,
      collectionMetadata,
      collectionMasterEdition,
      collectionAuthorityPda,
      adminTokenAccount,
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
// SCRIPT EXECUTION
// =====================================

// Run the script if this file is executed directly
if (require.main === module) {
  runInitializeCollection()
    .then((result) => {
      console.log("\n🏁 Script completed successfully!");
      console.log("🎯 Collection is ready for auto-verified NFT minting!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error);
      process.exit(1);
    });
}

export default runInitializeCollection;
