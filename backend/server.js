require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Resend } = require('resend');

const app = express();

// Middleware Configuration
app.use(helmet());

// 1. Explicit CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. 'https://compavaldo.vercel.app'
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy: Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Verify API Key existence
if (!process.env.RESEND_API_KEY) {
  console.error("FATAL ERROR: RESEND_API_KEY is not defined in environment variables.");
  process.exit(1);
}

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Health Check Endpoint (Useful for testing if Render is alive)
app.get('/', (req, res) => {
  res.status(200).send('CompaValdo Backend API is Live');
});

// Booking Endpoint
app.post('/api/booking', async (req, res) => {
  const { name, phone, email, date, details, smsOptIn } = req.body;
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

  // NOTIFICATION LOGIC WITH RESEND
  try {
    const emailPromises = [
      // 1. Email to Band Manager
      resend.emails.send({
        from: 'CompaValdo System <onboarding@resend.dev>',
        to: process.env.MANAGER_EMAIL,
        subject: `Nueva Solicitud de Contratacion: ${name}`,
        text: `Se ha recibido una nueva solicitud de contratacion:\n\n` +
              `Nombre del Cliente: ${name}\n` +
              `Telefono: ${phone}\n` +
              `Correo de Contacto: ${email}\n` +
              `Fecha del Evento: ${date}\n\n` +
              `Detalles del Evento:\n${details}`
      })
    ];

    // Optional Cricket SMS (Only attach if phone is present in env)
    if (process.env.CRICKET_PHONE) {
      emailPromises.push(
        resend.emails.send({
          from: 'CompaValdo System <onboarding@resend.dev>',
          to: `${process.env.CRICKET_PHONE}@mms.cricketwireless.net`,
          subject: 'Nueva Reserva',
          text: `Aviso CompaValdo: Nueva solicitud de ${name} para la fecha: ${date}. Tel: ${phone}`
        })
      );
    }

    const results = await Promise.all(emailPromises);
    console.log(`Booking processed successfully for: ${name}`, results);

    return res.status(200).json({ 
      success: true, 
      message: "Booking received perfectly." 
    });
  } catch (mailErr) {
    console.error("Resend notification delivery failed:", mailErr.response?.data || mailErr.message || mailErr);
    return res.status(500).json({
      success: false,
      message: "Server error sending notifications.",
      errorDetails: mailErr.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend validation server running on port ${PORT}`);
});