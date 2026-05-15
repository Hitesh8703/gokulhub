"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";

const COMPLAINT_TYPES = [
  "Noise",
  "Garbage",
  "Parking",
  "Maintenance",
  "Misconduct",
  "General",
];

type Resident = {
  id: string;
  apartmentNumber: string;
  name?: string;
};

export default function ComplaintsPage() {
  const router = useRouter();
  const [residentData, setResidentData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [allResidents, setAllResidents] = useState<Resident[]>([]);
  const [complaintType, setComplaintType] = useState("Noise");
  const [againstType, setAgainstType] = useState<"resident" | "general">(
    "general"
  );
  const [againstResidentId, setAgainstResidentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.uid);
      const snap = await getDoc(doc(db, "residents", user.uid));
      if (snap.exists()) setResidentData(snap.data());

      // Fetch all residents for dropdown (excluding self)
      const residentSnap = await getDocs(collection(db, "residents"));
      const list: Resident[] = [];
      residentSnap.forEach((d) => {
        if (d.id !== user.uid) {
          list.push({ id: d.id, ...d.data() } as Resident);
        }
      });
      list.sort((a, b) =>
        a.apartmentNumber.localeCompare(b.apartmentNumber)
      );
      setAllResidents(list);
    });
    return () => unsubscribe();
  }, [router]);

  async function handleComplaint() {
    setError("");
    if (!title.trim() || !description.trim()) {
      setError("Please fill in both the title and description.");
      return;
    }
    if (againstType === "resident" && !againstResidentId) {
      setError("Please select the resident you are complaining against.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !residentData) return;

    const selectedResident =
      againstType === "resident"
        ? allResidents.find((r) => r.id === againstResidentId)
        : null;

    try {
      setSubmitting(true);

      const complaintPayload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        type: complaintType,
        status: "Pending",
        submittedBy: residentData.name || `Apt ${residentData.apartmentNumber}`,
        submittedById: currentUserId,
        submittedByApartment: residentData.apartmentNumber,
        againstType,
        againstResidentName:
          againstType === "resident" && selectedResident
            ? selectedResident.name ||
              `Apt ${selectedResident.apartmentNumber}`
            : null,
        againstResidentId:
          againstType === "resident" ? againstResidentId : null,
        // Keep legacy field for backwards-compat with my-complaints page
        raisedBy: residentData.apartmentNumber,
        apartmentNumber: residentData.apartmentNumber,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "complaints"), complaintPayload);

      // Notifications
      if (againstType === "resident" && selectedResident) {
        await addDoc(collection(db, "notifications"), {
          type: "private",
          targetApartment: selectedResident.apartmentNumber,
          title: "🚨 Complaint Against You",
          description,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "notifications"), {
          type: "public",
          title,
          description,
          issueType: complaintType,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/my-complaints");
    } catch (e: any) {
      setError(e.message || "Error submitting complaint");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "#050505", padding: "40px 24px" }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
              Community
            </p>
            <h1
              className="display-font"
              style={{ fontSize: "2.6rem", color: "#f0ece4" }}
            >
              Raise Complaint
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
            ← Back
          </Link>
        </div>

        <div
          className="glass-card animate-fade-in-up stagger-1"
          style={{ padding: 32 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Complaint Type */}
            <div>
              <label
                style={{
                  display: "block",
                  color: "#888",
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Complaint Type
              </label>
              <select
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
                className="premium-select"
              >
                {COMPLAINT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Against Type */}
            <div>
              <label
                style={{
                  display: "block",
                  color: "#888",
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Complaint Against
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["general", "resident"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAgainstType(opt)}
                    style={{
                      flex: 1,
                      padding: "11px 16px",
                      borderRadius: 10,
                      border:
                        againstType === opt
                          ? "1px solid var(--border-hover)"
                          : "1px solid rgba(255,255,255,0.08)",
                      background:
                        againstType === opt
                          ? "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))"
                          : "rgba(255,255,255,0.03)",
                      color:
                        againstType === opt ? "var(--gold-light)" : "#666",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textTransform: "capitalize",
                    }}
                  >
                    {opt === "general" ? "🌐 General Issue" : "👤 Specific Resident"}
                  </button>
                ))}
              </div>
            </div>

            {/* Resident selector (conditional) */}
            {againstType === "resident" && (
              <div className="animate-fade-in">
                <label
                  style={{
                    display: "block",
                    color: "#888",
                    fontSize: "0.78rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Select Resident
                </label>
                <select
                  value={againstResidentId}
                  onChange={(e) => setAgainstResidentId(e.target.value)}
                  className="premium-select"
                >
                  <option value="">— Choose apartment —</option>
                  {allResidents.map((r) => (
                    <option key={r.id} value={r.id}>
                      Apt {r.apartmentNumber}
                      {r.name ? ` · ${r.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div>
              <label
                style={{
                  display: "block",
                  color: "#888",
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Title
              </label>
              <input
                type="text"
                placeholder="Brief summary of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="premium-input"
              />
            </div>

            {/* Description */}
            <div>
              <label
                style={{
                  display: "block",
                  color: "#888",
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Description
              </label>
              <textarea
                placeholder="Describe the issue in detail…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="premium-input"
                style={{ height: 140, resize: "vertical" as const }}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: "#f87171",
                  fontSize: "0.88rem",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleComplaint}
              disabled={submitting}
              className="gold-button"
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 12,
                fontSize: "1rem",
                marginTop: 4,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting…" : "🚨 Submit Complaint"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
