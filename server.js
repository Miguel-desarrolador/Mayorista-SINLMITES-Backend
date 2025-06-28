 const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads');

// Crea la carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();  // <-- Aquí declaras app primero

// Habilitar CORS
app.use(cors());

// Middleware para manejar JSON
app.use(express.json());

// Servir archivos estáticos de la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Configuración de multer para subir PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Ruta para subir PDF
app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Conectar a MongoDB Atlas usando la URI del archivo .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a la base de datos MongoDB"))
  .catch((err) => console.error("Error al conectar a la base de datos MongoDB", err));

// Esquema y modelo de Producto
const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  imagen: { type: String, required: true },
  variantes: [
    {
      precio: { type: Number, required: true },
      stock: { type: Number, required: true },
      imagen: { type: String, required: true },
      id: { type: Number, required: true }
    }
  ]
}, { versionKey: false });

const Producto = mongoose.model('Producto', productoSchema, 'productos');

// Rutas para productos y variantes
app.get('/productos', async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.get('/productos/variantes', async (req, res) => {
  try {
    const productos = await Producto.find();
    const variantes = productos.flatMap(producto => producto.variantes);
    res.json(variantes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener variantes' });
  }
});



app.get('/productos/variantes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const productos = await Producto.find();
    const variante = productos.flatMap(producto => producto.variantes).find(v => v.id === Number(id));
    if (!variante) return res.status(404).json({ error: 'Variante no encontrada' });
    res.json({ stock: variante.stock });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el stock de la variante' });
  }
});




app.patch('/productos/variantes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const variante = await Producto.findOneAndUpdate(
      { "variantes.id": Number(id) },
      { $set: { "variantes.$.stock": stock } },
      { new: true }
    );

    if (!variante) return res.status(404).json({ error: 'Variante no encontrada' });

    res.json({ message: 'Stock actualizado correctamente', variante });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el stock' });
  }
});
// DELETE /productos/variantes/:id
app.delete('/productos/variantes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await Producto.updateOne(
      { "variantes.id": Number(id) },  // busca la variante por ID
      { $pull: { variantes: { id: Number(id) } } }  // la elimina del array
    );

    if (resultado.modifiedCount === 0) {
      return res.status(404).json({ error: 'Variante no encontrada o ya eliminada' });
    }

    res.status(200).json({ message: 'Variante eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar variante:', error);
    res.status(500).json({ error: 'Error interno al eliminar la variante' });
  }
});
// DELETE /productos/variantes/:id
app.delete('/productos/variantes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await Producto.updateOne(
      { "variantes.id": Number(id) },  // busca la variante por ID
      { $pull: { variantes: { id: Number(id) } } }  // la elimina del array
    );

    if (resultado.modifiedCount === 0) {
      return res.status(404).json({ error: 'Variante no encontrada o ya eliminada' });
    }

    res.status(200).json({ message: 'Variante eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar variante:', error);
    res.status(500).json({ error: 'Error interno al eliminar la variante' });
  }
});


app.post('/finalizar-compra', async (req, res) => {
  const productosEnCarrito = req.body.productos; // [{ id: 101, cantidad: 2 }, ...]

  if (!Array.isArray(productosEnCarrito) || productosEnCarrito.length === 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'No se recibieron productos válidos para la compra.'
    });
  }

  try {
    // 1. Verificar stock para cada variante
    for (const item of productosEnCarrito) {
      // Buscar el producto que contenga la variante por id
      const producto = await Producto.findOne({ "variantes.id": item.id });

      if (!producto) {
        return res.status(400).json({
          ok: false,
          mensaje: `Producto con variante ID ${item.id} no encontrado.`
        });
      }

      // Encontrar la variante dentro del producto
      const variante = producto.variantes.find(v => v.id === item.id);

      if (!variante) {
        return res.status(400).json({
          ok: false,
          mensaje: `Variante con ID ${item.id} no encontrada.`
        });
      }

      if (variante.stock < item.cantidad) {
        return res.status(400).json({
          ok: false,
          mensaje: `Stock insuficiente para variante ID ${item.id}. Disponible: ${variante.stock}, solicitado: ${item.cantidad}`
        });
      }
    }

    // 2. Descontar stock para cada variante (operación atómica por variante)
    for (const item of productosEnCarrito) {
      const actualizado = await Producto.findOneAndUpdate(
        {
          "variantes.id": item.id,
          "variantes.stock": { $gte: item.cantidad }
        },
        { $inc: { "variantes.$.stock": -item.cantidad } },
        { new: true }
      );

      if (!actualizado) {
        return res.status(400).json({
          ok: false,
          mensaje: `Error al descontar stock para variante ID ${item.id}. Otro cliente puede haber comprado justo antes.`
        });
      }
    }

    // Si llegamos acá, todo fue bien
    return res.status(200).json({
      ok: true,
      mensaje: 'Compra realizada con éxito.'
    });

  } catch (error) {
    console.error('Error al finalizar compra:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno al procesar la compra.'
    });
  }
});





// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
