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
app.use("/uploads", express.static("uploads"));


// 🔹 Rutas de tu aplicación
app.use("/api/reportes", reportesRoutes);
app.use("/api", routes);

// 🔹 Verificación inicial de conexión a la base de datos
connection.query("SELECT 1")
  .then(() => console.log("✅ Conectado a la base de datos"))
  .catch(err => console.error("❌ Error al conectar a la base de datos:", err.message));

// 🔹 Ruta principal
app.get("/", (req, res) => {
  res.send("🚀 Servidor de NetLink Perú funcionando correctamente");
});

// 🔹 Ruta de prueba del servidor
app.get("/api/test", (req, res) => {
  res.json({
    message: "✅ Servidor de NetLink Perú funcionando correctamente 🚀",
    fecha: new Date().toLocaleString("es-PE"),
  });
});

// 🔹 Ruta de prueba de conexión a la base de datos
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT NOW() AS fecha_actual");
    res.json({
      message: "✅ Conexión exitosa con la base de datos de Clever Cloud",
      fecha_servidor: rows[0].fecha_actual,
    });
  } catch (error) {
    console.error("❌ Error al probar conexión:", error.message);
    res.status(500).json({
      error: "Error al conectar con la base de datos",
      detalle: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
