# 🧬 SolanaX — A Social Media Platform on Solana

Solanax is a decentralized social media platform built on the Solana blockchain.  
It enables users to interact—like, post, comment—without signing a transaction every single time.

## 🌟 Features

- ✅ On-chain user profiles
- 🔐 Session keypairs to avoid wallet spam signing
- 🖼️ Post, like, and comment functionality
- 💸 Temporary funding for session accounts (refundable)
- ⚡️ Fast and cheap interaction via backend-relayed transactions
---

## 🛠️ How It Works

### 1. Create Profile
Users first initialize their profile on-chain by signing a transaction. This stores basic metadata and establishes identity.

### 2. Create a Session Keypair
A temporary keypair (session account) is generated for the user.  
This keypair can:

- Sign interactions (posts, likes, comments) off-chain
- Be authorized on-chain for a fixed duration
- Be funded with a small amount of SOL to cover relayed tx fees

### 3. Interact Freely
The session key signs all user actions. These signed messages are:

- Stored temporarily in a backend database
- Batched and submitted by a relayer to the Solana network

This pattern improves UX by avoiding wallet prompts for every interaction.

### 4. Refund Session Funds
Users can reclaim the SOL from their session accounts if unused or expired.

---

## 🧪 Tech Stack

- **Frontend**: Next.js + Tailwind + Wallet Adapter
- **Blockchain**: Solana + Anchor framework
- **Session Relayer**: Signs and batches user actions

---

## 🚀 Getting Started

### Prerequisites

- Node.js or Bun
- Solana CLI
- Anchor CLI
- Phantom or Backpack Wallet

### Install Dependencies

```bash
    git clone https://github.com/NeelContractor/solanax
    cd solanax
    npm install     # or bun install
```
