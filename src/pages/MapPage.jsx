import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { db, auth } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ReviewForm from "../components/ReviewForm";
import ErrorBoundary from "../components/ErrorBoundary";

const pointVert = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 0 8px #22c55e"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const pointOr = L.divIcon({
  className: "",
  html: '<div style="width:20px;height:20px;background:#f59e0b;border-radius:50%;border:3px solid white;box-shadow:0 0 10px #f59e0b"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const quartiers = ["Tous", "Cotonou", "Godomey", "Cocotomey", "Abomey-Calavi"];
const types = ["Tous", "Chambre salon", "Entree couchee", "Studio", "Maison entiere"];

export default function MapPage({ setEcran }) {
  const [maisons, setMaisons] = useState([]);
  const [quartier, setQuartier] = useState("Tous");
  const [type, setType] = useState("Tous");
  const [selected, setSelected] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [suppression, setSuppression] = useState(false);

  const loadData = async () => {
    try {
      const snap = await getDocs(collection(db, "maisons"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMaisons(data);
    } catch (e) {
      console.error("Erreur chargement maisons :", e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (maisonId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette maison ?")) return;
    try {
      setSuppression(true);
      setSelected(null);
      setShowReview(false);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await deleteDoc(doc(db, "maisons", maisonId));
      setMaisons((prev) => prev.filter((m) => m.id !== maisonId));
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setSuppression(false);
    }
  };

  const handleQuitter = () => {
    signOut(auth);
  };

  const filtrees = maisons.filter((m) => {
    const okQ = quartier === "Tous" || m.quartier === quartier;
    const okT = type === "Tous" || m.type === type;
    const okCoords = !isNaN(parseFloat(m.lat)) && !isNaN(parseFloat(m.lng));
    return okQ && okT && okCoords;
  });

  const isMine = selected && selected.proprietaireId === auth.currentUser?.uid;

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>

      {/* Message suppression en cours */}
      {suppression && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2000, display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(255,255,255,0.7)"
        }}>
          <div style={{
            background: "white", padding: "30px 40px", borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)", textAlign: "center"
          }}>
            <p style={{ fontSize: "32px", margin: "0 0 10px" }}>🗑️</p>
            <p style={{ color: "#dc2626", fontWeight: "bold", margin: 0 }}>
              Suppression en cours...
            </p>
          </div>
        </div>
      )}

      {/* Barre de filtres */}
      <div style={{
        position: "absolute", top: "16px", left: "50%",
        transform: "translateX(-50%)", zIndex: 1000,
        display: "flex", gap: "10px", background: "white",
        padding: "12px 16px", borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
      }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#666" }}>Quartier</p>
          <select value={quartier} onChange={(e) => setQuartier(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            {quartiers.map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#666" }}>Type</p>
          <select value={type} onChange={(e) => setType(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <button onClick={handleQuitter}
          style={{ padding: "6px 12px", background: "#fee2e2", color: "#dc2626",
            border: "none", borderRadius: "8px", cursor: "pointer",
            fontSize: "13px", alignSelf: "flex-end" }}>
          Quitter
        </button>
      </div>

      {/* Carte */}
      <ErrorBoundary>
        <MapContainer
          center={[6.3654, 2.4183]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {!suppression && filtrees.map((m) => {
            const estMaMaison = m.proprietaireId === auth.currentUser?.uid;
            return (
              <Marker
                key={m.id}
                position={[parseFloat(m.lat), parseFloat(m.lng)]}
                icon={estMaMaison ? pointOr : pointVert}
                eventHandlers={{ click: () => { setSelected(m); setShowReview(false); } }}
              >
                <Tooltip>{estMaMaison ? "⭐ " + m.type : m.type}</Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </ErrorBoundary>

      {/* Légende */}
      <div style={{
        position: "absolute", bottom: "20px", right: "16px", zIndex: 1000,
        background: "white", padding: "10px 14px", borderRadius: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)", fontSize: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <div style={{ width: "12px", height: "12px", background: "#22c55e",
            borderRadius: "50%", border: "2px solid white", boxShadow: "0 0 4px #22c55e" }} />
          <span>Maison disponible</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "14px", height: "14px", background: "#f59e0b",
            borderRadius: "50%", border: "2px solid white", boxShadow: "0 0 4px #f59e0b" }} />
          <span>Ma maison</span>
        </div>
      </div>

      {/* Fiche maison */}
      {selected && !showReview && (
        <div style={{
          position: "absolute", bottom: "20px", left: "50%",
          transform: "translateX(-50%)", zIndex: 1000,
          background: "white", borderRadius: "16px", padding: "20px",
          width: "300px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
          <button onClick={() => setSelected(null)}
            style={{ float: "right", background: "none", border: "none",
              fontSize: "18px", cursor: "pointer", color: "#999" }}>
            ✕
          </button>

          {selected.photo && (
            <img src={selected.photo} alt="maison"
              style={{ width: "100%", borderRadius: "10px", marginBottom: "10px" }} />
          )}

          <h3 style={{ margin: "0 0 4px", color: "#16a34a" }}>{selected.type}</h3>

          {isMine && (
            <span style={{
              display: "inline-block", background: "#fef3c7",
              color: "#92400e", fontSize: "11px", fontWeight: "bold",
              padding: "2px 8px", borderRadius: "20px", marginBottom: "6px"
            }}>
              ⭐ Ma maison
            </span>
          )}

          <p style={{ margin: "0 0 4px", color: "#666", fontSize: "13px" }}>
            {selected.quartier}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "13px" }}>{selected.description}</p>
          <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#0284c7" }}>
            {selected.paiement}
          </p>

          <a href={"https://wa.me/" + selected.whatsapp} target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", padding: "10px",
              background: "#25d366", color: "white", borderRadius: "10px",
              textDecoration: "none", fontWeight: "bold", marginBottom: "10px" }}>
            Contacter sur WhatsApp
          </a>

          <button onClick={() => setShowReview(true)}
            style={{ width: "100%", padding: "10px", background: "#fef3c7",
              color: "#92400e", border: "none", borderRadius: "10px",
              cursor: "pointer", fontSize: "14px", marginBottom: "10px" }}>
            Laisser un avis
          </button>

          {isMine && (
            <button onClick={() => handleDelete(selected.id)}
              style={{ width: "100%", padding: "10px", background: "#fee2e2",
                color: "#dc2626", border: "none", borderRadius: "10px",
                cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
              Supprimer ma maison
            </button>
          )}
        </div>
      )}

      {/* Formulaire avis */}
      {selected && showReview && (
        <div style={{
          position: "absolute", bottom: "20px", left: "50%",
          transform: "translateX(-50%)", zIndex: 1000,
          background: "white", borderRadius: "16px",
          width: "300px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
          <ReviewForm
            maisonId={selected.id}
            onClose={() => { setShowReview(false); setSelected(null); }}
          />
        </div>
      )}
    </div>
  );
}