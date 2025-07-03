// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import SocialxIDL from '../target/idl/socialx.json'
import type { Socialx } from '../target/types/socialx'

// Re-export the generated IDL and type
export { Socialx, SocialxIDL }

// The programId is imported from the program IDL.
export const SOCIAL_PROGRAM_ID = new PublicKey(SocialxIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getSocialProgram(provider: AnchorProvider, address?: PublicKey): Program<Socialx> {
  return new Program({ ...SocialxIDL, address: address ? address.toBase58() : SocialxIDL.address } as Socialx, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getSocialProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('FnoMb6aW5Nx4suGE1fTRoMEEBzfkcHdyNyo1CYjfLpEX')
    case 'mainnet-beta':
    default:
      return SOCIAL_PROGRAM_ID
  }
}
