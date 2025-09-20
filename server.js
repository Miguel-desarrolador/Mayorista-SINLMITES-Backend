import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import productosRoutes from "./routes/productos.js";
import comprasRoutes from "./routes/compras.js";
import facturasRoutes from "./routes/facturas.js";

dotenv.config();

const app = express();

// 🚀 Confiar en proxy (para que respete https en Railway)
app.set("trust proxy", true);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Carpetas públicas
app.use("/uploads", express.static(path.join("uploads")));
app.use("/img/productos", express.static(path.join("img/productos")));

// Rutas
app.use("/api/productos", productosRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/facturas", facturasRoutes);

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB");
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Servidor en http://localhost:${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));
