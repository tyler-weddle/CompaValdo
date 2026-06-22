import { useState } from 'react';
import { 
  FaInstagram, 
  FaTwitter, 
  FaYoutube, 
  FaSpotify, 
  FaApple, 
  FaSoundcloud 
} from 'react-icons/fa';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', date: '', details: '' });
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState('');

  const socials = [
    { icon: <FaInstagram />, url: 'https://instagram.com', label: 'Instagram' },
    { icon: <FaTwitter />, url: 'https://twitter.com', label: 'Twitter' },
    { icon: <FaYoutube />, url: 'https://youtube.com', label: 'YouTube' },
    { icon: <FaSpotify />, url: 'https://spotify.com', label: 'Spotify' },
    { icon: <FaApple />, url: 'https://music.apple.com', label: 'Apple Music' },
    { icon: <FaSoundcloud />, url: 'https://soundcloud.com', label: 'SoundCloud' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!optIn) {
      setStatus('Por favor, acepte los términos de privacidad.');
      return;
    }
    setStatus('Enviando...');

    try {
      const response = await fetch('http://localhost:5000/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, smsOptIn: optIn }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus('¡Reserva enviada con éxito!');
        setFormData({ name: '', phone: '', email: '', date: '', details: '' });
        setOptIn(false);
        setTimeout(() => { setIsModalOpen(false); setStatus(''); }, 2000); // Close on success
      } else {
        setStatus('Error al enviar. Intente de nuevo.');
      }
    } catch (error) {
      setStatus('No se pudo conectar al servidor.');
    }
  };

  return (
    <div className="site-wrapper">
      {/* Visual Background */}
      <div className="placeholder-bg-gradient"></div>
      <div className="video-tint"></div>

      {/* Full-Width Header */}
      <header className="main-banner">
        <div className="logo-area">
          <h1>COMPAVALDO</h1>
        </div>
        <nav className="socials-nav">
          {socials.map((social, idx) => (
            <a 
              key={idx} 
              href={social.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-icon-link"
              aria-label={social.label}
            >
              {social.icon}
            </a>
          ))}
        </nav>
      </header>

      {/* Main Landing View (Full Screen Layout) */}
      <main className="content-container">
        <div className="hero-cta-box">
          <p className="artist-tagline">Música Norteño</p>
          <button className="gold-button trigger-btn" onClick={() => setIsModalOpen(true)}>
            RESERVAR FECHA / CONTRATACIONES
          </button>
        </div>
      </main>

      {/* Booking Form Modal Overlay */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="form-card modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
            
            <h2>CONTRATACIONES</h2>
            <p className="subtitle">Completa el formulario para verificar disponibilidad de fechas.</p>
            
            <form onSubmit={handleSubmit} className="booking-form">
              <input 
                type="text" 
                placeholder="Nombre Completo" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                required 
              />
              <input 
                type="tel" 
                placeholder="Teléfono / WhatsApp" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                required 
              />
              <input 
                type="email" 
                placeholder="Correo Electrónico" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                required 
              />
              <input 
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                required 
              />
              <textarea 
                placeholder="Detalles del evento..." 
                value={formData.details} 
                onChange={(e) => setFormData({...formData, details: e.target.value})} 
                required 
              />

              <label className="compliance-checkbox">
                <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                <span>Acepto recibir notificaciones para coordinar este evento.</span>
              </label>

              <button type="submit" className="gold-button">ENVIAR SOLICITUD</button>
            </form>
            {status && <p className="status-banner">{status}</p>}
          </div>
        </div>
      )}

      {/* Full-Width Footer */}
      <footer className="legal-footer">
        <p>© {new Date().getFullYear()} CompaValdo. Todos los derechos reservados.</p>
        <div className="legal-links">
          <a href="/privacy">Política de Privacidad</a>
          <span className="divider">|</span>
          <a href="/terms">Términos y Condiciones</a>
        </div>
      </footer>
    </div>
  );
}

export default App;