// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import SocialIDL from '../target/idl/social.json'
import type { Social } from '../target/types/social'

// Re-export the generated IDL and type
export { Social, SocialIDL }

// The programId is imported from the program IDL.
export const SOCIAL_PROGRAM_ID = new PublicKey(SocialIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getSocialProgram(provider: AnchorProvider, address?: PublicKey): Program<Social> {
  return new Program({ ...SocialIDL, address: address ? address.toBase58() : SocialIDL.address } as Social, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getSocialProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('Cv45ivRCLup4BZmQhB95dC3Jc5xLPaPPxARhmQ15njVD')
    case 'mainnet-beta':
    default:
      return SOCIAL_PROGRAM_ID
  }
}
