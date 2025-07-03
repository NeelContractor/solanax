'use client'

import { getSocialProgram, getSocialProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from 'bn.js'

interface InitializeUserArgs {
  username: string, 
  bio: string, 
  picture: string, 
  authority: PublicKey
}

interface InitializeSessionArgs {
  authority: PublicKey
  // Return sessionKeypair so frontend can store it
  onSessionCreated?: (sessionKeypair: Keypair) => void
}

interface PostArgs {
  content: string,
  authority: PublicKey
  sessionKeypair: Keypair,
}

interface LikeArgs {
  postCount: number,
  authority: PublicKey,
  postAuthority: PublicKey, // Authority who created the post
  sessionKeypair: Keypair,
}

interface CommentArgs {
  content: string, 
  authority: PublicKey, 
  postAuthority: PublicKey, 
  postCount: number
  sessionKeypair: Keypair,
}

interface FundSessionArgs {
  authority: PublicKey, 
  amount: number, 
  sessionKeypair: PublicKey
}

interface RefundSessionArgs {
  authority: PublicKey, 
  sessionKeypair: PublicKey
}

// Helper functions for localStorage operations
const getStorageKey = (authority: PublicKey, cluster: string) => 
  `social-session-${authority.toString()}-${cluster}`

const saveSessionKeypair = (authority: PublicKey, cluster: string, keypair: Keypair) => {
  try {
    const key = getStorageKey(authority, cluster)
    const secretKey = Array.from(keypair.secretKey)
    localStorage.setItem(key, JSON.stringify(secretKey))
  } catch (error) {
    console.error('Failed to save session keypair:', error)
  }
}

const loadSessionKeypair = (authority: PublicKey, cluster: string): Keypair | null => {
  try {
    const key = getStorageKey(authority, cluster)
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    const secretKey = JSON.parse(stored)
    return Keypair.fromSecretKey(new Uint8Array(secretKey))
  } catch (error) {
    console.error('Failed to load session keypair:', error)
    return null
  }
}

const removeSessionKeypair = (authority: PublicKey, cluster: string) => {
  try {
    const key = getStorageKey(authority, cluster)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to remove session keypair:', error)
  }
}

export function useSocialProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getSocialProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getSocialProgram(provider, programId), [provider, programId])
  // console.log(program.programId.toBase58());

  // State to store session keypair
  const [sessionKeypair, setSessionKeypair] = useState<Keypair | null>(null)
  // Helper function to get session keypair for a specific authority
  const getSessionKeypair = (authority: PublicKey): Keypair | null => {
    return loadSessionKeypair(authority, cluster.name)
  }

  // Helper function to check if session is still valid
  const isSessionValid = async (authority: PublicKey): Promise<boolean> => {
    try {
      const keypair = getSessionKeypair(authority)
      if (!keypair) return false

      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer(), keypair.publicKey.toBuffer()],
        program.programId
      )

      const session = await program.account.session.fetchNullable(sessionPda)
      if (!session) return false

      const currentTime = Math.floor(Date.now() / 1000)
      return session.isActive && currentTime < session.expiredAt.toNumber()
    } catch (error) {
      console.error('Failed to check session validity:', error)
      return false
    }
  }

  const userAccounts = useQuery({
    queryKey: ['userAccount', 'all', { cluster }],
    queryFn: () => program.account.userAccount.all(),
  })

  const sessionAccounts = useQuery({
    queryKey: ['sessionAccounts', 'all', { cluster }],
    queryFn: () => program.account.session.all(),
  })

  const postAccounts = useQuery({
    queryKey: ['postAccount', 'all', { cluster }],
    queryFn: () => program.account.post.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initializeUser = useMutation<string, Error, InitializeUserArgs>({
    mutationKey: ['user', 'initialize', { cluster }],
    mutationFn: ({ username, bio, picture, authority }) => {

      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), authority.toBuffer()],
        program.programId
      )

      return program.methods
        .initializeUser(username, bio, picture)
        .accountsStrict({ 
          authority: authority,
          userAccount: userPda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await userAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize user account')
    },
  })

  const initializeSession = useMutation<string, Error, InitializeSessionArgs>({
    mutationKey: ['session', 'initialize', { cluster }],
    mutationFn: ({ authority, onSessionCreated }) => {

      const expiredAt = Math.floor(Date.now() / 1000) + 3600;
      const sessionKeypair = Keypair.generate();

      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer(), sessionKeypair.publicKey.toBuffer()],
        program.programId
      )

      // Save the session keypair to localStorage
      saveSessionKeypair(authority, cluster.name, sessionKeypair)
      setSessionKeypair(sessionKeypair)

      if (onSessionCreated) {
        onSessionCreated(sessionKeypair);
      }

      return program.methods
        .createSession(new BN(expiredAt))
        .accountsStrict({ 
          authority: authority,
          sessionKeypair: sessionKeypair.publicKey,
          session: sessionPda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await sessionAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize user session')
    },
  })

  const post = useMutation<string, Error, PostArgs>({
    mutationKey: ['post', 'create', { cluster }],
    mutationFn: async ({ content, authority }) => {
      // Load session keypair from localStorage
      const sessionKeypair = getSessionKeypair(authority)
      if (!sessionKeypair) {
        throw new Error('No active session found. Please create a session first.')
      }

      // Check if session is still valid
      if (!(await isSessionValid(authority))) {
        removeSessionKeypair(authority, cluster.name)
        throw new Error('Session has expired. Please create a new session.')
      }

      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), authority.toBuffer()],
        program.programId
      )
      const user = await program.account.userAccount.fetch(userPda);

      const [postPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("post"), authority.toBuffer(), Buffer.from(user.postCount.toArrayLike(Buffer, 'le', 8))],
        program.programId
      );

      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer(), sessionKeypair.publicKey.toBuffer()],
        program.programId
      )

      return program.methods
        .createPost(content)
        .accountsStrict({ 
          // authority: authority,
          sessionKeypair: sessionKeypair.publicKey,
          session: sessionPda,
          post: postPda,
          userAccount: userPda,
          systemProgram: SystemProgram.programId
        })
        .signers([sessionKeypair])
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await postAccounts.refetch()
      await userAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to create post')
    },
  })

  const like = useMutation<string, Error, LikeArgs>({
    mutationKey: ['like', 'create', { cluster }],
    mutationFn: async ({ authority, postCount, postAuthority }) => {
      // Load session keypair from localStorage
      const sessionKeypair = getSessionKeypair(authority)
      if (!sessionKeypair) {
        throw new Error('No active session found. Please create a session first.')
      }

      // Check if session is still valid
      if (!(await isSessionValid(authority))) {
        removeSessionKeypair(authority, cluster.name)
        throw new Error('Session has expired. Please create a new session.')
      }

      const [postPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("post"), postAuthority.toBuffer(), Buffer.from(new BN(postCount).toArrayLike(Buffer, 'le', 8))],
        program.programId
      );

      const [likePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), authority.toBuffer(), postPda.toBuffer()],
        program.programId
      );

      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer(), sessionKeypair.publicKey.toBuffer()],
        program.programId
      )

      return program.methods
        .likePost()
        .accountsStrict({ 
          // authority: authority,
          sessionKeypair: sessionKeypair.publicKey,
          session: sessionPda,
          post: postPda,
          like: likePda,
          systemProgram: SystemProgram.programId
        })
        .signers([sessionKeypair])
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await postAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to like post')
    },
  })

  const comment = useMutation<string, Error, CommentArgs>({
    mutationKey: ['comment', 'create', { cluster }],
    mutationFn: async ({ content, authority, postAuthority, postCount }) => {
      // Load session keypair from localStorage
      const sessionKeypair = getSessionKeypair(authority)
      if (!sessionKeypair) {
        throw new Error('No active session found. Please create a session first.')
      }

      // Check if session is still valid
      if (!(await isSessionValid(authority))) {
        removeSessionKeypair(authority, cluster.name)
        throw new Error('Session has expired. Please create a new session.')
      }

      const [postPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("post"), postAuthority.toBuffer(), Buffer.from(new BN(postCount).toArrayLike(Buffer, 'le', 8))],
        program.programId
      );

      const post = await program.account.post.fetch(postPda);

      const [commentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("comment"), postPda.toBuffer(), Buffer.from(post.commentCount.toArrayLike(Buffer, "le", 8))],
        program.programId
      )

      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer(), sessionKeypair.publicKey.toBuffer()],
        program.programId
      )

      return program.methods
        .createComment(content)
        .accountsStrict({ 
          // authority: authority,
          sessionKeypair: sessionKeypair.publicKey,
          session: sessionPda,
          post: postPda,
          comment: commentPda,
          systemProgram: SystemProgram.programId
        })
        .signers([sessionKeypair])
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await postAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to comment post')
    },
  })

  const fundSession = useMutation<string, Error, FundSessionArgs>({
    mutationKey: ['fund', 'session', { cluster }],
    mutationFn: async ({ amount, authority, sessionKeypair }) => {
      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer(), sessionKeypair.toBuffer()],
        program.programId
      );

      return program.methods
        .fundSession(new BN(amount))
        .accountsStrict({ 
          authority: authority,
          sessionKeypair: sessionKeypair,
          session: sessionPda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await sessionAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to fund session')
    },
  })

  const refundSession = useMutation<string, Error, RefundSessionArgs>({
    mutationKey: ['fund', 'session', { cluster }],
    mutationFn: async ({ authority, sessionKeypair }) => {
      const [sessionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("session"), authority.toBuffer(), sessionKeypair.toBuffer()],
        program.programId
      );

      return program.methods
        .refundSession()
        .accountsStrict({ 
          authority: authority,
          sessionKeypair: sessionKeypair,
          session: sessionPda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await sessionAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to refund session')
    },
  })

  return {
    program,
    programId,
    userAccounts,
    sessionAccounts,
    postAccounts,
    getProgramAccount,
    initializeUser,
    initializeSession,
    post,
    like,
    comment,
    fundSession,
    refundSession,
    sessionKeypair
  }
}

export function useSocialProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  // const transactionToast = useTransactionToast()
  const { program } = useSocialProgram()

  const accountQuery = useQuery({
    queryKey: ['get-program-account', { cluster, account }],
    queryFn: () => program.account.userAccount.fetchNullable(account),
  })

  const postAccounts = useQuery({
    queryKey: ['postAccount', 'all', { cluster, account }],
    queryFn: () => program.account.post.fetch(account),
  })

  return {
    accountQuery,
    postAccounts
  }
}
