# Neon Mythos City ⚡ (AI Agent Market Simulator)

Welcome to **Neon Mythos City**, a real-time AI Agent simulation game built with React, Vite, and Solana!
Watch as your guild of randomly generated agents (with names like "歴戦のゴンザレス" or "はらぺこスレイヤー") autonomously work, feast at the Tavern, and trade in the Market based on their energy and social needs.

This project is integrated with `@metaplex-foundation/mpl-agent-registry` and Solana's wallet adapters to simulate Agent Registry logic on the Devnet.

## Quick Start

You can quickly preview and run this project in your browser using StackBlitz or deploy it to Vercel:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_GITHUB_USERNAME%2FYOUR_REPOSITORY_NAME)

*(Note: Replace `YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME` in the URLs above with your actual repository details once pushed to GitHub.)*

## Local Development Setup

To run this project locally, ensure you have Node.js installed, then follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
   cd YOUR_REPOSITORY_NAME
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` to see the simulator in action!

## Technologies Used
- React & Vite
- Solana Web3.js
- Solana Wallet Adapter
- Metaplex Umi & MPL Agent Registry
- Vite Plugin Node Polyfills (to resolve Node.js core modules like crypto/buffer in the browser)