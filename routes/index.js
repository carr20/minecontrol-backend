import express from "express";
import trabajadoresRoutes from "./trabajadores.routes.js";
import maquinariasRoutes from "./maquinarias.routes.js";
import usuariosRoutes from "./usuarios.routes.js";
import rolesRoutes from "./roles.routes.js";
import asistenciasRoutes from "./asistencias.routes.js"; // 👈 nueva
import registroMaquinariaRoutes from "./registro_maquinaria.routes.js";
import documentosTrabajadorRoutes from "./documentos_trabajador.routes.js";
import reportesRoutes from "./reportes.routes.js";


const router = express.Router();

router.get("/", (req, res) => {
  res.send("✅ Bienvenido a la API de MineControl Perú");
});

router.use("/trabajadores", trabajadoresRoutes);
router.use("/maquinarias", maquinariasRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/roles", rolesRoutes);
router.use("/asistencias", asistenciasRoutes); // 👈 nueva
router.use("/registro_maquinaria", registroMaquinariaRoutes);
router.use("/documentos", documentosTrabajadorRoutes);
router.use("/reportes", reportesRoutes);


export default router;
