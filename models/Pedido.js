import mongoose from "mongoose";

const pedidoSchema = new mongoose.Schema({
  datosCliente: { type: Object, required: true },
  carrito: [
    {
      productoId: { type: Number, required: true }, // coincide con Producto.id
      cantidad: { type: Number, required: true },
      precio: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  estado: { type: String, default: "pendiente" } // pendiente, cancelado, completado
});

export default mongoose.model("Pedido", pedidoSchema);
