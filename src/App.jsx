import React, { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplAgentIdentity, registerIdentityV1 } from '@metaplex-foundation/mpl-agent-registry';
import { publicKey } from '@metaplex-foundation/umi';

// --- (既存の MAP, BLDGS, INIT_ASSETS, AGENTS_DEF, RES_POOL 等の定数はここにそのまま配置) ---
const RES_POOL = [
  { id: "r01", jp: "ハナ", role: "Citizen", color: "#88aaff" },
  { id: "r02", jp: "ケン", role: "Worker", color: "#ffaa88" },
  // ... 他の定数も同様に配置
];

const mkAgent = (def, sx, sy) => ({
  ...def, x: sx, y: sy, tx: null, ty: null, timer: 0,
  wallet: { neon: 400 + Math.random() * 400, data: 20, items: [] },
  needs: { greed: 50, knowledge: 50, social: 50, energy: 80, ambition: 60 },
  thinkLog: [], lastTx: ""
});

export default function GameApp() {
  // ─── ウォレットとUmiの初期化 ───
  const wallet = useWallet();
  const umi = useMemo(() => {
    const u = createUmi('https://api.devnet.solana.com');
    if (wallet.connected) u.use(walletAdapterIdentity(wallet));
    return u.use(mplAgentIdentity());
  }, [wallet]);

  // ─── State群 ───
  const [tp, setTp] = useState(1000);
  const [, setResi] = useState(RES_POOL.slice(0, 4).map((r, i) => mkAgent(r, 4 + i * 3, 11)));
  const [recruited, setRecruited] = useState([]);
  const [showRecruit, setShowRecruit] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  // ... (他の既存State: day, paused, transactions, x402, econVol 等はそのまま維持) ...

  // ─── Agent Registryへの登録ロジックを組み込んだRecruit ───
  const doRecruit = async (r) => {
    if (recruited.find(x => x.id === r.id)) return;
    if (tp < 300) {
      alert("NEON不足です。");
      return;
    }
    if (!wallet.connected) {
      alert("オンチェーン登録を行うには、画面上部からウォレットを接続してください。");
      return;
    }

    try {
      setIsRegistering(true);

      // ※注意: 実運用ではダミーではなく、事前にミントしたNFT(Asset)のPubkeyを指定します
      // ここではDevnetテスト用に、仮の適当なパブリックキーか、あなたが保持しているAssetアドレスを設定します
      const dummyAssetPubkey = publicKey('11111111111111111111111111111111');
      const dummyCollectionPubkey = publicKey('11111111111111111111111111111111');

      console.log(`[Umi] ${r.jp}のAgent Registry登録トランザクションを送信中...`);

      const tx = await registerIdentityV1(umi, {
        asset: dummyAssetPubkey,
        collection: dummyCollectionPubkey,
        agentRegistrationUri: `https://example.com/agent-metadata/${r.id}.json`, // エージェントのプロンプト等のJSON
      }).sendAndConfirm(umi);

      console.log(`[Umi] トランザクション成功！ Signature:`, tx.signature);

      // オンチェーン登録成功後、フロントエンドの状態を更新
      setTp(p => p - 300);
      setRecruited(p => [...p, r]);
      setResi(p => [...p, mkAgent(r, 3 + Math.floor(Math.random() * 14), 7)]);

    } catch (error) {
      console.error("Agent登録失敗:", error);
      alert("トランザクションが拒否されたか、エラーが発生しました。");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#060a12", color: "#e0e8ff", fontFamily: "monospace" }}>
      {/* ── Top Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderBottom: "1px solid #1a2440" }}>
        <span style={{ color: "#00ffcc", fontWeight: "bold" }}>⚡NMC</span>
        <span style={{ color: "#00ffcc" }}>💰{tp.toFixed(0)} NEON</span>
        <button onClick={() => setShowRecruit(true)} style={{ background: "#00ffcc11", color: "#00ffcc", padding: "4px 8px", border: "1px solid #00ffcc33", cursor: "pointer" }}>+RECRUIT</button>

        {/* ウォレット接続ボタンを配置 */}
        <div style={{ marginLeft: "auto" }}>
          <WalletMultiButton style={{ backgroundColor: "#1a2440", height: "32px", fontSize: "12px" }} />
        </div>
      </div>

      {/* ── Recruit Modal ── */}
      {showRecruit && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowRecruit(false); }} style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", background: "#000000bb" }}>
          <div style={{ width: "400px", background: "#0a0e1a", border: "1px solid #00ffcc33", borderRadius: "10px", padding: "15px" }}>
            <h3 style={{ color: "#00ffcc", marginTop: 0 }}>🎮 RECRUIT (300 NEON)</h3>
            <p style={{ fontSize: "10px", color: "#888" }}>※採用時にSolana DevnetへAgent Registryとして登録されます。</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {RES_POOL.map(r => {
                const done = !!recruited.find(x => x.id === r.id);
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#060a12", border: `1px solid ${r.color}22` }}>
                    <span style={{ color: r.color }}>{r.jp} ({r.role})</span>
                    <button
                      onClick={() => doRecruit(r)}
                      disabled={done || isRegistering}
                      style={{ background: done ? "#1a2440" : "#00ffcc1a", color: done ? "#445" : "#00ffcc", cursor: (done || isRegistering) ? "default" : "pointer" }}>
                      {done ? "✅ IN" : isRegistering ? "通信中..." : "RECRUIT"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ... (マップやその他のUIはそのまま配置) ... */}
      <div style={{ padding: "20px" }}>ゲーム画面本体（省略部を展開してください）</div>
    </div>
  );
}