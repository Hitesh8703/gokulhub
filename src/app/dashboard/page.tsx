"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, updatePassword, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { checkAccolades } from "@/lib/accolades";

const NAV_ITEMS = [
  { href: "/chat",         icon: "💬", label: "Global Chat",       color: "#2563eb" },
  { href: "/leaderboard",  icon: "🏆", label: "Leaderboard",       color: "#c9a84c" },
  { href: "/accolades",    icon: "🏅", label: "Accolades",         color: "#9333ea" },
  { href: "/notifications",icon: "🔔", label: "Notifications",     color: "#0891b2" },
  { href: "/complaints",   icon: "🚨", label: "Raise Complaint",   color: "#ea580c" },
  { href: "/my-complaints",icon: "📋", label: "My Complaints",     color: "#dc2626" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [residentData, setResidentData] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [garbageLoading, setGarbageLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      try {
        const residentRef = doc(db, "residents", user.uid);
        const residentSnap = await getDoc(residentRef);
        if (residentSnap.exists()) {
          const residentInfo = residentSnap.data();
          setResidentData(residentInfo);
          const q = query(collection(db, "complaints"), where("againstApartment", "==", residentInfo.apartmentNumber));
          const snap = await getDocs(q);
          setComplaints(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
<<<<<<< HEAD
      } catch (error) { console.log(error); }
=======
      } catch (error) { console.error(error); }
>>>>>>> 43986f6 (Premium UI final working build)
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  async function handleGarbageMission() {
    const user = auth.currentUser;
    if (!user || !residentData) return;
    const today = new Date().toDateString();
    if (residentData.lastGarbageDate === today) { alert("Already completed garbage mission today! ✅"); return; }
    setGarbageLoading(true);
    const updatedXP = (residentData.xp || 0) + 50;
    const updatedStreak = (residentData.streak || 0) + 1;
    const updatedGarbageCount = (residentData.garbageCount || 0) + 1;
    const updatedLevel = Math.floor(updatedXP / 200) + 1;
    const updatedData = { ...residentData, xp: updatedXP, streak: updatedStreak, garbageCount: updatedGarbageCount, level: updatedLevel, lastGarbageDate: today };
    const residentRef = doc(db, "residents", user.uid);
    await updateDoc(residentRef, updatedData);
    if (updatedLevel > (residentData.level || 1)) {
      await addDoc(collection(db, "notifications"), { type: "private", targetApartment: residentData.apartmentNumber, title: "🎉 Level Up!", description: `You reached Level ${updatedLevel}!`, createdAt: serverTimestamp() });
    }
    setResidentData(updatedData);
    await checkAccolades(user.uid, updatedData);
    setGarbageLoading(false);
    alert("🗑 Garbage disposed! +50 XP earned");
  }

  async function handlePasswordChange() {
    if (!auth.currentUser) return;
    if (newPassword.length < 6) { alert("Password must be at least 6 characters"); return; }
    try {
      await updatePassword(auth.currentUser, newPassword);
      setPwSuccess(true);
      setNewPassword("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (error: any) { alert(error.message); }
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("apartment");
    router.push("/login");
  }

  const xpForNextLevel = ((residentData?.level || 1)) * 200;
  const xpProgress = Math.min(((residentData?.xp || 0) % 200) / 200 * 100, 100);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#050505" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 20px" }} />
          <p style={{ color: "#777", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.85rem" }}>Loading Dashboard</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: "radial-gradient(ellipse at 50% -10%, rgba(201,168,76,0.06) 0%, #050505 50%)",
        backgroundImage: "radial-gradient(ellipse at 50% -10%, rgba(201,168,76,0.06) 0%, #050505 50%), linear-gradient(rgba(0,0,0,0.88), rgba(0,0,0,0.88)), url('/gokul-residency.jpeg')",
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
        backgroundAttachment: "fixed, fixed, fixed",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div className="animate-fade-in-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <p style={{ color: "var(--gold)", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
              Welcome back
            </p>
            <h1 className="display-font" style={{ fontSize: "3rem", lineHeight: 1.1, color: "#f0ece4" }}>
              Apt {residentData?.apartmentNumber || "—"}
            </h1>
            <p style={{ color: "#666", marginTop: 4, fontSize: "0.9rem" }}>Gokul Residency · Beta</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "10px 18px", color: "#888",
              fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Sign Out
          </button>
        </div>

        {residentData && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>

            {/* Stats Card */}
            <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: 28, gridColumn: "span 1" }}>
              <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>
                Resident Stats
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                {[
                  { label: "XP Points", value: residentData.xp || 0, icon: "⚡" },
                  { label: "Level", value: residentData.level || 1, icon: "🎯" },
                  { label: "Streak", value: `${residentData.streak || 0}d`, icon: "🔥" },
                  { label: "Missions", value: residentData.garbageCount || 0, icon: "🗑" },
                ].map((stat) => (
                  <div key={stat.label} style={{
                    background: "rgba(255,255,255,0.03)", borderRadius: 12,
                    padding: "16px", border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{stat.icon}</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f0ece4", lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.78rem", color: "#666" }}>
                  <span>Level {residentData.level || 1} Progress</span>
                  <span className="gold-text">{Math.round(xpProgress)}%</span>
                </div>
                <div className="xp-bar-track">
                  <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: "#555", marginTop: 6 }}>
                  {(residentData.xp || 0) % 200} / 200 XP to next level
                </p>
              </div>
            </div>

            {/* Navigation Grid */}
            <div className="animate-fade-in-up stagger-2" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={handleGarbageMission}
                disabled={garbageLoading || residentData.lastGarbageDate === new Date().toDateString()}
                className="gold-button"
                style={{
                  width: "100%", padding: "18px 20px", borderRadius: 14, fontSize: "1rem",
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: residentData.lastGarbageDate === new Date().toDateString() ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 22 }}>🗑</span>
                <span>{garbageLoading ? "Processing…" : residentData.lastGarbageDate === new Date().toDateString() ? "Mission Done Today ✓" : "I Disposed Garbage Today"}</span>
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {NAV_ITEMS.map((item, i) => (
                  <Link key={item.href} href={item.href}
                    className={`animate-fade-in-up stagger-${i + 3}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, padding: "14px 16px",
                      textDecoration: "none", color: "#ccc",
                      fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", fontWeight: 500,
                      transition: "all 0.25s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.06)";
                      (e.currentTarget as HTMLElement).style.color = "#f0ece4";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLElement).style.color = "#ccc";
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {residentData.apartmentNumber === "203" && (
                <Link href="/admin" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.05))",
                  border: "1px solid var(--border-hover)",
                  borderRadius: 12, padding: "14px 16px",
                  textDecoration: "none", color: "var(--gold)",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 600,
                  letterSpacing: "0.04em", transition: "all 0.25s ease",
                }}>
                  🛡 Admin Panel
                </Link>
              )}
            </div>

            {/* Complaints Against You */}
            <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: 28 }}>
              <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>
                Complaints Against You
              </p>
              {complaints.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                  <p style={{ color: "#4ade80", fontWeight: 600 }}>No complaints</p>
<<<<<<< HEAD
                  <p style={{ color: "#555", fontSize: "0.85rem", marginTop: 4 }}>You're in good standing</p>
=======
                  <p style={{ color: "#555", fontSize: "0.85rem", marginTop: 4 }}>You&apos;re in good standing</p>
>>>>>>> 43986f6 (Premium UI final working build)
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ color: "#f87171", fontSize: "0.9rem" }}>{complaints.length} complaint{complaints.length > 1 ? "s" : ""} on record</p>
                  {complaints.map((complaint) => (
                    <div key={complaint.id} style={{
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 10, padding: "14px",
                    }}>
                      <p style={{ color: "#f87171", fontWeight: 600, marginBottom: 4 }}>⚠ {complaint.title}</p>
                      <p style={{ color: "#888", fontSize: "0.85rem" }}>{complaint.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Change Password */}
            <div className="glass-card animate-fade-in-up stagger-4" style={{ padding: 28 }}>
              <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>
                Security
              </p>
              <p style={{ color: "#666", fontSize: "0.88rem", marginBottom: 16 }}>Update your account password</p>
              <input
                type="password"
                placeholder="New password (min. 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="premium-input"
                style={{ marginBottom: 14 }}
              />
              {pwSuccess && (
                <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "10px 14px", color: "#4ade80", fontSize: "0.85rem", marginBottom: 12 }}>
                  Password updated successfully ✓
                </div>
              )}
              <button
                onClick={handlePasswordChange}
                style={{
                  width: "100%", padding: "13px", borderRadius: 10,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ccc", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                  fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)"; (e.currentTarget as HTMLElement).style.color = "#f0ece4"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "#ccc"; }}
              >
                Update Password
              </button>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
