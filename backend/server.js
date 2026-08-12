require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');
const webpush = require('web-push');
const mysql = require('mysql2/promise');

const app = express();

// 1. Helmet setup
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// 2. Clean CORS setup
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// 3. Rate Limiter for Booking Endpoint (Max 5 requests per 15 minutes per IP)
const bookingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 booking requests per window
  message: {
    success: false,
    message: "Demasiadas solicitudes. Por favor intente de nuevo en 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Verify API Key existence
if (!process.env.RESEND_API_KEY) {
  console.error("FATAL ERROR: RESEND_API_KEY is not defined in environment variables.");
  process.exit(1);
}

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Configure Web-Push VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:notifications@compavaldo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// 4. Safe MariaDB Connection Pool Initialization
const getDbConfig = () => {
  const url = process.env.DATABASE_URL;
  if (url && !url.includes('USERNAME:PASSWORD')) {
    return url;
  }
  
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'compavaldo',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
};

const db = mysql.createPool(getDbConfig());

// Auto-create push_subscriptions table on startup
async function initDb() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(512) UNIQUE NOT NULL,
        subscription_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await db.query(createTableQuery);
    console.log('✅ MariaDB connected: push_subscriptions table ready.');
  } catch (err) {
    console.error('❌ MariaDB initialization failed:', err.message);
  }
}
initDb();

// Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).send('CompaValdo Backend API is Live with MariaDB');
});

// Admin Login Endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    return res.status(200).json({ success: true, message: "Authorized" });
  }
  return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
});

// Register Admin Device for Web Push (Persistent in MariaDB)
app.post('/api/admin/subscribe', async (req, res) => {
  const { subscription, password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: "Invalid subscription object." });
  }

  try {
    const endpoint = subscription.endpoint;
    const jsonString = JSON.stringify(subscription);

    const query = `
      INSERT INTO push_subscriptions (endpoint, subscription_json)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE subscription_json = VALUES(subscription_json);
    `;
    await db.execute(query, [endpoint, jsonString]);

    console.log('📱 Push subscription saved permanently in MariaDB.');
    return res.status(201).json({ success: true, message: "Dispositivo registrado en MariaDB." });
  } catch (err) {
    console.error('Database save error:', err);
    return res.status(500).json({ success: false, message: "Error al guardar suscripción en MariaDB." });
  }
});

// Booking Endpoint (Protected with Rate Limiter)
app.post('/api/booking', bookingRateLimiter, async (req, res) => {
  const { name, phone, email, date, hours, details, smsOptIn, website } = req.body;

  // 1. HONEYPOT CHECK (Invisible field filled by automated bots)
  if (website) {
    console.warn("⚠️ Spam bot caught by Honeypot trap. Drop request silently.");
    // Return fake success so bots do not retry or attempt to adapt
    return res.status(200).json({ success: true, message: "Booking received." });
  }

  const errors = {}; 

  // SERVER-SIDE VALIDATION
  if (!name || name.trim().length === 0) {
    errors.name = "El nombre es obligatorio.";
  }

  const phoneRegex = /^\+?[\d\s\-()]{7,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    errors.phone = "Número de teléfono inválido.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.email = "Correo electrónico inválido.";
  }

  if (!date || isNaN(Date.parse(date))) {
    errors.date = "Fecha inválida.";
  }

  if (!hours || isNaN(hours) || Number(hours) <= 0) {
    errors.hours = "Especifique las horas del evento.";
  }

  if (!details || details.trim().length === 0) {
    errors.details = "Los detalles son obligatorios.";
  }

  if (smsOptIn !== true) {
    errors.smsOptIn = "Debe aceptar los términos de privacidad.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Validation Error", 
      errors 
    });
  }

  // NOTIFICATION LOGIC
  try {
    const SENDER_EMAIL = 'CompaValdo System <notifications@compavaldo.com>';

    // 1. Detailed email for Manager via Resend
    const managerEmailBody = 
      `Se ha recibido una nueva solicitud de contratacion:\n\n` +
      `Nombre del Cliente: ${name}\n` +
      `Telefono: ${phone}\n` +
      `Correo de Contacto: ${email}\n` +
      `Fecha del Evento: ${date}\n` +
      `Duracion: ${hours} hora(s)\n\n` +
      `Detalles del Evento:\n${details}`;

    const promises = [
      resend.emails.send({
        from: SENDER_EMAIL,
        to: process.env.MANAGER_EMAIL,
        subject: `Nueva Solicitud de Contratacion: ${name}`,
        text: managerEmailBody
      })
    ];

    // 2. Lock-Screen Web Push Notifications via MariaDB Subscriptions
    if (process.env.VAPID_PUBLIC_KEY) {
      const [rows] = await db.query('SELECT endpoint, subscription_json FROM push_subscriptions');

      if (rows.length > 0) {
        const pushPayload = JSON.stringify({
          title: "Nueva Reserva CompaValdo",
          body: `${name} - ${date} (${hours} hrs). Tel: ${phone}`,
          url: "/"
        });

        rows.forEach(row => {
          const subscription = JSON.parse(row.subscription_json);
          promises.push(
            webpush.sendNotification(subscription, pushPayload).catch(async (err) => {
              console.error("Failed to send push notification to device:", row.endpoint, err.statusCode);
              if (err.statusCode === 410 || err.statusCode === 404) {
                await db.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [row.endpoint]);
              }
            })
          );
        });
      }
    }

    const results = await Promise.all(promises);
    console.log(`Booking processed successfully for: ${name}`, results);

    return res.status(200).json({ 
      success: true, 
      message: "Booking received perfectly." 
    });
  } catch (err) {
    console.error("Notification delivery failed:", err.message || err);
    return res.status(500).json({
      success: false,
      message: "Server error sending notifications.",
      errorDetails: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend validation server running on port ${PORT}`);
});