import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

// Program name and ID
const PROGRAM_NAME = "auto_verify_nft";
const PROGRAM_ID = new PublicKey("avnQdm8yHVaiRt6nGuVWnUhzUnEbqcRN5v3cMATrV2X");

// Type definitions for collection metadata
export interface CollectionMetadata {
  name: string;
  symbol: string;
  uri: string;
  seller_fee_basis_points: number;
}

export interface CollectionResult {
  signature: string;
  collectionMint: PublicKey;
  collectionMetadata: PublicKey;
  collectionMasterEdition: PublicKey;
  collectionAuthorityPda: PublicKey;
  adminTokenAccount: PublicKey;
}

/**
 * Initialize Collection Client
 *
 * This client handles collection creation with Program PDA as authority
 * for the auto-verification NFT program.
 */
export class InitializeCollectionClient {
  private connection: Connection;
  private program: Program;
  private programId: PublicKey;

  constructor(connection: Connection, program: Program, programId?: string) {
    this.connection = connection;
    this.program = program;
    this.programId = programId ? new PublicKey(programId) : PROGRAM_ID;
  }

  /**
   * Initialize collection with program PDA as authority
   *
   * This sets up the collection that will automatically verify NFTs
   * The program PDA becomes the update authority for the collection
   */
  async initializeCollection(params: {
    adminKeypair: Keypair;
    collectionSeed: string;
    metadata: CollectionMetadata;
  }): Promise<CollectionResult> {
    const { adminKeypair, collectionSeed, metadata } = params;

    console.log("🚀 Initializing collection with program authority...");
    console.log(`📋 Collection Seed: ${collectionSeed}`);
    console.log(`🏷️  Collection Name: ${metadata.name}`);
    console.log(`🔖 Collection Symbol: ${metadata.symbol}`);

    // Generate collection mint keypair
    const collectionMintKeypair = Keypair.generate();
    console.log(
      `🏷️  Collection Mint: ${collectionMintKeypair.publicKey.toString()}`
    );

    // Derive Program Derived Address for collection authority
    const [collectionAuthorityPda, collectionAuthorityBump] =
      await PublicKey.findProgramAddress(
        [Buffer.from("collection_authority"), Buffer.from(collectionSeed)],
        this.programId
      );
    console.log(
      `📋 Collection Authority PDA: ${collectionAuthorityPda.toString()}`
    );
    console.log(`📋 Collection Authority Bump: ${collectionAuthorityBump}`);

    // Derive collection metadata PDA
    const [collectionMetadata] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMintKeypair.publicKey.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    console.log(`📄 Collection Metadata: ${collectionMetadata.toString()}`);

    // Derive collection master edition PDA
    const [collectionMasterEdition] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMintKeypair.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    console.log(
      `📖 Collection Master Edition: ${collectionMasterEdition.toString()}`
    );

    // Admin token account for collection NFT
    const adminTokenAccount = await getAssociatedTokenAddress(
      collectionMintKeypair.publicKey,
      adminKeypair.publicKey
    );
    console.log(`💰 Admin Token Account: ${adminTokenAccount.toString()}`);

    try {
      // Build initialize collection instruction
      console.log("🔨 Building initialize collection transaction...");

      const tx = await this.program.methods
        .initializeCollection(collectionSeed, {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          sellerFeeBasisPoints: metadata.seller_fee_basis_points,
        })
        .accounts({
          admin: adminKeypair.publicKey,
          collectionMint: collectionMintKeypair.publicKey,
          adminTokenAccount,
          collectionMetadata,
          collectionMasterEdition,
          collectionAuthorityPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([adminKeypair, collectionMintKeypair])
        .rpc();

      console.log("✅ Collection initialized successfully!");
      console.log(`📄 Transaction: https://explorer.solana.com/tx/${tx}`);
      console.log(`🔍 View on Solscan: https://solscan.io/tx/${tx}`);

      return {
        signature: tx,
        collectionMint: collectionMintKeypair.publicKey,
        collectionMetadata,
        collectionMasterEdition,
        collectionAuthorityPda,
        adminTokenAccount,
      };
    } catch (error) {
      console.error("❌ Failed to initialize collection:", error);
      throw error;
    }
  }

  /**
   * Get collection authority PDA for a given seed
   */
  async getCollectionAuthorityPda(
    collectionSeed: string
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("collection_authority"), Buffer.from(collectionSeed)],
      this.programId
    );
  }

  /**
   * Verify collection exists and get its details
   */
  async verifyCollectionExists(collectionMint: PublicKey): Promise<boolean> {
    try {
      const mintAccount = await this.connection.getAccountInfo(collectionMint);
      if (!mintAccount) {
        console.log("❌ Collection mint account not found");
        return false;
      }

      const [metadataPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
        ],
        MPL_TOKEN_METADATA_PROGRAM_ID
      );

      const metadataAccount = await this.connection.getAccountInfo(metadataPda);
      if (!metadataAccount) {
        console.log("❌ Collection metadata account not found");
        return false;
      }

      console.log("✅ Collection exists and is valid");
      return true;
    } catch (error) {
      console.error("Error verifying collection:", error);
      return false;
    }
  }

  /**
   * Airdrop SOL for testing (devnet/testnet only)
   */
  async airdropSol(publicKey: PublicKey, amount: number): Promise<void> {
    try {
      console.log(
        `💸 Requesting ${amount} SOL airdrop for ${publicKey.toString()}`
      );
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * web3.LAMPORTS_PER_SOL
      );
      await this.connection.confirmTransaction(signature);
      console.log(`✅ Airdrop successful: ${signature}`);
    } catch (error) {
      console.warn(`⚠️  Airdrop failed for ${publicKey.toString()}: ${error}`);
      throw error;
    }
  }
}

/**
 * Example usage and testing functions
 */
export class InitializeCollectionExamples {
  private client: InitializeCollectionClient;

  constructor(client: InitializeCollectionClient) {
    this.client = client;
  }

  /**
   * Example: Initialize a gaming collection
   */
  async initializeGamingCollection(): Promise<CollectionResult> {
    console.log("🎮 Initializing Gaming Collection Example...\n");

    // Generate admin keypair (in production, load from secure storage)
    const adminKeypair = Keypair.generate();
    console.log(`👤 Admin Public Key: ${adminKeypair.publicKey.toString()}`);

    // Airdrop SOL for transaction fees (devnet/testnet only)
    await this.client.airdropSol(adminKeypair.publicKey, 2);

    // Initialize collection
    const result = await this.client.initializeCollection({
      adminKeypair,
      collectionSeed: "gaming_items_v1",
      metadata: {
        name: "Epic Gaming Items",
        symbol: "GAME",
        uri: "https://example.com/gaming-collection.json",
        seller_fee_basis_points: 500, // 5% royalty
      },
    });

    console.log("\n🎉 Gaming collection initialized successfully!");
    return result;
  }

  /**
   * Example: Initialize an art collection
   */
  async initializeArtCollection(): Promise<CollectionResult> {
    console.log("🎨 Initializing Art Collection Example...\n");

    const adminKeypair = Keypair.generate();
    console.log(`👤 Admin Public Key: ${adminKeypair.publicKey.toString()}`);

    await this.client.airdropSol(adminKeypair.publicKey, 2);

    const result = await this.client.initializeCollection({
      adminKeypair,
      collectionSeed: "digital_art_v1",
      metadata: {
        name: "Digital Art Masters",
        symbol: "ART",
        uri: "https://example.com/art-collection.json",
        seller_fee_basis_points: 750, // 7.5% royalty
      },
    });

    console.log("\n🎉 Art collection initialized successfully!");
    return result;
  }

  /**
   * Example: Initialize a utility collection (low/no royalties)
   */
  async initializeUtilityCollection(): Promise<CollectionResult> {
    console.log("🔧 Initializing Utility Collection Example...\n");

    const adminKeypair = Keypair.generate();
    console.log(`👤 Admin Public Key: ${adminKeypair.publicKey.toString()}`);

    await this.client.airdropSol(adminKeypair.publicKey, 2);

    const result = await this.client.initializeCollection({
      adminKeypair,
      collectionSeed: "utility_passes_v1",
      metadata: {
        name: "Utility Access Passes",
        symbol: "PASS",
        uri: "https://example.com/utility-collection.json",
        seller_fee_basis_points: 0, // No royalties for utility
      },
    });

    console.log("\n🎉 Utility collection initialized successfully!");
    return result;
  }
}

// Default export
export default InitializeCollectionClient;

// Configuration for different environments
export const COLLECTION_CONFIG = {
  devnet: {
    programId: "avnQdm8yHVaiRt6nGuVWnUhzUnEbqcRN5v3cMATrV2X",
    rpcUrl: "https://api.devnet.solana.com",
    commitment: "confirmed" as web3.Commitment,
  },
  testnet: {
    programId: "avnQdm8yHVaiRt6nGuVWnUhzUnEbqcRN5v3cMATrV2X",
    rpcUrl: "https://api.testnet.solana.com",
    commitment: "confirmed" as web3.Commitment,
  },
  mainnet: {
    programId: "avnQdm8yHVaiRt6nGuVWnUhzUnEbqcRN5v3cMATrV2X",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    commitment: "confirmed" as web3.Commitment,
  },
};
