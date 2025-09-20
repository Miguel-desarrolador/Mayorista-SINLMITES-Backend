import mongoose from "mongoose";

const productoSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  nombre: { type: String, required: true },
  categoria: { type: String, required: true },
  precio: { type: Number, required: true },
  stock: { type: Number, required: true },
  imagen: { type: String, required: true }
});

export const Producto = mongoose.model("Producto", productoSchema);
