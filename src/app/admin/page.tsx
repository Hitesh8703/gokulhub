"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { accolades } from "@/lib/accolades";

type Complaint = { id: string; title: string; description: string; status: string; raisedBy?: string; type?: string; createdAt?: any; };
type Notification = { id: string; title: string; description: string; type?: string; };

function StatusBadge({ status }: { status: string }) {
  if (status === "Resolved") return <span className="badge badge-resolved">● Resolved</span>;
  if (status === "Under Review") return <span className="badge badge-review">● Under Review</span>;
  return <span className="badge badge-pending">● Pending</span>;
}

export default function AdminPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [selectedAccolade, setSelectedAccolade] = useState("");
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }

      const residentSnapshot = await getDocs(collection(db, "residents"));
      const residentList: any[] = [];
      let currentResident: any = null;
      residentSnapshot.forEach((docItem) => {
        const resident = { id: docItem.id, ...docItem.data() };
        residentList.push(resident);
        if (docItem.id === user.uid) currentResident = resident;
      });

      if (currentResident?.apartmentNumber !== "203") { router.push("/dashboard"); return; }
      setResidents(residentList);

      const complaintSnapshot = await getDocs(collection(db, "complaints"));
      setComplaints(complaintSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Complaint)));

      const notificationSnapshot = await getDocs(collection(db, "notifications"));
      setNotifications(notificationSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
    });
    return () => unsubscribe();
  }, [router]);

  async function updateComplaintStatus(complaintId: string, status: string) {
    await updateDoc(doc(db, "complaints", complaintId), { status });
    setComplaints((prev) => prev.map((c) => c.id === complaintId ? { ...c, status } : c));
    showToast(`Status updated to "${status}"`);
  }

  async function deleteComplaint(complaintId: string) {
    if (!confirm("Permanently delete this complaint?")) return;
    await deleteDoc(doc(db, "complaints", complaintId));
    setComplaints((prev) => prev.filter((c) => c.id !== complaintId));
    showToast("Complaint deleted");
  }

  async function deleteNotification(notificationId: string) {
    if (!confirm("Delete this notification?")) return;
    await deleteDoc(doc(db, "notifications", notificationId));
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    showToast("Notification deleted");
  }

  async function grantAccolade() {
    if (!selectedResident || !selectedAccolade) { showToast("Select apartment and accolade"); return; }
    const resident = residents.find((r) => r.id === selectedResident);
    const accolade = accolades.find((a) => a.id === selectedAccolade);
    if (!resident || !accolade) return;
    if (resident.unlockedAccolades?.includes(accolade.id)) { showToast("Resident already has this accolade"); return; }
    await updateDoc(doc(db, "residents", resident.id), { unlockedAccolades: arrayUnion(accolade.id), xp: increment(accolade.xp) });
    showToast(`✓ Accolade granted to Apt ${resident.apartmentNumber}`);
  }

  async function removeAccolade() {
    if (!selectedResident || !selectedAccolade) { showToast("Select apartment and accolade"); return; }
    await updateDoc(doc(db, "residents", selectedResident), { unlockedAccolades: arrayRemove(selectedAccolade) });
    showToast("Accolade removed");
  }

  const statusOrder = ["Pending", "Under Review", "Resolved"];

  return (
    <main className="min-h-screen" style={{ background: "#050505", padding: "40px 24px" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: "linear-gradient(135deg, #1a1a1a, #222)",
          border: "1px solid var(--border-hover)", borderRadius: 12, padding: "14px 20px",
          color: "var(--gold)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)", animation: "fadeInUp 0.3s ease",
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Administration</p>
            <h1 className="display-font" style={{ fontSize: "2.8rem", color: "#f0ece4" }}>🛡 Admin Panel</h1>
          </div>
          <Link href="/dashboard" style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "10px 18px", color: "#888", textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem",
          }}>
            ← Dashboard
          </Link>
        </div>

        {/* Announcement Button */}
        <Link href="/admin/announcement" className="animate-fade-in-up stagger-1"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.05))",
            border: "1px solid var(--border-hover)", borderRadius: 14, padding: "18px 24px",
            textDecoration: "none", color: "var(--gold-light)", marginBottom: 32,
            fontFamily: "'DM Sans', sans-serif", fontSize: "1rem", fontWeight: 600,
            transition: "all 0.25s",
          }}
        >
          <span style={{ fontSize: 22 }}>📢</span>
          <span>Announcement System</span>
          <span style={{ marginLeft: "auto", color: "#666", fontSize: "0.85rem" }}>→</span>
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>

          {/* Accolades Management */}
          <div className="glass-card animate-fade-in-up stagger-2" style={{ padding: 28 }}>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>
              🏅 Manage Accolades
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <select value={selectedResident} onChange={(e) => setSelectedResident(e.target.value)} className="premium-select">
                <option value="">Select Apartment</option>
                {residents.map((r) => <option key={r.id} value={r.id}>Apartment {r.apartmentNumber}</option>)}
              </select>
              <select value={selectedAccolade} onChange={(e) => setSelectedAccolade(e.target.value)} className="premium-select">
                <option value="">Select Accolade</option>
                {accolades.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={grantAccolade} style={{
<<<<<<< HEAD
                  flex: 1, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer",
=======
                  flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer",
>>>>>>> 43986f6 (Premium UI final working build)
                  background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                  color: "#4ade80", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s",
                }}>Grant</button>
                <button onClick={removeAccolade} style={{
<<<<<<< HEAD
                  flex: 1, padding: "12px", borderRadius: 10, border: "none", cursor: "pointer",
=======
                  flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer",
>>>>>>> 43986f6 (Premium UI final working build)
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s",
                }}>Remove</button>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="glass-card animate-fade-in-up stagger-2" style={{ padding: 28 }}>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>Overview</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Total Complaints", value: complaints.length, icon: "🚨" },
                { label: "Pending", value: complaints.filter(c => c.status === "Pending").length, icon: "⏳" },
                { label: "Under Review", value: complaints.filter(c => c.status === "Under Review").length, icon: "🔍" },
                { label: "Resolved", value: complaints.filter(c => c.status === "Resolved").length, icon: "✅" },
              ].map((s) => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f0ece4", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="gold-divider" style={{ margin: "36px 0" }} />

        {/* Complaints Section */}
        <div className="animate-fade-in-up stagger-3">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 className="display-font" style={{ fontSize: "1.8rem", color: "#f0ece4" }}>🚨 Complaints</h2>
            <span style={{ color: "#666", fontSize: "0.85rem" }}>{complaints.length} total</span>
          </div>

          {complaints.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "#555" }}>No complaints submitted yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {complaints.map((complaint, i) => (
                <div key={complaint.id} className={`premium-card animate-fade-in-up stagger-${Math.min(i + 1, 8)}`} style={{ padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <StatusBadge status={complaint.status || "Pending"} />
                        {complaint.type && (
                          <span style={{ fontSize: "0.72rem", color: "#666", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            {complaint.type}
                          </span>
                        )}
                        {complaint.raisedBy && (
                          <span style={{ fontSize: "0.75rem", color: "var(--gold-dim)", fontWeight: 500 }}>
                            Apt {complaint.raisedBy}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f0ece4", marginBottom: 6 }}>{complaint.title}</h3>
                      <p style={{ color: "#888", fontSize: "0.9rem", lineHeight: 1.5 }}>{complaint.description}</p>
                    </div>
                  </div>

                  {/* Status actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ color: "#555", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>Set status:</span>
                    {statusOrder.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateComplaintStatus(complaint.id, status)}
                        style={{
                          padding: "7px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", letterSpacing: "0.04em",
                          border: complaint.status === status ? "none" : "1px solid rgba(255,255,255,0.1)",
                          background: complaint.status === status
                            ? status === "Resolved" ? "rgba(34,197,94,0.2)" : status === "Under Review" ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"
                            : "rgba(255,255,255,0.04)",
                          color: complaint.status === status
                            ? status === "Resolved" ? "#4ade80" : status === "Under Review" ? "#fbbf24" : "#f87171"
                            : "#666",
                        }}
                      >
                        {status}
                      </button>
                    ))}
                    <button
                      onClick={() => deleteComplaint(complaint.id)}
                      style={{
                        marginLeft: "auto", padding: "7px 14px", borderRadius: 8, fontSize: "0.78rem",
                        fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        background: "transparent", border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171", transition: "all 0.2s",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="gold-divider" style={{ margin: "36px 0" }} />

        {/* Notifications Section */}
        <div className="animate-fade-in-up stagger-4">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 className="display-font" style={{ fontSize: "1.8rem", color: "#f0ece4" }}>🔔 Notifications</h2>
            <span style={{ color: "#666", fontSize: "0.85rem" }}>{notifications.length} active</span>
          </div>

          {notifications.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "#555" }}>No active notifications</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {notifications.map((notification) => (
                <div key={notification.id} className="premium-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "0.72rem", color: notification.type === "public" ? "var(--gold)" : "#888", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
                        {notification.type || "notification"}
                      </span>
                    </div>
                    <p style={{ fontWeight: 600, color: "#f0ece4", marginBottom: 4 }}>{notification.title}</p>
                    <p style={{ color: "#777", fontSize: "0.85rem" }}>{notification.description}</p>
                  </div>
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: "0.8rem",
                      fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      background: "transparent", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171", whiteSpace: "nowrap", transition: "all 0.2s",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
