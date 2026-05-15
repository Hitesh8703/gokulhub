"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snapshot = await getDocs(collection(db, "residents"));
      const data = snapshot.docs.map((d) => d.data());
      data.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      setResidents(data);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "#050505" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 20px" }} />
        <p style={{ color: "#777", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Leaderboard</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen" style={{ background: "#050505", padding: "40px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Rankings</p>
            <h1 className="display-font" style={{ fontSize: "2.6rem", color: "#f0ece4" }}>🏆 Leaderboard</h1>
          </div>
          <Link href="/dashboard" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px", color: "#888", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
            ← Dashboard
          </Link>
        </div>

        {/* Top 3 podium */}
        {residents.length >= 3 && (
          <div className="animate-fade-in-up stagger-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[residents[1], residents[0], residents[2]].map((resident, i) => {
              const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
              return (
                <div key={resident.apartmentNumber} style={{
                  background: rank === 1 ? "linear-gradient(145deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))" : "rgba(255,255,255,0.03)",
                  border: rank === 1 ? "1px solid var(--border-hover)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16, padding: "20px 12px", textAlign: "center",
                  alignSelf: rank === 1 ? "flex-end" : "flex-end",
                  marginBottom: rank === 1 ? 0 : 12,
                }}>
                  <div style={{ fontSize: rank === 1 ? 32 : 24, marginBottom: 8 }}>{MEDALS[rank - 1]}</div>
                  <p style={{ fontWeight: 700, color: rank === 1 ? "var(--gold-light)" : "#f0ece4", fontSize: "1rem" }}>
                    Apt {resident.apartmentNumber}
                  </p>
                  <p style={{ color: rank === 1 ? "var(--gold)" : "#555", fontSize: "0.85rem", fontWeight: 700, marginTop: 4 }}>
                    {resident.xp || 0} XP
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {residents.map((resident, index) => (
            <div key={index} className={`premium-card animate-fade-in-up stagger-${Math.min(index + 2, 8)}`}
              style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ minWidth: 32, textAlign: "center" }}>
                {index < 3 ? (
                  <span style={{ fontSize: 20 }}>{MEDALS[index]}</span>
                ) : (
                  <span style={{ color: "#555", fontWeight: 700, fontSize: "0.9rem" }}>#{index + 1}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: "#f0ece4", marginBottom: 2 }}>Apartment {resident.apartmentNumber}</p>
                <p style={{ color: "#666", fontSize: "0.82rem" }}>Streak: {resident.streak || 0} days · Level {resident.level || 1}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: 700, color: index === 0 ? "var(--gold)" : "#ccc", fontSize: "1.2rem" }}>{resident.xp || 0}</p>
                <p style={{ color: "#555", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>XP</p>
              </div>
              {/* XP mini bar */}
              <div style={{ width: 60 }}>
                <div style={{ background: "#1e1e1e", borderRadius: 999, height: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 999,
                    background: "linear-gradient(90deg, var(--gold-dim), var(--gold))",
                    width: `${Math.min(((resident.xp || 0) / Math.max(residents[0]?.xp || 1, 1)) * 100, 100)}%`,
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
