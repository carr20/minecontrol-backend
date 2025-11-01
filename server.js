const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const connection = require("./config/db.js");

const trabajadoresRoutes = require("./routes/trabajadores.routes.js");
const asistenciasRoutes = require("./routes/asistencias.routes.js");
const maquinariasRoutes = require("./routes/maquinarias.routes.js");
const registroMaquinariaRoutes = require("./routes/registroMaquinaria.routes.js");
const reportesRoutes = require("./routes/reportes.routes.js");

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());

// Probar conexión a la base de datos
connection.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Error al conectar a la base de datos:", err);
  } else {
    console.log("✅ Conexión a la base de datos establecida correctamente.");
    conn.release();
  }
});

// Rutas principales
app.use("/api/trabajadores", trabajadoresRoutes);
app.use("/api/asistencias", asistenciasRoutes);
app.use("/api/maquinarias", maquinariasRoutes);
app.use("/api/registro_maquinaria", registroMaquinariaRoutes);
app.use("/api/reportes", reportesRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Backend de MineControl Perú funcionando correctamente.");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌍 Servidor ejecutándose en el puerto ${PORT}`);
});
