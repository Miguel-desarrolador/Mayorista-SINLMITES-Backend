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



// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
