import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { db, auth } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ReviewForm from "../components/ReviewForm";

const pointVert = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 0 8px #22c55e"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const quartiers = ["Tous", "Cotonou", "Godomey", "Cocotomey", "Abomey-Calavi"];
const types = ["Tous", "Chambre salon", "Entree couchee", "Studio", "Maison entiere"];

export default function MapPage({ setEcran }) {
  const [maisons, setMaisons] = useState([]);
  const [quartier, setQuartier] = useState("Tous");
  const [type, setType] = useState("Tous");
  const [selected, setSelected] = useState(null);
  const [showReview, setShowReview] = useState(false);

  const loadData = async () => {
    const snap = await getDocs(collection(db, "maisons"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setMaisons(data);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (maisonId) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette maison ?")) {
      await deleteDoc(doc(db, "maisons", maisonId));
      setSelected(null);
      loadData();
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

      <MapContainer center={[6.3654, 2.4183]} zoom={13}
        style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {filtrees.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pointVert}
            eventHandlers={{ click: () => { setSelected(m); setShowReview(false); } }}>
            <Tooltip>{m.type}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

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
            X
          </button>

          {selected.photo && (
            <img src={selected.photo} alt="maison"
              style={{ width: "100%", borderRadius: "10px", marginBottom: "10px" }} />
          )}

          <h3 style={{ margin: "0 0 4px", color: "#16a34a" }}>{selected.type}</h3>
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