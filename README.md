# Insight

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)
![Status](https://img.shields.io/badge/status-active-success)

**Insight** is a cutting-edge oracle monitoring and dispute resolution interface. It empowers users to visualize oracle data in real-time, participate in dispute resolutions, and interact seamlessly with the protocol.

## 🚀 Features

- **Real-time Monitoring**: Visualize oracle data trends, volume, and sync status with interactive charts.
- **Dispute Resolution**: Browse, vote on, and settle disputes transparently.
- **Assertion Management**: Create and track assertions directly from the UI.
- **Wallet Integration**: Seamless connection with Web3 wallets via `viem`.
- **Multi-Chain Support**: Ready for Polygon, Arbitrum, Optimism, and Local testnets.
- **Internationalization**: Built-in support for multiple languages.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI
- **Backend**: Next.js Serverless Functions, PostgreSQL
- **Testing**: Vitest, React Testing Library, Hardhat
- **DevOps**: Docker, GitHub Actions, Husky

## 📦 Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- Docker (optional, for local DB)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-org/insight.git
    cd insight
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Set up environment variables**

    Copy `.env.example` to `.env.local` and fill in the required values.

    ```bash
    cp .env.example .env.local
    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🧪 Running Tests

- **Unit & Integration Tests**: `npm test`
- **Contract Tests**: `npm run contracts:test`

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
