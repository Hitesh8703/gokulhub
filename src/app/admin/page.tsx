"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { accolades } from "@/lib/accolades";

type Complaint = {
  id: string;
  title: string;
  description: string;
  status: string;
  type?: string;
  createdAt?: any;
  // New fields
  submittedBy?: string;
  submittedById?: string;
  submittedByApartment?: string;
  againstType?: "resident" | "general";
  againstResidentName?: string;
  againstResidentId?: string;
  // Legacy fallback
  raisedBy?: string;
};

type Notification = {
  id: string;
  title: string;
  description: string;
  type?: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "Resolved")
    return <span className="badge badge-resolved">● Resolved</span>;
  if (status === "Under Review")
    return <span className="badge badge-review">● Under Review</span>;
  return <span className="badge badge-pending">● Pending</span>;
}

function AgainstBadge({ complaint }: { complaint: Complaint }) {
  if (complaint.againstType === "resident" && complaint.againstResidentName) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: "0.72rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "#f87171",
        }}
      >
        👤 vs {complaint.againstResidentName}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        background: "rgba(100,149,237,0.12)",
        border: "1px solid rgba(100,149,237,0.25)",
        color: "#93bbf7",
      }}
    >
      🌐 General
    </span>
  );
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
      if (!user) {
        router.push("/login");
        return;
      }

      const residentSnapshot = await getDocs(collection(db, "residents"));
      const residentList: any[] = [];
      let currentResident: any = null;
      residentSnapshot.forEach((docItem) => {
        const resident = { id: docItem.id, ...docItem.data() };
        residentList.push(resident);
        if (docItem.id === user.uid) currentResident = resident;
      });

      if (currentResident?.apartmentNumber !== "203") {
        router.push("/dashboard");
        return;
      }
      setResidents(residentList);

      const complaintSnapshot = await getDocs(collection(db, "complaints"));
      const complaintList = complaintSnapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Complaint)
      );
      // Sort: Pending first, then Under Review, then Resolved, then by date
      const statusOrder: Record<string, number> = {
        Pending: 0,
        "Under Review": 1,
        Resolved: 2,
      };
      complaintList.sort(
        (a, b) =>
          (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)
      );
      setComplaints(complaintList);

      const notificationSnapshot = await getDocs(
        collection(db, "notifications")
      );
      setNotifications(
        notificationSnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Notification)
        )
      );
    });
    return () => unsubscribe();
  }, [router]);

  async function updateComplaintStatus(complaintId: string, status: string) {
    await updateDoc(doc(db, "complaints", complaintId), { status });
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, status } : c))
    );
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
    setNotifications((prev) =>
      prev.filter((n) => n.id !== notificationId)
    );
    showToast("Notification deleted");
  }

  async function grantAccolade() {
    if (!selectedResident || !selectedAccolade) {
      showToast("Select apartment and accolade");
      return;
    }
    const resident = residents.find((r) => r.id === selectedResident);
    const accolade = accolades.find((a) => a.id === selectedAccolade);
    if (!resident || !accolade) return;
    if (resident.unlockedAccolades?.includes(accolade.id)) {
      showToast("Resident already has this accolade");
      return;
    }
    await updateDoc(doc(db, "residents", resident.id), {
      unlockedAccolades: arrayUnion(accolade.id),
      xp: increment(accolade.xp),
    });
    showToast(`✓ Accolade granted to Apt ${resident.apartmentNumber}`);
  }

  async function removeAccolade() {
    if (!selectedResident || !selectedAccolade) {
      showToast("Select apartment and accolade");
      return;
    }
    await updateDoc(doc(db, "residents", selectedResident), {
      unlockedAccolades: arrayRemove(selectedAccolade),
    });
    showToast("Accolade removed");
  }

  function formatTimestamp(ts: any): string {
    if (!ts) return "";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "#050505", padding: "40px 24px" }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: "linear-gradient(135deg, #1a1a1a, #222)",
            border: "1px solid var(--border-hover)",
            borderRadius: 12,
            padding: "14px 20px",
            color: "var(--gold)",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            animation: "fadeInUp 0.3s ease",
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
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
              Administration
            </p>
            <h1
              className="display-font"
              style={{ fontSize: "2.8rem", color: "#f0ece4" }}
            >
              🛡 Admin Panel
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

        {/* Announcement Button */}
        <Link
          href="/admin/announcement"
          className="animate-fade-in-up stagger-1"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.05))",
            border: "1px solid var(--border-hover)",
            borderRadius: 14,
            padding: "18px 24px",
            textDecoration: "none",
            color: "var(--gold-light)",
            marginBottom: 32,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "1rem",
            fontWeight: 600,
            transition: "all 0.25s",
          }}
        >
          <span style={{ fontSize: 22 }}>📢</span>
          <span>Announcement System</span>
          <span style={{ marginLeft: "auto", color: "#666", fontSize: "0.85rem" }}>
            →
          </span>
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
          }}
        >
          {/* Accolades Management */}
          <div
            className="glass-card animate-fade-in-up stagger-2"
            style={{ padding: 28 }}
          >
            <p
              style={{
                color: "var(--gold)",
                fontSize: "0.75rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              🏅 Manage Accolades
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <select
                value={selectedResident}
                onChange={(e) => setSelectedResident(e.target.value)}
                className="premium-select"
              >
                <option value="">Select Apartment</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    Apartment {r.apartmentNumber}
                  </option>
                ))}
              </select>
              <select
                value={selectedAccolade}
                onChange={(e) => setSelectedAccolade(e.target.value)}
                className="premium-select"
              >
                <option value="">Select Accolade</option>
                {accolades.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={grantAccolade}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid rgba(34,197,94,0.3)",
                    cursor: "pointer",
                    background: "rgba(34,197,94,0.15)",
                    color: "#4ade80",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                >
                  Grant
                </button>
                <button
                  onClick={removeAccolade}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.25)",
                    cursor: "pointer",
                    background: "rgba(239,68,68,0.1)",
                    color: "#f87171",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div
            className="glass-card animate-fade-in-up stagger-2"
            style={{ padding: 28 }}
          >
            <p
              style={{
                color: "var(--gold)",
                fontSize: "0.75rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Overview
            </p>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              {[
                {
                  label: "Total Complaints",
                  value: complaints.length,
                  icon: "🚨",
                },
                {
                  label: "Pending",
                  value: complaints.filter((c) => c.status === "Pending").length,
                  icon: "⏳",
                },
                {
                  label: "Under Review",
                  value: complaints.filter((c) => c.status === "Under Review")
                    .length,
                  icon: "🔍",
                },
                {
                  label: "Resolved",
                  value: complaints.filter((c) => c.status === "Resolved").length,
                  icon: "✅",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    padding: 16,
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      color: "#f0ece4",
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#666",
                      marginTop: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gold-divider" style={{ margin: "36px 0" }} />

        {/* ─── Complaints Section ─── */}
        <div className="animate-fade-in-up stagger-3">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <h2
              className="display-font"
              style={{ fontSize: "1.8rem", color: "#f0ece4" }}
            >
              🚨 Complaints
            </h2>
            <span style={{ color: "#666", fontSize: "0.85rem" }}>
              {complaints.length} total
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "#555" }}>No complaints submitted yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {complaints.map((complaint, i) => (
                <div
                  key={complaint.id}
                  className={`premium-card animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
                  style={{ padding: 24 }}
                >
                  {/* Top row: badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <StatusBadge status={complaint.status || "Pending"} />
                    <AgainstBadge complaint={complaint} />
                    {complaint.type && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--gold-dim)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          background: "rgba(201,168,76,0.08)",
                          border: "1px solid rgba(201,168,76,0.2)",
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontWeight: 600,
                        }}
                      >
                        {complaint.type}
                      </span>
                    )}
                  </div>

                  {/* Title & description */}
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "#f0ece4",
                      marginBottom: 6,
                    }}
                  >
                    {complaint.title}
                  </h3>
                  <p
                    style={{
                      color: "#888",
                      fontSize: "0.9rem",
                      lineHeight: 1.55,
                      marginBottom: 14,
                    }}
                  >
                    {complaint.description}
                  </p>

                  {/* Meta row */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.025)",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.05)",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "#555",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        Submitted By
                      </span>
                      <span
                        style={{
                          fontSize: "0.88rem",
                          color: "#ccc",
                          fontWeight: 600,
                        }}
                      >
                        {complaint.submittedBy ||
                          (complaint.raisedBy
                            ? `Apt ${complaint.raisedBy}`
                            : "Unknown")}
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "#555",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        Apartment
                      </span>
                      <span
                        style={{
                          fontSize: "0.88rem",
                          color: "var(--gold)",
                          fontWeight: 600,
                        }}
                      >
                        {complaint.submittedByApartment ||
                          complaint.raisedBy ||
                          "—"}
                      </span>
                    </div>
                    {complaint.againstType === "resident" &&
                      complaint.againstResidentName && (
                        <div>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              color: "#555",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              display: "block",
                              marginBottom: 3,
                            }}
                          >
                            Against Resident
                          </span>
                          <span
                            style={{
                              fontSize: "0.88rem",
                              color: "#f87171",
                              fontWeight: 600,
                            }}
                          >
                            {complaint.againstResidentName}
                          </span>
                        </div>
                      )}
                    {complaint.createdAt && (
                      <div style={{ marginLeft: "auto" }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "#555",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            display: "block",
                            marginBottom: 3,
                          }}
                        >
                          Filed On
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#666" }}>
                          {formatTimestamp(complaint.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() =>
                        updateComplaintStatus(complaint.id, "Under Review")
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.2s",
                        border:
                          complaint.status === "Under Review"
                            ? "none"
                            : "1px solid rgba(234,179,8,0.3)",
                        background:
                          complaint.status === "Under Review"
                            ? "rgba(234,179,8,0.25)"
                            : "rgba(234,179,8,0.08)",
                        color: "#fbbf24",
                      }}
                    >
                      🔍 Mark Under Review
                    </button>
                    <button
                      onClick={() =>
                        updateComplaintStatus(complaint.id, "Resolved")
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.2s",
                        border:
                          complaint.status === "Resolved"
                            ? "none"
                            : "1px solid rgba(34,197,94,0.3)",
                        background:
                          complaint.status === "Resolved"
                            ? "rgba(34,197,94,0.25)"
                            : "rgba(34,197,94,0.08)",
                        color: "#4ade80",
                      }}
                    >
                      ✅ Resolve Complaint
                    </button>
                    <button
                      onClick={() =>
                        updateComplaintStatus(complaint.id, "Pending")
                      }
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.2s",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background:
                          complaint.status === "Pending"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(255,255,255,0.04)",
                        color:
                          complaint.status === "Pending" ? "#f87171" : "#666",
                      }}
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => deleteComplaint(complaint.id)}
                      style={{
                        marginLeft: "auto",
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        background: "transparent",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                        transition: "all 0.2s",
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

        {/* ─── Notifications Section ─── */}
        <div className="animate-fade-in-up stagger-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <h2
              className="display-font"
              style={{ fontSize: "1.8rem", color: "#f0ece4" }}
            >
              🔔 Notifications
            </h2>
            <span style={{ color: "#666", fontSize: "0.85rem" }}>
              {notifications.length} active
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "#555" }}>No active notifications</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="premium-card"
                  style={{
                    padding: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color:
                            notification.type === "public"
                              ? "var(--gold)"
                              : "#888",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {notification.type || "notification"}
                      </span>
                    </div>
                    <p
                      style={{
                        fontWeight: 600,
                        color: "#f0ece4",
                        marginBottom: 4,
                      }}
                    >
                      {notification.title}
                    </p>
                    <p style={{ color: "#777", fontSize: "0.85rem" }}>
                      {notification.description}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
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
