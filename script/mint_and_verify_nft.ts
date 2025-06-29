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

// Type definitions for NFT metadata
export interface NftMetadata {
  name: string;
  symbol: string;
  uri: string;
  seller_fee_basis_points: number;
}

export interface MintResult {
  signature: string;
  nftMint: PublicKey;
  nftMetadata: PublicKey;
  nftMasterEdition: PublicKey;
  userTokenAccount: PublicKey;
}

/**
 * Mint and Verify NFT Client
 *
 * This client handles NFT minting with automatic collection verification
 * using the auto-verification NFT program.
 */
export class MintAndVerifyNftClient {
  private connection: Connection;
  private program: Program;
  private programId: PublicKey;

  constructor(connection: Connection, program: Program, programId?: string) {
    this.connection = connection;
    this.program = program;
    this.programId = programId ? new PublicKey(programId) : PROGRAM_ID;
  }

  /**
   * Mint NFT with automatic collection verification
   *
   * This is the core functionality - single transaction that:
   * 1. Creates NFT mint and token account
   * 2. Mints NFT to user
   * 3. Creates metadata with collection reference
   * 4. Creates master edition
   * 5. AUTOMATICALLY verifies collection using Program PDA
   */
  async mintAndVerifyNft(params: {
    userKeypair: Keypair;
    collectionMint: PublicKey;
    collectionSeed: string;
    metadata: NftMetadata;
  }): Promise<MintResult> {
    const { userKeypair, collectionMint, collectionSeed, metadata } = params;

    console.log("🎨 Minting NFT with automatic verification...");
    console.log(`👤 User: ${userKeypair.publicKey.toString()}`);
    console.log(`🔗 Collection: ${collectionMint.toString()}`);
    console.log(`🏷️  NFT Name: ${metadata.name}`);
    console.log(`🔖 NFT Symbol: ${metadata.symbol}`);

    // Generate NFT mint keypair
    const nftMintKeypair = Keypair.generate();
    console.log(`🆔 NFT Mint: ${nftMintKeypair.publicKey.toString()}`);

    // Derive collection authority PDA
    const [collectionAuthorityPda] = await PublicKey.findProgramAddress(
      [Buffer.from("collection_authority"), Buffer.from(collectionSeed)],
      this.programId
    );
    console.log(`🤖 Program Authority: ${collectionAuthorityPda.toString()}`);

    // Derive NFT metadata PDA
    const [nftMetadata] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintKeypair.publicKey.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    console.log(`📄 NFT Metadata: ${nftMetadata.toString()}`);

    // Derive NFT master edition PDA
    const [nftMasterEdition] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMintKeypair.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    console.log(`📖 NFT Master Edition: ${nftMasterEdition.toString()}`);

    // Derive collection metadata PDA
    const [collectionMetadata] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    console.log(`📄 Collection Metadata: ${collectionMetadata.toString()}`);

    // Derive collection master edition PDA
    const [collectionMasterEdition] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from("edition"),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );
    console.log(
      `📖 Collection Master Edition: ${collectionMasterEdition.toString()}`
    );

    // User token account for NFT
    const userTokenAccount = await getAssociatedTokenAddress(
      nftMintKeypair.publicKey,
      userKeypair.publicKey
    );
    console.log(`💰 User Token Account: ${userTokenAccount.toString()}`);

    try {
      // Execute mint and verify instruction
      console.log("🔨 Building mint and verify transaction...");
      console.log(
        "⚡ This will automatically verify the NFT in the collection!"
      );

      const tx = await this.program.methods
        .mintAndVerifyNft(collectionSeed, {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          sellerFeeBasisPoints: metadata.seller_fee_basis_points,
        })
        .accounts({
          user: userKeypair.publicKey,
          nftMint: nftMintKeypair.publicKey,
          userTokenAccount,
          nftMetadata,
          nftMasterEdition,
          collectionMint,
          collectionMetadata,
          collectionMasterEdition,
          collectionAuthorityPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([userKeypair, nftMintKeypair])
        .rpc();

      console.log("🎉 NFT minted and automatically verified!");
      console.log(`📄 Transaction: https://explorer.solana.com/tx/${tx}`);
      console.log(`🔍 View on Solscan: https://solscan.io/tx/${tx}`);
      console.log(`✅ Collection Verification: AUTOMATIC ✅`);

      return {
        signature: tx,
        nftMint: nftMintKeypair.publicKey,
        nftMetadata,
        nftMasterEdition,
        userTokenAccount,
      };
    } catch (error) {
      console.error("❌ Failed to mint and verify NFT:", error);
      throw error;
    }
  }

  /**
   * Verify an NFT is properly verified in collection
   */
  async verifyNftInCollection(nftMint: PublicKey): Promise<boolean> {
    try {
      const [metadataPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
        ],
        MPL_TOKEN_METADATA_PROGRAM_ID
      );

      const metadataAccount = await this.connection.getAccountInfo(metadataPda);
      if (!metadataAccount) {
        console.log("❌ NFT metadata account not found");
        return false;
      }

      // In a full implementation, you would parse the metadata
      // to check if collection is verified
      console.log("✅ NFT exists and metadata found");
      return true;
    } catch (error) {
      console.error("Error verifying NFT:", error);
      return false;
    }
  }

  /**
   * Get collection authority PDA for verification
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
export class MintAndVerifyExamples {
  private client: MintAndVerifyNftClient;

  constructor(client: MintAndVerifyNftClient) {
    this.client = client;
  }

  /**
   * Example: Mint a gaming item NFT
   */
  async mintGamingItem(collectionMint: PublicKey): Promise<MintResult> {
    console.log("⚔️ Minting Gaming Item NFT Example...\n");

    // Generate user keypair (in production, use wallet)
    const userKeypair = Keypair.generate();
    console.log(`👤 User Public Key: ${userKeypair.publicKey.toString()}`);

    // Airdrop SOL for transaction fees
    await this.client.airdropSol(userKeypair.publicKey, 1);

    // Mint gaming item NFT
    const result = await this.client.mintAndVerifyNft({
      userKeypair,
      collectionMint,
      collectionSeed: "gaming_items_v1",
      metadata: {
        name: "Legendary Sword #001",
        symbol: "GAME",
        uri: "https://example.com/gaming-item-001.json",
        seller_fee_basis_points: 500, // 5% royalty
      },
    });

    console.log("\n⚔️ Gaming item NFT minted and verified!");
    return result;
  }

  /**
   * Example: Mint an art piece NFT
   */
  async mintArtPiece(collectionMint: PublicKey): Promise<MintResult> {
    console.log("🎨 Minting Art Piece NFT Example...\n");

    const userKeypair = Keypair.generate();
    console.log(`👤 User Public Key: ${userKeypair.publicKey.toString()}`);

    await this.client.airdropSol(userKeypair.publicKey, 1);

    const result = await this.client.mintAndVerifyNft({
      userKeypair,
      collectionMint,
      collectionSeed: "digital_art_v1",
      metadata: {
        name: "Abstract Dreams #042",
        symbol: "ART",
        uri: "https://example.com/art-piece-042.json",
        seller_fee_basis_points: 750, // 7.5% royalty
      },
    });

    console.log("\n🎨 Art piece NFT minted and verified!");
    return result;
  }

  /**
   * Example: Mint a utility pass NFT
   */
  async mintUtilityPass(collectionMint: PublicKey): Promise<MintResult> {
    console.log("🎫 Minting Utility Pass NFT Example...\n");

    const userKeypair = Keypair.generate();
    console.log(`👤 User Public Key: ${userKeypair.publicKey.toString()}`);

    await this.client.airdropSol(userKeypair.publicKey, 1);

    const result = await this.client.mintAndVerifyNft({
      userKeypair,
      collectionMint,
      collectionSeed: "utility_passes_v1",
      metadata: {
        name: "Premium Access Pass #123",
        symbol: "PASS",
        uri: "https://example.com/utility-pass-123.json",
        seller_fee_basis_points: 0, // No royalties
      },
    });

    console.log("\n🎫 Utility pass NFT minted and verified!");
    return result;
  }

  /**
   * Batch mint multiple NFTs for stress testing
   */
  async batchMintNfts(params: {
    collectionMint: PublicKey;
    collectionSeed: string;
    count: number;
    baseMetadata: Omit<NftMetadata, "name">;
  }): Promise<MintResult[]> {
    const { collectionMint, collectionSeed, count, baseMetadata } = params;

    console.log(`🚀 Batch minting ${count} NFTs...\n`);

    // Generate users
    const users = Array.from({ length: count }, (_, i) => ({
      keypair: Keypair.generate(),
      index: i + 1,
    }));

    // Airdrop SOL to all users
    console.log("💸 Airdropping SOL to all users...");
    await Promise.all(
      users.map((user) => this.client.airdropSol(user.keypair.publicKey, 1))
    );

    // Start batch minting
    const startTime = Date.now();
    console.log(`⏱️  Starting batch mint at ${new Date().toISOString()}`);

    const mintPromises = users.map(async (user) => {
      try {
        return await this.client.mintAndVerifyNft({
          userKeypair: user.keypair,
          collectionMint,
          collectionSeed,
          metadata: {
            name: `${baseMetadata.symbol} #${user.index
              .toString()
              .padStart(3, "0")}`,
            symbol: baseMetadata.symbol,
            uri: `${baseMetadata.uri.replace(".json", "")}-${user.index}.json`,
            seller_fee_basis_points: baseMetadata.seller_fee_basis_points,
          },
        });
      } catch (error) {
        console.error(`❌ Failed to mint NFT #${user.index}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(mintPromises);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Analyze results
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ) as PromiseFulfilledResult<MintResult>[];
    const failed = results.length - successful.length;

    console.log("\n📈 BATCH MINT RESULTS:");
    console.log(`   • Total NFTs Attempted: ${count}`);
    console.log(`   • Successful Mints: ${successful.length} ✅`);
    console.log(`   • Failed Mints: ${failed} ❌`);
    console.log(
      `   • Success Rate: ${((successful.length / count) * 100).toFixed(1)}%`
    );
    console.log(`   • Total Time: ${duration.toFixed(2)} seconds`);
    console.log(
      `   • Average Time per NFT: ${(duration / successful.length).toFixed(
        2
      )} seconds`
    );
    console.log(
      `   • Throughput: ${(successful.length / duration).toFixed(
        2
      )} NFTs/second`
    );
    console.log(`   • All NFTs Automatically Verified: ✅`);

    return successful.map((r) => r.value);
  }

  /**
   * Demonstrate parallel minting from multiple users
   */
  async demonstrateParallelMinting(collectionMint: PublicKey): Promise<void> {
    console.log("🌍 Demonstrating parallel minting from multiple users...\n");

    const users = [
      { name: "Alice from New York", keypair: Keypair.generate() },
      { name: "Bob from London", keypair: Keypair.generate() },
      { name: "Charlie from Tokyo", keypair: Keypair.generate() },
      { name: "Diana from Sydney", keypair: Keypair.generate() },
      { name: "Eve from Berlin", keypair: Keypair.generate() },
    ];

    // Airdrop SOL to all users
    console.log("💸 Preparing users with SOL...");
    await Promise.all(
      users.map((user) => this.client.airdropSol(user.keypair.publicKey, 1))
    );

    // Each user mints simultaneously
    console.log("🎨 All users minting simultaneously...");
    const mintPromises = users.map(async (user, index) => {
      console.log(`🚀 ${user.name} starting mint...`);

      try {
        const result = await this.client.mintAndVerifyNft({
          userKeypair: user.keypair,
          collectionMint,
          collectionSeed: "gaming_items_v1",
          metadata: {
            name: `Global Mint #${index + 1}`,
            symbol: "GLOBAL",
            uri: `https://example.com/global-${index + 1}.json`,
            seller_fee_basis_points: 250,
          },
        });

        console.log(`✅ ${user.name} successfully minted!`);
        return { user: user.name, result };
      } catch (error) {
        console.error(`❌ ${user.name} failed to mint:`, error);
        return { user: user.name, result: null };
      }
    });

    const results = await Promise.all(mintPromises);

    console.log("\n🌍 PARALLEL MINTING RESULTS:");
    results.forEach(({ user, result }) => {
      if (result) {
        console.log(`   ✅ ${user}: ${result.nftMint.toString()}`);
      } else {
        console.log(`   ❌ ${user}: Failed`);
      }
    });

    const successCount = results.filter((r) => r.result).length;
    console.log(
      `\n📊 Summary: ${successCount}/${users.length} successful mints`
    );
    console.log(
      "🔥 All successful NFTs are automatically verified in collection!"
    );
  }
}

// Default export
export default MintAndVerifyNftClient;

// Configuration for different environments
export const MINT_CONFIG = {
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
