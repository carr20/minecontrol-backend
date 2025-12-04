// backend/routes/auth.routes.js
import express from "express";
import connection from "../config/db.js";
import bcrypt from "bcrypt";

const router = express.Router();

// pequeña ayuda para detectar si el campo ya es un hash bcrypt
const isBcryptHash = (value) =>
  typeof value === "string" && value.startsWith("$2") && value.length >= 50;

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Usuario y contraseña son obligatorios" });
  }

  try {
    // Buscamos por username (puedes cambiarlo a email si prefieres)
    const [rows] = await connection.query(
      "SELECT id, username, email, password, id_rol, estado FROM usuarios WHERE username = ? LIMIT 1",
      [username]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ error: "Usuario o contraseña incorrectos" });
    }

    const user = rows[0];

    // Verificar estado
    if (user.estado !== "activo") {
      return res.status(403).json({ error: "El usuario está inactivo" });
    }

    // Comprobamos contraseña
    let passwordOk = false;

    if (isBcryptHash(user.password)) {
      // contraseña cifrada
      passwordOk = await bcrypt.compare(password, user.password);
    } else {
      // ⚠️ modo compatibilidad: contraseña todavía sin cifrar
      passwordOk = password === user.password;
    }

    if (!passwordOk) {
      return res
        .status(401)
        .json({ error: "Usuario o contraseña incorrectos" });
    }

    // Si todo bien, devolvemos datos básicos del usuario
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      id_rol: user.id_rol,
      estado: user.estado,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error al procesar el login" });
  }
});

export default router;
