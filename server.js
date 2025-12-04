import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connection from "./config/db.js";
import routes from "./routes/index.js";
import reportesRoutes from "./routes/reportes.routes.js";

// ⭐⭐ NUEVO: importar ruta de login ⭐⭐
import authRoutes from "./routes/auth.routes.js";

import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ⭐⭐ Servir archivos subidos ⭐⭐
app.use("/uploads", express.static("uploads"));

// Servir carpeta "public"
app.use(express.static("public"));

// ⭐ Rutas principales
app.use("/api/reportes", reportesRoutes);
app.use("/api", routes);

// ⭐⭐ NUEVO: ruta de autenticación (login) ⭐⭐
app.use("/api/auth", authRoutes);

// Verificación inicial BD
connection.query("SELECT 1")
  .then(() => console.log("✅ Conectado a la base de datos"))
  .catch(err => console.error("❌ Error al conectar a la base de datos:", err.message));

// Ruta principal
app.get("/", (req, res) => {
  res.send("🚀 Servidor de NetLink Perú funcionando correctamente");
});

// Ruta test
app.get("/api/test", (req, res) => {
  res.json({
    message: "✅ Servidor funcionando 🚀",
    fecha: new Date().toLocaleString("es-PE"),
  });
});

// Test conexión BD
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT NOW() AS fecha_actual");
    res.json({
      message: "✅ Conexión exitosa con la BD",
      fecha_servidor: rows[0].fecha_actual,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error al conectar con la base de datos",
      detalle: error.message,
    });
  }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
