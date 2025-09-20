import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";       
import { Producto } from "../models/Producto.js";

const router = express.Router();

// ==========================
// CONFIGURACIÓN MULTER
// ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "img/productos"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// ==========================
// GET todos los productos
// ==========================
router.get("/", async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los productos" });
  }
});

// ==========================
// POST agregar producto nuevo con imagen
// ==========================
router.post("/", upload.single("imagen"), async (req, res) => {
  try {
    const { nombre, categoria, precio, stock } = req.body;

    if (!nombre || !categoria || !precio || !stock || !req.file) {
      return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }

    const lastProducto = await Producto.findOne().sort({ id: -1 });
    const id = lastProducto ? lastProducto.id + 1 : 1;

    const nuevoProducto = new Producto({
      id,
      nombre,
      categoria,
      precio,
      stock,
      imagen: req.file.filename
    });

    await nuevoProducto.save();
    res.json(nuevoProducto);

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al agregar producto" });
  }
});

// ==========================
// PUT actualizar nombre, categoría, precio o stock
// ==========================
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, categoria, precio, stock } = req.body;
  const actualizacion = {};

  if (nombre) actualizacion.nombre = nombre;
  if (categoria) actualizacion.categoria = categoria;

  if (precio !== undefined) {
    const precioNumber = parseFloat(precio);
    if (isNaN(precioNumber) || precioNumber < 0)
      return res.status(400).json({ error: "Precio inválido" });
    actualizacion.precio = precioNumber;
  }

  if (stock !== undefined) {
    const stockNumber = parseInt(stock);
    if (isNaN(stockNumber) || stockNumber < 0)
      return res.status(400).json({ error: "Stock inválido" });
    actualizacion.stock = stockNumber;
  }

  try {
    const producto = await Producto.findOneAndUpdate(
      { id: parseInt(id) },
      actualizacion,
      { new: true }
    );

    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json({ mensaje: "Producto actualizado correctamente", producto });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// ==========================
// DELETE un producto por su id
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const producto = await Producto.findOneAndDelete({ id: parseInt(req.params.id) });
    if (!producto) return res.status(404).json({ msg: "Producto no encontrado" });

    const imagenPath = path.join("img/productos", producto.imagen);
    fs.unlink(imagenPath, (err) => {
      if (err) console.error("No se pudo eliminar la imagen:", err);
    });

    res.json({ msg: `Producto "${producto.nombre}" eliminado correctamente.` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al eliminar producto" });
  }
});

// ==========================
// PUT actualizar imagen de un producto
// ==========================
router.put("/:id/imagen", upload.single("imagen"), async (req, res) => {
  try {
    const producto = await Producto.findOne({ id: parseInt(req.params.id) });
    if (!producto) return res.status(404).json({ msg: "Producto no encontrado" });
    if (!req.file) return res.status(400).json({ msg: "No se subió ninguna imagen" });

    const imagenAnterior = path.join("img/productos", producto.imagen);
    fs.unlink(imagenAnterior, (err) => {
      if (err) console.error("No se pudo eliminar la imagen anterior:", err);
    });

    producto.imagen = req.file.filename;
    await producto.save();

    res.json({ imagen: producto.imagen, msg: "Imagen actualizada correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al actualizar la imagen" });
  }
});

export default router;
