#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("Cv45ivRCLup4BZmQhB95dC3Jc5xLPaPPxARhmQ15njVD");

#[program]
pub mod social {
    use anchor_lang::solana_program::{program::invoke, system_instruction::transfer};

    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>, username: String, bio: String, profile_picture: String) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.authority = ctx.accounts.authority.key();
        user_account.username = username;
        user_account.post_count = 0;
        user_account.followers = 0;
        user_account.following = 0;
        user_account.bio = bio;
        user_account.profile_picture = profile_picture;
        user_account.created_at = Clock::get()?.unix_timestamp;
        user_account.updated_at = 0;
        user_account.is_verified = false;
        user_account.is_private = false;
        user_account.is_active = true;
        user_account.bump = ctx.bumps.user_account;
        Ok(())
    }

    pub fn create_post(ctx: Context<CreatePost>, content: String) -> Result<()> {
        let post = &mut ctx.accounts.post;
        let user_account = &mut ctx.accounts.user_account;

        post.authority = ctx.accounts.authority.key();
        post.content = content;
        post.likes = 0;
        post.comment_count = 0;
        post.created_at = Clock::get()?.unix_timestamp;
        post.post_id = user_account.post_count;

        user_account.post_count += 1;

        Ok(())
    }

    pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
        let like = &mut ctx.accounts.like;
        let post = &mut ctx.accounts.post;

        like.authority = ctx.accounts.authority.key();
        like.post = post.key();
        like.created_at = Clock::get()?.unix_timestamp;

        post.likes += 1;
        Ok(())
    }

    pub fn create_comment(ctx: Context<CreateComment>, content: String) -> Result<()> {
        let comment = &mut ctx.accounts.comment;
        let post = &mut ctx.accounts.post;

        comment.authority = ctx.accounts.authority.key();
        comment.post = post.key();
        comment.content = content;
        comment.created_at = Clock::get()?.unix_timestamp;
        comment.comment_id = post.comment_count;

        post.comment_count += 1;
        Ok(())
    }

    pub fn batch_actions<'info>(ctx: Context<'_, '_, 'info, 'info, BatchActions<'info>>, actions: Vec<BatchAction>) -> Result<()> {
        let mut account_index = 0;
    
        for action in actions {
            match action {
                BatchAction::Like { post_key } => {
                    if account_index + 1 >= ctx.remaining_accounts.len() {
                        return Err(ProgramError::NotEnoughAccountKeys.into());
                    }
    
                    let post_account_info = &ctx.remaining_accounts[account_index];
                    let mut post = Account::<Post>::try_from(post_account_info)?;
    
                    require!(post.key() == post_key, SocialMediaError::InvalidSession);
    
                    account_index += 1;
                    let like_account_info = &ctx.remaining_accounts[account_index];
                    let mut like = Account::<Like>::try_from(like_account_info)?;
    
                    like.authority = ctx.accounts.authority.key();
                    like.post = post_key;
                    like.created_at = Clock::get()?.unix_timestamp;
    
                    post.likes += 1;
                    account_index += 1;
                }
                BatchAction::Comment { post_key, content } => {
                    if account_index + 1 >= ctx.remaining_accounts.len() {
                        return Err(ProgramError::NotEnoughAccountKeys.into());
                    }
    
                    let post_account_info = &ctx.remaining_accounts[account_index];
                    let mut post = Account::<Post>::try_from(post_account_info)?;
    
                    require!(post.key() == post_key, SocialMediaError::InvalidSession);
    
                    account_index += 1;
                    let comment_account_info = &ctx.remaining_accounts[account_index];
                    let mut comment = Account::<Comment>::try_from(comment_account_info)?;
    
                    comment.authority = ctx.accounts.authority.key();
                    comment.post = post_key;
                    comment.content = content;
                    comment.created_at = Clock::get()?.unix_timestamp;
                    comment.comment_id = post.comment_count;
    
                    post.comment_count += 1;
                    account_index += 1;
                }
            }
        }
        Ok(())
    }

    pub fn create_session(ctx: Context<CreateSession>, expired_at: i64) -> Result<()> {
        let session = &mut ctx.accounts.session;
        session.authority = ctx.accounts.authority.key();
        session.session_key = ctx.accounts.session_keypair.key();
        session.expired_at = expired_at;
        session.created_at = Clock::get()?.unix_timestamp;
        session.is_active = true;
        Ok(())
    }

    pub fn fund_session(ctx: Context<FundSession>, amount: u64) -> Result<()> {
        let ix = transfer(&ctx.accounts.authority.key(), &ctx.accounts.session_keypair.key(), amount);

        invoke(&ix, &[ctx.accounts.authority.to_account_info(), ctx.accounts.session_keypair.to_account_info()])?;
        Ok(())
    }

    pub fn refund_session(ctx: Context<RefundSession>) -> Result<()> {
        let session = &mut ctx.accounts.session;

        require!(session.is_active, SocialMediaError::SessionNotActive);

        let session_balance = ctx.accounts.session_keypair.lamports();
        let rent_exempt_minimum = Rent::get()?.minimum_balance(0);

        if session_balance > rent_exempt_minimum {
            let refund_amount = session_balance - rent_exempt_minimum;

            **ctx.accounts.session_keypair.try_borrow_mut_lamports()? -= refund_amount;
            **ctx.accounts.authority.try_borrow_mut_lamports()? += refund_amount;
        }

        session.is_active = false;

        Ok(())
    }

    pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
        let session = &ctx.accounts.session;
        let current_time = Clock::get()?.unix_timestamp;

        require!(current_time > session.expired_at || ctx.accounts.authority.key() == session.authority, SocialMediaError::CannotCloseSession);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePost<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump = user_account.bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + Post::INIT_SPACE,
        seeds = [b"post", authority.key().as_ref(), &user_account.post_count.to_le_bytes()],
        bump
    )]
    pub post: Account<'info, Post>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LikePost<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub post: Account<'info, Post>,
    #[account(
        init,
        payer = authority,
        space = 8 + Like::INIT_SPACE,
        seeds = [b"like", authority.key().as_ref(), post.key().as_ref()],
        bump
    )]
    pub like: Account<'info, Like>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateComment<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub post: Account<'info, Post>,
    #[account(
        init,
        payer = authority,
        space = 8 + Comment::INIT_SPACE,
        seeds = [b"comment", post.key().as_ref(), &post.comment_count.to_le_bytes()],
        bump
    )]
    pub comment: Account<'info, Comment>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BatchActions<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSession<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Session::INIT_SPACE,
        seeds = [b"session", authority.key().as_ref(), session_keypair.key().as_ref()],
        bump
    )]
    pub session: Account<'info, Session>,
    /// CHECK: this is the session keypair that will be used for signing
    pub session_keypair: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundSession<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    ///CHECK: this is the session keypair that will be used for signing
    #[account(mut)]
    pub session_keypair: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"session", authority.key().as_ref(), session_keypair.key().as_ref()],
        bump
    )]
    pub session: Account<'info, Session>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundSession<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    ///CHECK: This is the session keypair that will be used for signing
    #[account(mut)]
    pub session_keypair: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"session", authority.key().as_ref(), session_keypair.key().as_ref()],
        bump,
        constraint = session.authority == authority.key() @ SocialMediaError::UnauthorizedAccess
    )]
    pub session: Account<'info, Session>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    ///CHECK: This is the session keypair
    #[account(mut)]
    pub session_keypair: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"session", authority.key().as_ref(), session_keypair.key().as_ref()],
        bump,
        close = authority
    )]
    pub session: Account<'info, Session>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct UserAccount {
    pub authority: Pubkey,
    #[max_len(32)]
    pub username: String,
    #[max_len(32)]
    pub post_count: u64,
    pub followers: u32,
    pub following: u32,
    #[max_len(280)]
    pub bio: String,
    #[max_len(256)]
    pub profile_picture: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_verified: bool,
    pub is_private: bool,
    pub is_active: bool,
    pub bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct Post {
    pub authority: Pubkey,
    #[max_len(280)]
    pub content: String,
    pub likes: u64,
    pub comment_count: u64,
    pub post_id: u64,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Like {
    pub authority: Pubkey,
    pub post: Pubkey,
    pub created_at: i64
}

#[account]
#[derive(InitSpace)]
pub struct Comment {
    pub authority: Pubkey,
    pub post: Pubkey,
    #[max_len(280)]
    pub content: String,
    pub comment_id: u64,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Session {
    pub authority: Pubkey,
    pub session_key: Pubkey,
    pub expired_at: i64,
    pub created_at: i64,
    pub is_active: bool,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum BatchAction {
    Like { post_key: Pubkey },
    Comment { post_key: Pubkey, content: String },
}

#[error_code]
pub enum SocialMediaError {
    #[msg("Session has expired")]
    SessionExpired,
    #[msg("Invalid Session")]
    InvalidSession,
    #[msg("Content too long")]
    ContentTooLong,
    #[msg("Refund too early - must br within 30 minutes of expiry")]
    RefundTooEarly,
    #[msg("Session is not active")]
    SessionNotActive,
    #[msg("Cannot close session yet")]
    CannotCloseSession,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,

}