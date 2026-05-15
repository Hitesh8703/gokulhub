"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [residentData, setResidentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const residentSnap = await getDoc(doc(db, "residents", user.uid));
      if (!residentSnap.exists()) { setLoading(false); return; }
      const resident = residentSnap.data();
      setResidentData(resident);
      const apt = resident.apartmentNumber;

      const [publicSnap, privateSnap] = await Promise.all([
        getDocs(query(collection(db, "notifications"), where("type", "==", "public"))),
        getDocs(query(collection(db, "notifications"), where("targetApartment", "==", apt))),
      ]);

      const all: any[] = [];
      publicSnap.forEach((d) => {
        const data = d.data();
        if (!data.clearedBy?.includes(apt)) all.push({ id: d.id, ...data });
      });
      privateSnap.forEach((d) => {
        const data = d.data();
        if (!data.clearedBy?.includes(apt)) all.push({ id: d.id, ...data });
      });

      // Sort by createdAt desc
      all.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setNotifications(all);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function clearNotification(notificationId: string) {
    if (!residentData) return;
    await updateDoc(doc(db, "notifications", notificationId), { clearedBy: arrayUnion(residentData.apartmentNumber) });
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "#050505" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 20px" }} />
        <p style={{ color: "#777", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Notifications</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen" style={{ background: "#050505", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Updates</p>
            <h1 className="display-font" style={{ fontSize: "2.6rem", color: "#f0ece4" }}>
              🔔 Notifications
              {notifications.length > 0 && (
                <span style={{ marginLeft: 12, background: "rgba(201,168,76,0.15)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 10px", fontSize: "1.2rem", color: "var(--gold)", verticalAlign: "middle" }}>
                  {notifications.length}
                </span>
              )}
            </h1>
          </div>
          <Link href="/dashboard" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px", color: "#888", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
            ← Dashboard
          </Link>
        </div>

        {notifications.length === 0 ? (
          <div className="glass-card animate-fade-in" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: "#4ade80", fontWeight: 600, marginBottom: 6 }}>All caught up</p>
            <p style={{ color: "#555", fontSize: "0.88rem" }}>No new notifications</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {notifications.map((notification, i) => (
              <div key={notification.id} className={`premium-card animate-fade-in-up stagger-${Math.min(i + 1, 8)}`} style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: notification.type === "public" ? "rgba(201,168,76,0.15)" : "rgba(239,68,68,0.1)",
                    border: notification.type === "public" ? "1px solid var(--border)" : "1px solid rgba(239,68,68,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  }}>
                    {notification.type === "public" ? "📢" : "🔔"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <h2 style={{ fontWeight: 600, color: "#f0ece4", fontSize: "0.95rem" }}>{notification.title}</h2>
                      <span style={{ fontSize: "0.7rem", color: notification.type === "public" ? "var(--gold)" : "#888", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
                        {notification.type || "notification"}
                      </span>
                    </div>
                    <p style={{ color: "#777", fontSize: "0.88rem", marginTop: 6, lineHeight: 1.5 }}>{notification.description}</p>
                    <button
                      onClick={() => clearNotification(notification.id)}
                      style={{
                        marginTop: 14, padding: "7px 16px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)", color: "#666", transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "#666"; }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
