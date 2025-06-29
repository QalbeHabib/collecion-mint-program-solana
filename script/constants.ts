import { PublicKey } from "@solana/web3.js";
import { AutoVerifyNft } from "../target/types/auto_verify_nft";
import IDL from "../target/idl/auto_verify_nft.json";

// =====================================
// PROGRAM CONSTANTS
// =====================================

/**
 * Auto-Verify NFT Program ID
 * This is the deployed program address on Solana
 */
export const PROGRAM_ID = new PublicKey(
  "avnQdm8yHVaiRt6nGuVWnUhzUnEbqcRN5v3cMATrV2X"
);

/**
 * Program IDL (Interface Definition Language)
 * Contains the program's interface, accounts, and instructions
 */
export const PROGRAM_IDL = IDL as AutoVerifyNft;

/**
 * Program Type for TypeScript
 */
export type ProgramType = AutoVerifyNft;

// =====================================
// SOLANA PROGRAM IDS
// =====================================

/**
 * Metaplex Token Metadata Program ID
 * Used for creating NFT metadata and master editions
 */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

/**
 * SPL Token Program ID
 * Standard program for token operations
 */
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

/**
 * Associated Token Program ID
 * For creating associated token accounts
 */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

/**
 * System Program ID
 * Core Solana program for account creation and transfers
 */
export const SYSTEM_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111"
);

/**
 * Rent Sysvar ID
 * For rent calculations
 */
export const RENT_SYSVAR_ID = new PublicKey(
  "SysvarRent111111111111111111111111111111111"
);

// =====================================
// NETWORK CONFIGURATIONS
// =====================================

/**
 * Network configuration for different Solana clusters
 */
export const NETWORK_CONFIG = {
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    commitment: "confirmed" as const,
    explorerUrl: "https://explorer.solana.com",
    cluster: "devnet" as const,
  },
  testnet: {
    rpcUrl: "https://api.testnet.solana.com",
    commitment: "confirmed" as const,
    explorerUrl: "https://explorer.solana.com",
    cluster: "testnet" as const,
  },
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    commitment: "confirmed" as const,
    explorerUrl: "https://explorer.solana.com",
    cluster: "mainnet-beta" as const,
  },
  localhost: {
    rpcUrl: "http://127.0.0.1:8899",
    commitment: "confirmed" as const,
    explorerUrl: "https://explorer.solana.com",
    cluster: "localnet" as const,
  },
} as const;

/**
 * Current network configuration (change this to switch networks)
 */
export const CURRENT_NETWORK = NETWORK_CONFIG.devnet;

// =====================================
// PDA SEEDS
// =====================================

/**
 * Seeds used for Program Derived Addresses (PDAs)
 */
export const PDA_SEEDS = {
  COLLECTION_AUTHORITY: "collection_authority",
  METADATA: "metadata",
  EDITION: "edition",
} as const;

// =====================================
// TRANSACTION CONSTANTS
// =====================================

/**
 * Transaction and fee constants
 */
export const TRANSACTION_CONFIG = {
  /**
   * Minimum SOL balance required for collection initialization (in lamports)
   */
  MIN_ADMIN_BALANCE: 0.1 * 1e9, // 0.1 SOL

  /**
   * Minimum SOL balance required for NFT minting (in lamports)
   */
  MIN_USER_BALANCE: 0.05 * 1e9, // 0.05 SOL

  /**
   * Default commitment level for transactions
   */
  COMMITMENT: "confirmed" as const,

  /**
   * Transaction confirmation timeout (in milliseconds)
   */
  CONFIRMATION_TIMEOUT: 60000, // 60 seconds

  /**
   * Delay between batch operations (in milliseconds)
   */
  BATCH_DELAY: 1000, // 1 second
} as const;

// =====================================
// METADATA CONSTRAINTS
// =====================================

/**
 * Constraints for NFT and collection metadata
 */
export const METADATA_CONSTRAINTS = {
  /**
   * Maximum length for collection/NFT names
   */
  MAX_NAME_LENGTH: 32,

  /**
   * Maximum length for collection/NFT symbols
   */
  MAX_SYMBOL_LENGTH: 10,

  /**
   * Maximum length for metadata URIs
   */
  MAX_URI_LENGTH: 200,

  /**
   * Maximum length for collection seeds
   */
  MAX_COLLECTION_SEED_LENGTH: 32,

  /**
   * Maximum seller fee basis points (100% = 10000)
   */
  MAX_SELLER_FEE_BASIS_POINTS: 10000,
} as const;

// =====================================
// DEFAULT CONFIGURATIONS
// =====================================

/**
 * Default collection configuration
 */
export const DEFAULT_COLLECTION_CONFIG = {
  seed: "default_collection_v1",
  metadata: {
    name: "Default NFT Collection",
    symbol: "DNC",
    uri: "https://example.com/default-collection.json",
    sellerFeeBasisPoints: 500, // 5% royalty
  },
} as const;

/**
 * Default NFT configuration
 */
export const DEFAULT_NFT_CONFIG = {
  name: "Default NFT #001",
  symbol: "DNC",
  uri: "https://example.com/default-nft.json",
  sellerFeeBasisPoints: 250, // 2.5% royalty
} as const;

// =====================================
// UTILITY FUNCTIONS
// =====================================

/**
 * Generate collection authority PDA
 * @param collectionSeed - Unique seed for the collection
 * @returns [PublicKey, bump] tuple
 */
export function getCollectionAuthorityPDA(
  collectionSeed: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.COLLECTION_AUTHORITY), Buffer.from(collectionSeed)],
    PROGRAM_ID
  );
}

/**
 * Generate metadata PDA for a mint
 * @param mint - The mint public key
 * @returns [PublicKey, bump] tuple
 */
export function getMetadataPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.METADATA),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}

/**
 * Generate master edition PDA for a mint
 * @param mint - The mint public key
 * @returns [PublicKey, bump] tuple
 */
export function getMasterEditionPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.METADATA),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from(PDA_SEEDS.EDITION),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}

/**
 * Get explorer URL for a transaction or account
 * @param signature - Transaction signature or account address
 * @param type - Type of explorer link ('tx' or 'address')
 * @returns Explorer URL string
 */
export function getExplorerUrl(
  signature: string,
  type: "tx" | "address" = "tx"
): string {
  const baseUrl = CURRENT_NETWORK.explorerUrl;
  const cluster =
    (CURRENT_NETWORK.cluster as string) === "mainnet-beta"
      ? ""
      : `?cluster=${CURRENT_NETWORK.cluster}`;

  return `${baseUrl}/${type}/${signature}${cluster}`;
}

/**
 * Convert SOL to lamports
 * @param sol - Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): number {
  return sol * 1e9;
}

/**
 * Convert lamports to SOL
 * @param lamports - Amount in lamports
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

/**
 * Validate collection seed
 * @param seed - Collection seed to validate
 * @throws Error if seed is invalid
 */
export function validateCollectionSeed(seed: string): void {
  if (!seed || seed.length === 0) {
    throw new Error("Collection seed cannot be empty");
  }

  if (seed.length > METADATA_CONSTRAINTS.MAX_COLLECTION_SEED_LENGTH) {
    throw new Error(
      `Collection seed too long. Maximum length: ${METADATA_CONSTRAINTS.MAX_COLLECTION_SEED_LENGTH}`
    );
  }

  // Check for valid characters (alphanumeric and underscores)
  if (!/^[a-zA-Z0-9_]+$/.test(seed)) {
    throw new Error(
      "Collection seed can only contain alphanumeric characters and underscores"
    );
  }
}

/**
 * Validate metadata fields
 * @param metadata - Metadata object to validate
 * @throws Error if metadata is invalid
 */
export function validateMetadata(metadata: {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
}): void {
  if (!metadata.name || metadata.name.length === 0) {
    throw new Error("Name cannot be empty");
  }

  if (metadata.name.length > METADATA_CONSTRAINTS.MAX_NAME_LENGTH) {
    throw new Error(
      `Name too long. Maximum length: ${METADATA_CONSTRAINTS.MAX_NAME_LENGTH}`
    );
  }

  if (!metadata.symbol || metadata.symbol.length === 0) {
    throw new Error("Symbol cannot be empty");
  }

  if (metadata.symbol.length > METADATA_CONSTRAINTS.MAX_SYMBOL_LENGTH) {
    throw new Error(
      `Symbol too long. Maximum length: ${METADATA_CONSTRAINTS.MAX_SYMBOL_LENGTH}`
    );
  }

  if (!metadata.uri || metadata.uri.length === 0) {
    throw new Error("URI cannot be empty");
  }

  if (metadata.uri.length > METADATA_CONSTRAINTS.MAX_URI_LENGTH) {
    throw new Error(
      `URI too long. Maximum length: ${METADATA_CONSTRAINTS.MAX_URI_LENGTH}`
    );
  }

  if (
    metadata.sellerFeeBasisPoints < 0 ||
    metadata.sellerFeeBasisPoints >
      METADATA_CONSTRAINTS.MAX_SELLER_FEE_BASIS_POINTS
  ) {
    throw new Error(
      `Invalid seller fee basis points. Must be between 0 and ${METADATA_CONSTRAINTS.MAX_SELLER_FEE_BASIS_POINTS}`
    );
  }
}

// =====================================
// TYPE DEFINITIONS
// =====================================

/**
 * Collection metadata type
 */
export interface CollectionMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
}

/**
 * NFT metadata type
 */
export interface NftMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
}

/**
 * Collection initialization result
 */
export interface CollectionResult {
  signature: string;
  collectionMint: PublicKey;
  collectionMetadata: PublicKey;
  collectionMasterEdition: PublicKey;
  collectionAuthorityPda: PublicKey;
  adminTokenAccount: PublicKey;
}

/**
 * NFT minting result
 */
export interface MintResult {
  signature: string;
  nftMint: PublicKey;
  nftMetadata: PublicKey;
  nftMasterEdition: PublicKey;
  userTokenAccount: PublicKey;
}

/**
 * Network type
 */
export type NetworkType = keyof typeof NETWORK_CONFIG;

// =====================================
// ERROR MESSAGES
// =====================================

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: "Insufficient SOL balance for transaction fees",
  INVALID_COLLECTION_MINT: "Invalid collection mint address",
  COLLECTION_NOT_FOUND: "Collection not found or not initialized",
  INVALID_PRIVATE_KEY: "Invalid private key format",
  NETWORK_ERROR: "Network connection error",
  TRANSACTION_FAILED: "Transaction failed to confirm",
  INVALID_METADATA: "Invalid metadata configuration",
  PROGRAM_ERROR: "Program execution error",
} as const;

// =====================================
// SUCCESS MESSAGES
// =====================================

/**
 * Success messages for operations
 */
export const SUCCESS_MESSAGES = {
  COLLECTION_INITIALIZED: "Collection initialized successfully",
  NFT_MINTED: "NFT minted and verified successfully",
  BATCH_COMPLETED: "Batch operation completed successfully",
  TRANSACTION_CONFIRMED: "Transaction confirmed successfully",
} as const;

// =====================================
// EXPORT ALL
// =====================================

/**
 * Export everything for easy importing
 */
export default {
  PROGRAM_ID,
  PROGRAM_IDL,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  RENT_SYSVAR_ID,
  NETWORK_CONFIG,
  CURRENT_NETWORK,
  PDA_SEEDS,
  TRANSACTION_CONFIG,
  METADATA_CONSTRAINTS,
  DEFAULT_COLLECTION_CONFIG,
  DEFAULT_NFT_CONFIG,
  getCollectionAuthorityPDA,
  getMetadataPDA,
  getMasterEditionPDA,
  getExplorerUrl,
  solToLamports,
  lamportsToSol,
  validateCollectionSeed,
  validateMetadata,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
