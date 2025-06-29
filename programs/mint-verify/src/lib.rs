use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, verify_collection,
        CreateMasterEditionV3, CreateMetadataAccountsV3, VerifyCollection,
    },
    token::{self, InitializeMint, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::types::{Collection, Creator, DataV2};

declare_id!("avnQdm8yHVaiRt6nGuVWnUhzUnEbqcRN5v3cMATrV2X");

#[program]
pub mod auto_verify_nft {
    use super::*;

    /// Initialize collection with program PDA as authority
    pub fn initialize_collection(
        ctx: Context<InitializeCollection>,
        collection_seed: String,
        collection_metadata: CollectionMetadata,
    ) -> Result<()> {
        msg!("Initializing collection with program authority");

        // Verify collection authority PDA derivation
        let bump_seed = [ctx.bumps.collection_authority_pda];
        let collection_authority_seeds: &[&[u8]] = &[
            b"collection_authority",
            collection_seed.as_bytes(),
            &bump_seed,
        ];
        let signer_seeds = &[collection_authority_seeds];

        // Note: Mint is automatically initialized by Anchor due to the #[account(init)] constraint

        // Mint collection NFT to admin
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    to: ctx.accounts.admin_token_account.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            1,
        )?;

        // Create collection metadata with PROGRAM PDA as update authority
        let creators = vec![Creator {
            address: ctx.accounts.admin.key(),
            verified: false, // Admin can verify themselves later if needed
            share: 100,
        }];

        let data = DataV2 {
            name: collection_metadata.name,
            symbol: collection_metadata.symbol,
            uri: collection_metadata.uri,
            seller_fee_basis_points: collection_metadata.seller_fee_basis_points,
            creators: Some(creators),
            collection: None,
            uses: None,
        };

        let create_metadata_cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.collection_metadata.to_account_info(),
                mint: ctx.accounts.collection_mint.to_account_info(),
                mint_authority: ctx.accounts.admin.to_account_info(),
                payer: ctx.accounts.admin.to_account_info(),
                update_authority: ctx.accounts.collection_authority_pda.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds,
        );

        create_metadata_accounts_v3(
            create_metadata_cpi_context,
            data,
            true, // is_mutable
            true, // update_authority_is_signer
            None,
        )?;

        // Create master edition with PROGRAM PDA as update authority
        let create_master_edition_cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.collection_master_edition.to_account_info(),
                mint: ctx.accounts.collection_mint.to_account_info(),
                update_authority: ctx.accounts.collection_authority_pda.to_account_info(),
                mint_authority: ctx.accounts.admin.to_account_info(),
                payer: ctx.accounts.admin.to_account_info(),
                metadata: ctx.accounts.collection_metadata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds,
        );

        create_master_edition_v3(create_master_edition_cpi_context, Some(0))?;

        msg!("Collection initialized successfully with program authority");
        Ok(())
    }

    /// Mint NFT with automatic collection verification
    pub fn mint_and_verify_nft(
        ctx: Context<MintAndVerifyNft>,
        collection_seed: String,
        nft_metadata: NftMetadata,
    ) -> Result<()> {
        msg!("Starting automated mint and verify process");

        // Derive collection authority PDA seeds
        let bump_seed = [ctx.bumps.collection_authority_pda];
        let collection_authority_seeds: &[&[u8]] = &[
            b"collection_authority",
            collection_seed.as_bytes(),
            &bump_seed,
        ];
        let signer_seeds = &[collection_authority_seeds];

        // Note: NFT mint is automatically initialized by Anchor due to the #[account(init)] constraint

        // 1. Mint NFT to user
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.nft_mint.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            1,
        )?;

        // 2. Create NFT metadata with collection reference (unverified initially)
        let creators = vec![Creator {
            address: ctx.accounts.user.key(),
            verified: true,
            share: 100,
        }];

        let collection = Collection {
            verified: false, // Will be verified in next step
            key: ctx.accounts.collection_mint.key(),
        };

        let data = DataV2 {
            name: nft_metadata.name,
            symbol: nft_metadata.symbol,
            uri: nft_metadata.uri,
            seller_fee_basis_points: nft_metadata.seller_fee_basis_points,
            creators: Some(creators),
            collection: Some(collection),
            uses: None,
        };

        let create_metadata_cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.nft_metadata.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                mint_authority: ctx.accounts.user.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                update_authority: ctx.accounts.user.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        create_metadata_accounts_v3(
            create_metadata_cpi_context,
            data,
            true, // is_mutable
            true, // update_authority_is_signer
            None,
        )?;

        // 3. Create master edition
        let create_master_edition_cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.nft_master_edition.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                update_authority: ctx.accounts.user.to_account_info(),
                mint_authority: ctx.accounts.user.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                metadata: ctx.accounts.nft_metadata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        create_master_edition_v3(create_master_edition_cpi_context, Some(0))?;

        // 4. AUTOMATIC VERIFICATION - Program signs with PDA
        msg!("Performing automatic collection verification");

        let verify_collection_cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            VerifyCollection {
                payer: ctx.accounts.user.to_account_info(),
                metadata: ctx.accounts.nft_metadata.to_account_info(),
                collection_authority: ctx.accounts.collection_authority_pda.to_account_info(),
                collection_mint: ctx.accounts.collection_mint.to_account_info(),
                collection_metadata: ctx.accounts.collection_metadata.to_account_info(),
                collection_master_edition: ctx.accounts.collection_master_edition.to_account_info(),
            },
            signer_seeds,
        );

        verify_collection(verify_collection_cpi_context, None)?;

        msg!("NFT minted and automatically verified in collection!");
        Ok(())
    }

    /// Emergency function to update collection authority (admin only)
    pub fn update_collection_authority(
        ctx: Context<UpdateCollectionAuthority>,
        collection_seed: String,
        new_authority: Pubkey,
    ) -> Result<()> {
        // This can be used to transfer collection authority if needed
        // Implementation depends on specific requirements
        msg!("Collection authority update requested");
        Ok(())
    }
}

// =====================================
// ACCOUNT STRUCTURES
// =====================================

#[derive(Accounts)]
#[instruction(collection_seed: String)]
pub struct InitializeCollection<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 0,
        mint::authority = admin,
        mint::freeze_authority = admin,
    )]
    pub collection_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = collection_mint,
        associated_token::authority = admin,
    )]
    pub admin_token_account: Account<'info, TokenAccount>,

    /// CHECK: Metadata account, validated by Metaplex program
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            collection_mint.key().as_ref(),
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: Master edition account, validated by Metaplex program
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            collection_mint.key().as_ref(),
            b"edition",
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub collection_master_edition: UncheckedAccount<'info>,

    /// Program Derived Address - Collection Authority
    #[account(
        seeds = [
            b"collection_authority",
            collection_seed.as_bytes(),
        ],
        bump,
    )]
    pub collection_authority_pda: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex Token Metadata program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(collection_seed: String)]
pub struct MintAndVerifyNft<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = user,
        mint::freeze_authority = user,
    )]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = nft_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: NFT Metadata account, validated by Metaplex program
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub nft_metadata: UncheckedAccount<'info>,

    /// CHECK: NFT Master edition account, validated by Metaplex program
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            nft_mint.key().as_ref(),
            b"edition",
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub nft_master_edition: UncheckedAccount<'info>,

    // Collection accounts
    pub collection_mint: Account<'info, Mint>,

    /// CHECK: Collection metadata account, validated by Metaplex program
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            collection_mint.key().as_ref(),
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: Collection master edition account, validated by Metaplex program
    #[account(
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            collection_mint.key().as_ref(),
            b"edition",
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub collection_master_edition: UncheckedAccount<'info>,

    /// Program Derived Address - Collection Authority
    #[account(
        mut,
        seeds = [
            b"collection_authority",
            collection_seed.as_bytes(),
        ],
        bump,
    )]
    pub collection_authority_pda: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex Token Metadata program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(collection_seed: String)]
pub struct UpdateCollectionAuthority<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [
            b"collection_authority",
            collection_seed.as_bytes(),
        ],
        bump,
    )]
    pub collection_authority_pda: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

// =====================================
// DATA STRUCTURES
// =====================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CollectionMetadata {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub seller_fee_basis_points: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NftMetadata {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub seller_fee_basis_points: u16,
}

// =====================================
// CUSTOM ERRORS
// =====================================

#[error_code]
pub enum AutoVerifyError {
    #[msg("Collection authority PDA derivation failed")]
    InvalidCollectionAuthority,
    #[msg("NFT metadata creation failed")]
    MetadataCreationFailed,
    #[msg("Collection verification failed")]
    VerificationFailed,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid collection seed")]
    InvalidCollectionSeed,
}

// =====================================
// PROGRAM CONSTANTS
// =====================================

pub const COLLECTION_AUTHORITY_SEED: &[u8] = b"collection_authority";
pub const MAX_COLLECTION_SEED_LENGTH: usize = 32;
pub const MAX_METADATA_NAME_LENGTH: usize = 32;
pub const MAX_METADATA_SYMBOL_LENGTH: usize = 10;
pub const MAX_METADATA_URI_LENGTH: usize = 200;
