import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { Socialx } from '../target/types/socialx'

describe('social', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const authority = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Socialx as Program<Socialx>
  console.log("program: ", program.programId);

  let userAccount: PublicKey;
  let postAccount: PublicKey;
  let sessionKeypair: Keypair;
  let sessionAccount: PublicKey;

  beforeAll(async() => {
    sessionKeypair = Keypair.generate();

    // Derive user account PDA
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), authority.publicKey.toBuffer()],
      program.programId
    );
    userAccount = userPda;
    
    console.log("authority: ", authority.publicKey.toBase58());
    console.log("userAccount: ", userAccount.toBase58());
  })

  it('Initialize user account', async () => {
    // const [userPda] = PublicKey.findProgramAddressSync(
    //   [Buffer.from("user"), authority.publicKey.toBuffer()],
    //   program.programId
    // );
    // userAccount = userPda;
    // console.log("authority: ", authority.publicKey.toBase58());

    await program.methods
      .initializeUser("testUser", "this is a test bio", "https://avatars.githubusercontent.com/u/116061908")
      .accountsStrict({
        authority: authority.publicKey,
        userAccount: userAccount,
        systemProgram: SystemProgram.programId
      })
      .signers([authority.payer])
      .rpc({ skipPreflight: true })

      const user = await program.account.userAccount.fetch(userAccount);
      console.log("user: ", user);
  })

  it('Create a post', async () => {
    const user = await program.account.userAccount.fetch(userAccount);

    const [postPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("post"), authority.publicKey.toBuffer(), Buffer.from(user.postCount.toArrayLike(Buffer, 'le', 8))],
      program.programId
    );
    postAccount = postPda;
    console.log("postAccount: ", postAccount.toBase58());

    await program.methods
      .createPost("This is my first post!")
      .accountsStrict({ 
        authority: authority.publicKey,
        userAccount: userAccount,
        post: postAccount,
        systemProgram: SystemProgram.programId
      })
      .signers([authority.payer])
      .rpc()

    const post = await program.account.post.fetch(postAccount);
    console.log("post: ", post);
    // expect(post.content).toEqual("This is my first post!");
    // expect(post.likes.toNumber()).toEqual(0);
    // expect(post.commentCount.toNumber()).toEqual(0);
    // expect(post.postId.toNumber()).toEqual(0);

    const updatedUser = await program.account.userAccount.fetch(userAccount);
    // expect(updatedUser.postCount.toNumber()).toEqual(1);
  })

  it('Like a post', async () => {
    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), authority.publicKey.toBuffer(), postAccount.toBuffer()],
      program.programId
    );
    console.log("likePda: ", likePda.toBase58());

    await program.methods
      .likePost()
      .accountsStrict({ 
        authority: authority.publicKey,
        post: postAccount,
        like: likePda,
        systemProgram: SystemProgram.programId
      })
      .signers([authority.payer])
      .rpc()

    const like = await program.account.like.fetch(likePda);
    console.log("like: ", like);
    // expect(like.authority.toString()).toEqual(authority.publicKey.toString());
    // expect(like.post.toString()).toEqual(postAccount.toString());

    const post = await program.account.post.fetch(postAccount);
    console.log("post: ", post);
    // expect(post.likes.toNumber()).toEqual(1);
  })

  it('Create a comment', async () => {
    const post = await program.account.post.fetch(postAccount);

    const [commentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("comment"), postAccount.toBuffer(), Buffer.from(post.commentCount.toArrayLike(Buffer, "le", 8))],
      program.programId
    )

    await program.methods
      .createComment("Great post!")
      .accountsStrict({ 
        authority: authority.publicKey,
        post: postAccount,
        comment: commentPda,
        systemProgram: SystemProgram.programId
      })
      .signers([authority.payer])
      .rpc();

    const comment = await program.account.comment.fetch(commentPda);
    console.log("comment: ", comment);
    // expect(comment.content).toEqual("Great post!");
    // expect(comment.commentId.toNumber()).toEqual(0);

    const updatedPost = await program.account.post.fetch(postAccount);
    console.log("updatedPost: ", updatedPost);
    // expect(updatedPost.commentCount.toNumber()).toEqual(1);
  })

  it('Create session', async () => {
    const [sessionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("session"), authority.publicKey.toBuffer(), sessionKeypair.publicKey.toBuffer()],
      program.programId
    );
    sessionAccount = sessionPda;
    console.log("sessionAccount: ", sessionAccount.toBase58());

    const expiredAt = Math.floor(Date.now() / 1000) + 3600;

    await program.methods
      .createSession(new anchor.BN(expiredAt))
      .accountsStrict({ 
        authority: authority.publicKey,
        session: sessionAccount,
        sessionKeypair: sessionKeypair.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([authority.payer])
      .rpc()

    const session = await program.account.session.fetch(sessionAccount);
    console.log("session: ", session);
    // expect(session.authority.toString()).toEqual(authority.publicKey.toString());
    // expect(session.sessionKey.toString()).toEqual(sessionKeypair.publicKey.toString());
    // expect(session.isActive).toBeTruthy;
  })

  it("Fund session", async () => {
    const amount = 1000000; // 0.001 SOL in lamports

    await program.methods
      .fundSession(new anchor.BN(amount))
      .accountsStrict({
        authority: authority.publicKey,
        sessionKeypair: sessionKeypair.publicKey,
        session: sessionAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Verify session keypair received funds
    const balance = await provider.connection.getBalance(sessionKeypair.publicKey);
    console.log("balace: ", balance);
    // expect(balance).toBeGreaterThan(0);
  });

  it("Refund session", async () => {
    const initialBalance = await provider.connection.getBalance(authority.publicKey);

    await program.methods
      .refundSession()
      .accountsStrict({
        authority: authority.publicKey,
        sessionKeypair: sessionKeypair.publicKey,
        session: sessionAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Verify session is no longer active
    const session = await program.account.session.fetch(sessionAccount);
    console.log("session: ", session);
    // expect(session.isActive).toBeFalsy;

    // Verify funds were refunded (approximately)
    const finalBalance = await provider.connection.getBalance(authority.publicKey);
    console.log("finalBalance: ", finalBalance);
    // expect(finalBalance).toBeGreaterThan(initialBalance);
  });

})
