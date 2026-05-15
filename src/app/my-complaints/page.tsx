"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  if (status === "Resolved") return <span className="badge badge-resolved">● Resolved</span>;
  if (status === "Under Review") return <span className="badge badge-review">● Under Review</span>;
  return <span className="badge badge-pending">● Pending</span>;
}

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const apartment = localStorage.getItem("apartment");
        if (!apartment) { setLoading(false); return; }
        const q = query(collection(db, "complaints"), where("raisedBy", "==", apartment));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort: Pending first, then Under Review, then Resolved
        data.sort((a: any, b: any) => {
          const order: Record<string, number> = { "Pending": 0, "Under Review": 1, "Resolved": 2 };
          return (order[a.status] ?? 0) - (order[b.status] ?? 0);
        });
        setComplaints(data);
      } catch (error) { console.error(error); }
      setLoading(false);
    }
    fetchComplaints();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#050505" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 20px" }} />
          <p style={{ color: "#777", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Complaints</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "#050505", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Tracking</p>
            <h1 className="display-font" style={{ fontSize: "2.6rem", color: "#f0ece4" }}>My Complaints</h1>
          </div>
          <Link href="/dashboard" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px", color: "#888", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
            ← Dashboard
          </Link>
        </div>

        {complaints.length === 0 ? (
          <div className="glass-card animate-fade-in" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ color: "#888", marginBottom: 20 }}>No complaints submitted yet</p>
            <Link href="/complaints" style={{
              display: "inline-block", background: "linear-gradient(135deg, #8a6e2f, #c9a84c)",
              color: "#0a0800", padding: "12px 24px", borderRadius: 10,
              textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            }}>
              Raise a Complaint
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {complaints.map((complaint, i) => (
              <div key={complaint.id} className={`premium-card animate-fade-in-up stagger-${Math.min(i + 1, 8)}`} style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <StatusBadge status={complaint.status || "Pending"} />
                  {complaint.type && (
                    <span style={{ fontSize: "0.72rem", color: "#666", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {complaint.type}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#f0ece4", marginBottom: 8 }}>{complaint.title}</h2>
                <p style={{ color: "#777", fontSize: "0.9rem", lineHeight: 1.5 }}>{complaint.description}</p>
                {complaint.againstApartment && (
                  <p style={{ marginTop: 10, fontSize: "0.8rem", color: "#555" }}>Against: Apt {complaint.againstApartment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
