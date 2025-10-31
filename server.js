import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connection from "./config/db.js";
import routes from "./routes/index.js";
import reportesRoutes from "./routes/reportes.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/reportes", reportesRoutes);

// Test de conexión a la base
connection.query("SELECT 1")
  .then(() => console.log("✅ Conectado a la base de datos"))
  .catch(err => console.error("❌ Error al conectar a la base de datos:", err.message));

// Rutas principales
app.use("/api", routes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;

// Ruta de prueba para verificar que el servidor está en línea
app.get("/", (req, res) => {
  res.send("🚀 Servidor de NetLink Perú funcionando correctamente");
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "✅ Servidor de NetLink Perú funcionando correctamente 🚀",
    fecha: new Date().toLocaleString("es-PE")
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
