const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const lockfile = require('lockfile');

const app = express();
const PORT = process.env.PORT || 8088;
const DATA_FILE = './gifts.json';

// Middleware para analizar cuerpos de solicitud JSON
app.use(bodyParser.json());

// Middleware para permitir CORS
app.use(cors({
  origin: 'https://babyshower.z13.web.core.windows.net', // Tu dominio de front-end
  methods: 'GET, POST, PUT, DELETE',
  allowedHeaders: 'Content-Type'
}));

// Ruta GET para obtener todos los regalos
app.get('/ms-event-producer/gift', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(JSON.parse(data));
  });
});

// Ruta PUT para actualizar un regalo por su ID
app.put('/ms-event-producer/gift/:id', (req, res) => {
  const { id } = req.params;
  const { name, isEdit } = req.body;

  lockfile.lock(DATA_FILE, { retries: 10 }, (err) => {
    if (err) {
      console.error('Error locking file:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        lockfile.unlock(DATA_FILE, err => {
          if (err) console.error('Error unlocking file:', err);
        });
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      let gifts = JSON.parse(data);
      const index = gifts.findIndex(gift => gift.id === parseInt(id));
      if (index === -1) {
        lockfile.unlock(DATA_FILE, err => {
          if (err) console.error('Error unlocking file:', err);
        });
        res.status(404).json({ error: 'Gift not found' });
        return;
      }

      // Actualiza el nombre y el estado de edición del regalo
      gifts[index].name = name;
      gifts[index].isEdit = isEdit;

      // Escribe los cambios en el archivo JSON
      fs.writeFile(DATA_FILE, JSON.stringify(gifts, null, 2), 'utf8', err => {
        if (err) {
          console.error('Error writing file:', err);
          lockfile.unlock(DATA_FILE, err => {
            if (err) console.error('Error unlocking file:', err);
          });
          res.status(500).json({ error: 'Internal server error' });
          return;
        }

        lockfile.unlock(DATA_FILE, err => {
          if (err) console.error('Error unlocking file:', err);
        });

        // Retorna el regalo actualizado como respuesta
        res.json(gifts[index]);
      });
    });
  });
});

// Configuración para escuchar el puerto
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});