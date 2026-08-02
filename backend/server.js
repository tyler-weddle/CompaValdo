require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Resend } = require('resend');

const app = express();

// 1. Helmet setup (relaxed for cross-origin API requests)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// 2. Clean CORS setup (handles preflight OPTIONS automatically)
app.use(cors({
  origin: true, // Automatically mirrors requesting origin
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

// Health Check Endpoint
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
    const SENDER_EMAIL = 'CompaValdo System <notifications@compavaldo.com>';

    // 1. Full detailed email body for Band Manager
    const managerEmailBody = 
      `Se ha recibido una nueva solicitud de contratacion:\n\n` +
      `Nombre del Cliente: ${name}\n` +
      `Telefono: ${phone}\n` +
      `Correo de Contacto: ${email}\n` +
      `Fecha del Evento: ${date}\n\n` +
      `Detalles del Evento:\n${details}`;

    const emailPromises = [
      resend.emails.send({
        from: SENDER_EMAIL,
        to: process.env.MANAGER_EMAIL,
        subject: `Nueva Solicitud de Contratacion: ${name}`,
        text: managerEmailBody
      })
    ];

    // 2. Short, clean string for Cricket Gateway (@sms.cricketwireless.net)
    if (process.env.CRICKET_PHONE) {
      // Ensure phone is strictly 10 digits without +1, dashes, or spaces
      const cleanPhone = process.env.CRICKET_PHONE.replace(/\D/g, '').slice(-10);
      
      // Concise single-line text to bypass carrier email-to-SMS spam blocks
      const smsText = `CompaValdo: Nueva reserva de ${name} para ${date}. Tel: ${phone}`;

      emailPromises.push(
        resend.emails.send({
          from: SENDER_EMAIL,
          to: `${cleanPhone}@sms.cricketwireless.net`,
          subject: 'Reserva',
          text: smsText
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