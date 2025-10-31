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
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
