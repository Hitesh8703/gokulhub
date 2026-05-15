"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function AnnouncementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleAnnouncement() {
    setError("");
    if (!title || !description) { setError("Fill in all fields"); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "notifications"), { type: "public", title, description, createdAt: serverTimestamp() });
      setSuccess(true);
      setTitle(""); setDescription("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) { setError(e.message || "Failed to send"); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="min-h-screen" style={{ background: "#050505", padding: "40px 24px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Admin</p>
            <h1 className="display-font" style={{ fontSize: "2.4rem", color: "#f0ece4" }}>📢 Announcement</h1>
          </div>
          <Link href="/admin" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px", color: "#888", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
            ← Admin
          </Link>
        </div>

        <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: 32 }}>
          <p style={{ color: "#777", fontSize: "0.88rem", marginBottom: 24, lineHeight: 1.6 }}>
            Send a notification to <strong style={{ color: "#ccc" }}>all residents</strong> of Gokul Residency. Use this for important community updates, maintenance notices, or events.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Title</label>
              <input type="text" placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} className="premium-input" />
            </div>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Message</label>
              <textarea placeholder="Write your message…" value={description} onChange={(e) => setDescription(e.target.value)} className="premium-input" style={{ height: 160, resize: "vertical" as const }} />
            </div>

            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: "0.88rem" }}>{error}</div>}
            {success && <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: "0.88rem" }}>✓ Announcement sent to all residents</div>}

            <button onClick={handleAnnouncement} disabled={submitting} className="gold-button" style={{ width: "100%", padding: "16px", borderRadius: 12, fontSize: "1rem", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Sending…" : "📢 Send to All Residents"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
