import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplAgentIdentity, registerIdentityV1 } from '@metaplex-foundation/mpl-agent-registry';
import { publicKey } from '@metaplex-foundation/umi';

const MAP_W = 20;
const MAP_H = 15;

const BLDGS = {
  GUILD: { x: 8, y: 3, w: 6, h: 4, name: "AI Guild", color: "#4488ff", emoji: "⚔️" },
  TAVERN: { x: 2, y: 9, w: 5, h: 4, name: "Tavern", color: "#ff8844", emoji: "🍻" },
  MARKET: { x: 14, y: 10, w: 4, h: 4, name: "Market", color: "#44ff88", emoji: "💰" }
};

const ADJECTIVES = ["歴戦の", "はらぺこ", "方向音痴の", "狂暴な", "無双の", "寝起きの", "伝説の", "見習い", "さすらいの", "剛腕の", "ドジっ子", "疾風の", "閃光の", "鉄壁の"];
const NAMES = ["ハンター", "ゴンザレス", "勇者", "太郎", "ジョン", "スレイヤー", "ポチ", "剣士", "魔法使い", "ランサー", "盗賊", "アーチャー", "バーサーカー", "村人A", "ドラゴン", "ゴブリンキラー"];
const ROLES = ["Fighter", "Mage", "Healer", "Hunter", "Knight", "Thief", "Merchant", "Mascot"];
const COLORS = ["#ff4444", "#ffff44", "#4444ff", "#ff44ff", "#44ffff", "#88ffcc", "#ffaa44", "#aa44ff"];

const generateRandomAgentDef = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const role = ROLES[Math.floor(Math.random() * ROLES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const id = `r${Math.floor(Math.random() * 1000000)}`;

  return { id, jp: `${adj}${name}`, role, color };
};

const mkAgent = (def, sx, sy) => ({
  ...def, x: sx, y: sy, tx: sx, ty: sy, timer: 0,
  action: "IDLE",
  wallet: { neon: 400 + Math.random() * 400 },
  needs: { energy: 80 + Math.random() * 20, social: 80 + Math.random() * 20 },
});

export default function GameApp() {
  const wallet = useWallet();
  const umi = useMemo(() => {
    const u = createUmi('https://api.devnet.solana.com');
    if (wallet.connected) u.use(walletAdapterIdentity(wallet));
    return u.use(mplAgentIdentity());
  }, [wallet]);

  const initialRecruits = useMemo(() => Array(3).fill(null).map(generateRandomAgentDef), []);
  const initialPool = useMemo(() => Array(5).fill(null).map(generateRandomAgentDef), []);

  const [tp, setTp] = useState(1000);
  const [resi, setResi] = useState(initialRecruits.map((r, i) => mkAgent(r, 4 + i * 3, 11)));
  const [recruited, setRecruited] = useState(initialRecruits);
  const [recruitPool, setRecruitPool] = useState(initialPool);
  const [showRecruit, setShowRecruit] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const refreshRecruits = () => {
    setRecruitPool(Array(5).fill(null).map(generateRandomAgentDef));
  };

  // ─── Game Loop ───
  useEffect(() => {
    const tick = setInterval(() => {
      setResi(prevResi => prevResi.map(agent => {
        let { x, y, tx, ty, action, needs, wallet } = agent;

        needs.energy -= 1;
        needs.social -= 0.5;

        if (action === "IDLE") {
          if (needs.energy < 40 || needs.social < 40) {
            action = "FEASTING";
            tx = BLDGS.TAVERN.x + Math.floor(Math.random() * BLDGS.TAVERN.w);
            ty = BLDGS.TAVERN.y + Math.floor(Math.random() * BLDGS.TAVERN.h);
          } else if (wallet.neon < 300 || Math.random() < 0.3) {
            action = "WORKING";
            tx = BLDGS.GUILD.x + Math.floor(Math.random() * BLDGS.GUILD.w);
            ty = BLDGS.GUILD.y + Math.floor(Math.random() * BLDGS.GUILD.h);
          } else if (Math.random() < 0.4) {
            action = "TRADING";
            tx = BLDGS.MARKET.x + Math.floor(Math.random() * BLDGS.MARKET.w);
            ty = BLDGS.MARKET.y + Math.floor(Math.random() * BLDGS.MARKET.h);
          } else {
            tx = Math.floor(Math.random() * MAP_W);
            ty = Math.floor(Math.random() * MAP_H);
          }
        }

        if (x < tx) x++;
        else if (x > tx) x--;

        if (y < ty) y++;
        else if (y > ty) y--;

        if (x === tx && y === ty) {
          if (action === "FEASTING") {
            needs.energy += 15;
            needs.social += 15;
            wallet.neon -= 2;
            if (needs.energy >= 90 && needs.social >= 90) action = "IDLE";
          } else if (action === "WORKING") {
            needs.energy -= 2;
            wallet.neon += 10;
            if (needs.energy < 30 || Math.random() < 0.1) action = "IDLE";
          } else if (action === "TRADING") {
            needs.social += 2;
            wallet.neon += (Math.random() > 0.5 ? 5 : -5);
            if (Math.random() < 0.2) action = "IDLE";
          } else {
            action = "IDLE";
          }
        }

        needs.energy = Math.max(0, Math.min(100, needs.energy));
        needs.social = Math.max(0, Math.min(100, needs.social));

        return { ...agent, x, y, tx, ty, action, needs, wallet };
      }));
    }, 500);

    return () => clearInterval(tick);
  }, []);

  const doRecruit = async (r) => {
    if (recruited.find(x => x.id === r.id)) return;
    if (tp < 300) {
      alert("NEON不足です。");
      return;
    }
    if (!wallet.connected) {
      alert("オンチェーン登録を行うには、画面上部からウォレットを接続してください。");
      // UIデバッグ用にウォレット未接続でも通す場合は以下のreturnを外す
      // return;
    }

    try {
      setIsRegistering(true);

      if (wallet.connected) {
        const dummyAssetPubkey = publicKey('11111111111111111111111111111111');
        const dummyCollectionPubkey = publicKey('11111111111111111111111111111111');
        console.log(`[Umi] ${r.jp}のAgent Registry登録トランザクションを送信中...`);
        const tx = await registerIdentityV1(umi, {
          asset: dummyAssetPubkey,
          collection: dummyCollectionPubkey,
          agentRegistrationUri: `https://example.com/agent-metadata/${r.id}.json`,
        }).sendAndConfirm(umi);
        console.log(`[Umi] トランザクション成功！ Signature:`, tx.signature);
      }

      setTp(p => p - 300);
      setRecruited(p => [...p, r]);
      setResi(p => [...p, mkAgent(r, 10, 14)]);

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

        <div style={{ marginLeft: "auto" }}>
          <WalletMultiButton style={{ backgroundColor: "#1a2440", height: "32px", fontSize: "12px" }} />
        </div>
      </div>

      {/* ── Recruit Modal ── */}
      {showRecruit && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowRecruit(false); }} style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", background: "#000000bb" }}>
          <div style={{ width: "400px", background: "#0a0e1a", border: "1px solid #00ffcc33", borderRadius: "10px", padding: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#00ffcc", margin: 0 }}>🎮 RECRUIT (300 NEON)</h3>
              <button onClick={() => setShowRecruit(false)} style={{ background: "transparent", color: "#888", border: "none", cursor: "pointer", fontSize: "16px" }}>✖</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "10px", color: "#888", margin: 0 }}>※採用時にSolana DevnetへAgent Registryとして登録されます。</p>
              <button onClick={refreshRecruits} style={{ background: "#1a2440", color: "#00ffcc", padding: "2px 6px", border: "1px solid #00ffcc33", cursor: "pointer", fontSize: "10px", borderRadius: "4px" }}>🔄 REFRESH</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recruitPool.map(r => {
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

      {/* ── Main Game Area ── */}
      <div style={{ display: "flex", flex: 1, padding: "20px", gap: "20px", overflow: "hidden" }}>

        {/* Map View */}
        <div style={{
          position: "relative",
          width: `${MAP_W * 40}px`,
          height: `${MAP_H * 40}px`,
          background: "#111827",
          border: "2px solid #1a2440",
          backgroundImage: "radial-gradient(#1a2440 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}>
          {Object.values(BLDGS).map(b => (
            <div key={b.name} style={{
              position: "absolute",
              left: `${b.x * 40}px`,
              top: `${b.y * 40}px`,
              width: `${b.w * 40}px`,
              height: `${b.h * 40}px`,
              backgroundColor: b.color + "22",
              border: `2px dashed ${b.color}88`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column"
            }}>
              <span style={{ fontSize: "24px" }}>{b.emoji}</span>
              <span style={{ fontSize: "12px", color: b.color, fontWeight: "bold", textShadow: "0 0 5px #000" }}>{b.name}</span>
            </div>
          ))}

          {resi.map(agent => (
            <div key={agent.id} style={{
              position: "absolute",
              left: `${agent.x * 40}px`,
              top: `${agent.y * 40}px`,
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.5s linear",
              zIndex: 10
            }}>
              <div style={{
                width: "16px", height: "16px",
                backgroundColor: agent.color,
                borderRadius: "50%",
                boxShadow: `0 0 10px ${agent.color}`,
                border: "2px solid #fff"
              }} />
              <span style={{
                position: "absolute", top: "-20px",
                fontSize: "12px", color: "#fff",
                whiteSpace: "nowrap", background: "#0008",
                padding: "2px 6px", borderRadius: "4px"
              }}>
                {agent.jp}
              </span>
              <span style={{
                position: "absolute", bottom: "-10px", fontSize: "14px", textShadow: "0 0 2px #000"
              }}>
                {agent.action === "WORKING" ? "⚔️" : agent.action === "FEASTING" ? "🍻" : agent.action === "TRADING" ? "💰" : ""}
              </span>
            </div>
          ))}
        </div>

        {/* Status Panel */}
        <div style={{ flex: 1, background: "#0a0e1a", padding: "15px", border: "1px solid #1a2440", borderRadius: "8px", overflowY: "auto" }}>
          <h3 style={{ color: "#00ffcc", marginTop: 0, borderBottom: "1px solid #1a2440", paddingBottom: "10px" }}>👥 Guild Members Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            {resi.map(agent => {
              let actionEmoji = "💭";
              let actionColor = "#aaa";
              if (agent.action === "WORKING") { actionEmoji = "⚔️"; actionColor = "#4488ff"; }
              if (agent.action === "FEASTING") { actionEmoji = "🍻"; actionColor = "#ff8844"; }
              if (agent.action === "TRADING") { actionEmoji = "💰"; actionColor = "#44ff88"; }

              return (
                <div key={agent.id} style={{ background: "#111827", padding: "12px", borderRadius: "6px", borderLeft: `4px solid ${agent.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <strong style={{ color: agent.color, fontSize: "14px" }}>{agent.jp} ({agent.role})</strong>
                    <span style={{ color: actionColor, fontSize: "12px", fontWeight: "bold", background: actionColor+"22", padding: "2px 8px", borderRadius: "10px" }}>
                      {actionEmoji} {agent.action}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", display: "flex", justifyContent: "space-between", background: "#060a12", padding: "6px", borderRadius: "4px" }}>
                    <span>⚡ EP: {agent.needs.energy.toFixed(0)}</span>
                    <span>💬 SP: {agent.needs.social.toFixed(0)}</span>
                    <span style={{ color: "#00ffcc" }}>💰 {agent.wallet.neon.toFixed(0)} N</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}