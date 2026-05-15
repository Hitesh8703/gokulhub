"use client";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

const MEDALS = ["🥇", "🥈", "🥉"];

type Resident = {
  apartmentNumber: string;
  xp: number;
  streak?: number;
  level?: number;
  name?: string;
};

type FloorStat = {
  floor: string;
  totalXP: number;
  topResident: Resident;
  residentCount: number;
};

/** Derive floor from apartment number e.g. "304" → "3", "104" → "1", "001" → "G" */
function getFloor(apartmentNumber: string): string {
  const num = parseInt(apartmentNumber, 10);
  if (isNaN(num)) return "G";
  const floor = Math.floor(num / 100);
  if (floor === 0) return "G";
  return String(floor);
}

function floorLabel(floor: string): string {
  if (floor === "G") return "Ground Floor";
  const n = parseInt(floor, 10);
  if (n === 1) return "1st Floor";
  if (n === 2) return "2nd Floor";
  if (n === 3) return "3rd Floor";
  return `${n}th Floor`;
}

type Tab = "overall" | "floors";

export default function LeaderboardPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overall");

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "residents"));
      const data: Resident[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          apartmentNumber: raw.apartmentNumber || "",
          xp: raw.xp || 0,
          streak: raw.streak || 0,
          level: raw.level || 1,
          name: raw.name,
        };
      });
      data.sort((a, b) => b.xp - a.xp);
      setResidents(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  /** Build per-floor stats */
  const floorStats: FloorStat[] = useMemo(() => {
    const map = new Map<string, Resident[]>();
    for (const r of residents) {
      const floor = getFloor(r.apartmentNumber);
      if (!map.has(floor)) map.set(floor, []);
      map.get(floor)!.push(r);
    }
    const stats: FloorStat[] = [];
    map.forEach((floorResidents, floor) => {
      const totalXP = floorResidents.reduce((sum, r) => sum + r.xp, 0);
      const topResident = [...floorResidents].sort((a, b) => b.xp - a.xp)[0];
      stats.push({
        floor,
        totalXP,
        topResident,
        residentCount: floorResidents.length,
      });
    });
    stats.sort((a, b) => b.totalXP - a.totalXP);
    return stats;
  }, [residents]);

  const topFloor = floorStats[0] ?? null;
  const maxFloorXP = floorStats[0]?.totalXP || 1;
  const maxResidentXP = residents[0]?.xp || 1;

  if (loading)
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#050505" }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 20px" }} />
          <p
            style={{
              color: "#777",
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Loading Leaderboard
          </p>
        </div>
      </main>
    );

  return (
    <main
      className="min-h-screen"
      style={{ background: "#050505", padding: "40px 24px" }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div>
            <p
              style={{
                color: "var(--gold)",
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Rankings
            </p>
            <h1
              className="display-font"
              style={{ fontSize: "2.6rem", color: "#f0ece4" }}
            >
              🏆 Leaderboard
            </h1>
          </div>
          <Link
            href="/dashboard"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "10px 18px",
              color: "#888",
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.85rem",
            }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* Tab switcher */}
        <div
          className="animate-fade-in-up stagger-1"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 28,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: 5,
          }}
        >
          {(["overall", "floors"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.88rem",
                letterSpacing: "0.04em",
                transition: "all 0.25s",
                background:
                  activeTab === tab
                    ? "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))"
                    : "transparent",
                color: activeTab === tab ? "var(--gold-light)" : "#555",
                boxShadow:
                  activeTab === tab
                    ? "0 0 0 1px rgba(201,168,76,0.3)"
                    : "none",
              }}
            >
              {tab === "overall" ? "🏅 Overall" : "🏢 Floors"}
            </button>
          ))}
        </div>

        {/* ═══════════════ OVERALL TAB ═══════════════ */}
        {activeTab === "overall" && (
          <div>
            {/* Top 3 podium */}
            {residents.length >= 3 && (
              <div
                className="animate-fade-in-up stagger-1"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                  marginBottom: 32,
                }}
              >
                {[residents[1], residents[0], residents[2]].map(
                  (resident, i) => {
                    const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                    return (
                      <div
                        key={resident.apartmentNumber}
                        style={{
                          background:
                            rank === 1
                              ? "linear-gradient(145deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))"
                              : "rgba(255,255,255,0.03)",
                          border:
                            rank === 1
                              ? "1px solid var(--border-hover)"
                              : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 16,
                          padding: "20px 12px",
                          textAlign: "center",
                          marginBottom: rank === 1 ? 0 : 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: rank === 1 ? 32 : 24,
                            marginBottom: 8,
                          }}
                        >
                          {MEDALS[rank - 1]}
                        </div>
                        <p
                          style={{
                            fontWeight: 700,
                            color:
                              rank === 1 ? "var(--gold-light)" : "#f0ece4",
                            fontSize: "1rem",
                          }}
                        >
                          Apt {resident.apartmentNumber}
                        </p>
                        <p
                          style={{
                            color: rank === 1 ? "var(--gold)" : "#555",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            marginTop: 4,
                          }}
                        >
                          {resident.xp} XP
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {residents.map((resident, index) => (
                <div
                  key={index}
                  className={`premium-card animate-fade-in-up stagger-${Math.min(index + 2, 8)}`}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div style={{ minWidth: 32, textAlign: "center" }}>
                    {index < 3 ? (
                      <span style={{ fontSize: 20 }}>{MEDALS[index]}</span>
                    ) : (
                      <span
                        style={{
                          color: "#555",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                        }}
                      >
                        #{index + 1}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        color: "#f0ece4",
                        marginBottom: 2,
                      }}
                    >
                      Apartment {resident.apartmentNumber}
                    </p>
                    <p style={{ color: "#666", fontSize: "0.82rem" }}>
                      Streak: {resident.streak || 0} days · Level{" "}
                      {resident.level || 1}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontWeight: 700,
                        color: index === 0 ? "var(--gold)" : "#ccc",
                        fontSize: "1.2rem",
                      }}
                    >
                      {resident.xp}
                    </p>
                    <p
                      style={{
                        color: "#555",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      XP
                    </p>
                  </div>
                  {/* XP bar */}
                  <div style={{ width: 60 }}>
                    <div
                      style={{
                        background: "#1e1e1e",
                        borderRadius: 999,
                        height: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          background:
                            "linear-gradient(90deg, var(--gold-dim), var(--gold))",
                          width: `${Math.min((resident.xp / maxResidentXP) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ FLOORS TAB ═══════════════ */}
        {activeTab === "floors" && (
          <div>
            {/* ── Apartment Insight ── */}
            <div
              className="glass-card animate-fade-in-up stagger-1"
              style={{ padding: 24, marginBottom: 24 }}
            >
              <p
                style={{
                  color: "var(--gold)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                🏠 Apartment Insight
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 14,
                }}
              >
                {/* Highest Scoring Floor */}
                {topFloor && (
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))",
                      border: "1px solid var(--border-hover)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 22, marginBottom: 6 }}
                    >
                      👑
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      Top Floor
                    </div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "var(--gold-light)",
                      }}
                    >
                      {floorLabel(topFloor.floor)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--gold-dim)",
                        marginTop: 2,
                      }}
                    >
                      {topFloor.totalXP.toLocaleString()} XP
                    </div>
                  </div>
                )}

                {/* Top Resident Overall */}
                {residents[0] && (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>🥇</div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      Top Resident
                    </div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#f0ece4",
                      }}
                    >
                      Apt {residents[0].apartmentNumber}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#888",
                        marginTop: 2,
                      }}
                    >
                      {residents[0].xp.toLocaleString()} XP
                    </div>
                  </div>
                )}

                {/* Total Floors */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🏢</div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "#666",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    Active Floors
                  </div>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      color: "#f0ece4",
                      lineHeight: 1,
                    }}
                  >
                    {floorStats.length}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Floor Rankings ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {floorStats.map((floor, index) => (
                <div
                  key={floor.floor}
                  className={`premium-card animate-fade-in-up stagger-${Math.min(index + 2, 8)}`}
                  style={{ padding: "18px 20px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 12,
                    }}
                  >
                    {/* Rank */}
                    <div style={{ minWidth: 32, textAlign: "center" }}>
                      {index < 3 ? (
                        <span style={{ fontSize: 22 }}>{MEDALS[index]}</span>
                      ) : (
                        <span
                          style={{
                            color: "#555",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                          }}
                        >
                          #{index + 1}
                        </span>
                      )}
                    </div>

                    {/* Floor info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 2,
                        }}
                      >
                        <p
                          style={{
                            fontWeight: 700,
                            color: index === 0 ? "var(--gold-light)" : "#f0ece4",
                            fontSize: "1rem",
                          }}
                        >
                          {floorLabel(floor.floor)}
                        </p>
                        {index === 0 && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              background:
                                "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))",
                              border: "1px solid rgba(201,168,76,0.4)",
                              color: "var(--gold)",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            👑 Leading
                          </span>
                        )}
                      </div>
                      <p style={{ color: "#666", fontSize: "0.8rem" }}>
                        {floor.residentCount} apartments · Leader: Apt{" "}
                        {floor.topResident.apartmentNumber} (
                        {floor.topResident.xp.toLocaleString()} XP)
                      </p>
                    </div>

                    {/* XP */}
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          fontWeight: 700,
                          color: index === 0 ? "var(--gold)" : "#ccc",
                          fontSize: "1.3rem",
                        }}
                      >
                        {floor.totalXP.toLocaleString()}
                      </p>
                      <p
                        style={{
                          color: "#555",
                          fontSize: "0.72rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Total XP
                      </p>
                    </div>
                  </div>

                  {/* XP bar */}
                  <div
                    style={{
                      background: "#1a1a1a",
                      borderRadius: 999,
                      height: 5,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        background:
                          index === 0
                            ? "linear-gradient(90deg, var(--gold-dim), var(--gold-light))"
                            : "linear-gradient(90deg, #333, #555)",
                        width: `${Math.min((floor.totalXP / maxFloorXP) * 100, 100)}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
