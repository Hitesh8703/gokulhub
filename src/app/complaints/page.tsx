"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";

const COMPLAINT_TYPES = ["Resident Complaint","Water Issue","Garbage Issue","Lift Issue","Parking Issue","Electricity Issue","Noise Complaint","General Issue"];

export default function ComplaintsPage() {
  const router = useRouter();
  const [residentData, setResidentData] = useState<any>(null);
  const [complaintType, setComplaintType] = useState("Resident Complaint");
  const [againstApartment, setAgainstApartment] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      const snap = await getDoc(doc(db, "residents", user.uid));
      if (snap.exists()) setResidentData(snap.data());
    });
    return () => unsubscribe();
  }, [router]);

  async function handleComplaint() {
    setError("");
    if (!title || !description) { setError("Please fill all fields"); return; }
    if (complaintType === "Resident Complaint" && !againstApartment) { setError("Enter the apartment number"); return; }
    const user = auth.currentUser;
    if (!user || !residentData) return;
    try {
      setSubmitting(true);
      await addDoc(collection(db, "complaints"), {
        type: complaintType, title, description, status: "Pending",
        raisedBy: residentData.apartmentNumber,
        apartmentNumber: residentData.apartmentNumber,
        againstApartment: complaintType === "Resident Complaint" ? againstApartment : null,
        createdAt: serverTimestamp(),
      });
      if (complaintType === "Resident Complaint") {
        await addDoc(collection(db, "notifications"), { type: "private", targetApartment: againstApartment, title: "🚨 Complaint Against You", description, createdAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "notifications"), { type: "public", title, description, issueType: complaintType, createdAt: serverTimestamp() });
      }
      router.push("/my-complaints");
    } catch (e: any) { setError(e.message || "Error submitting complaint"); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="min-h-screen" style={{ background: "#050505", padding: "40px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Community</p>
            <h1 className="display-font" style={{ fontSize: "2.6rem", color: "#f0ece4" }}>Raise Complaint</h1>
          </div>
          <Link href="/dashboard" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px", color: "#888", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
            ← Back
          </Link>
        </div>

        <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Complaint Type</label>
              <select value={complaintType} onChange={(e) => setComplaintType(e.target.value)} className="premium-select">
                {COMPLAINT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {complaintType === "Resident Complaint" && (
              <div className="animate-fade-in">
                <label style={{ display: "block", color: "#888", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Against Apartment Number</label>
                <input type="text" placeholder="e.g. 302" value={againstApartment} onChange={(e) => setAgainstApartment(e.target.value)} className="premium-input" />
              </div>
            )}

            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Title</label>
              <input type="text" placeholder="Brief summary of the issue" value={title} onChange={(e) => setTitle(e.target.value)} className="premium-input" />
            </div>

            <div>
              <label style={{ display: "block", color: "#888", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Description</label>
              <textarea placeholder="Describe the issue in detail…" value={description} onChange={(e) => setDescription(e.target.value)}
                className="premium-input" style={{ height: 140, resize: "vertical" as const }} />
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: "0.88rem" }}>
                {error}
              </div>
            )}

            <button onClick={handleComplaint} disabled={submitting} className="gold-button" style={{ width: "100%", padding: "16px", borderRadius: 12, fontSize: "1rem", marginTop: 4, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Submitting…" : "🚨 Submit Complaint"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
