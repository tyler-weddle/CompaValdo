import { useState, useEffect, useRef } from 'react';
import { 
  FaInstagram, FaYoutube, FaSpotify, FaApple 
} from 'react-icons/fa';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', date: '', details: '' });
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState('');
  
  // Track backend field-specific validation messages
  const [errors, setErrors] = useState({});
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
    }
  }, []);

  const socials = [
    { icon: <FaInstagram />, url: 'https://www.instagram.com/elcompavaldo_/', label: 'Instagram' },
    { icon: <FaYoutube />, url: 'https://www.youtube.com/channel/UCV2eQc39UWBwveKNQuIS3ZA', label: 'YouTube' },
    { icon: <FaSpotify />, url: 'https://open.spotify.com/artist/5ogKBUh9wN5lOSCiKjeSwd', label: 'Spotify' },
    { icon: <FaApple />, url: 'https://music.apple.com/us/artist/el-compa-valdo/1722832085', label: 'Apple Music' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Wipe out previous red warnings on new submit
    setStatus('Enviando...');
    
    // Dynamic API URL: Uses Vercel environment variable if set, defaults to localhost for local dev
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, smsOptIn: optIn }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('¡Reserva enviada!');
        setFormData({ name: '', phone: '', email: '', date: '', details: '' });
        setOptIn(false);
        setTimeout(() => { setIsModalOpen(false); setStatus(''); }, 2000);
      } else {
        setStatus('');
        if (data.errors) {
          setErrors(data.errors); 
        } else {
          setStatus('Error.');
        }
      }
    } catch (err) { 
      console.error('Fetch error:', err);
      setStatus('Error de conexión.'); 
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setStatus('');
  };

  return (
    <div className="site-wrapper">
      <video autoPlay loop muted playsInline preload="auto" className="hero-video" ref={videoRef}>
        <source src="/video3.mp4" type="video/mp4" />
      </video>
      <div className="video-tint"></div>

      <header className="main-banner">
        <div className="logo-area">
          <img src="/logo.png" alt="CompaValdo Logo" className="brand-logo" />
        </div> 
        <nav className="socials-nav">
          {socials.map((s, idx) => (
            <a key={idx} href={s.url} className="social-icon-link" aria-label={s.label}>{s.icon}</a>
          ))}
        </nav>
      </header>

      <main className="content-container">
        <div className="hero-cta-box">
          <button className="gold-button trigger-btn" onClick={() => setIsModalOpen(true)}>
            RESERVAR FECHA
          </button>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="form-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={handleCloseModal}>×</button>
            <h2>CONTRATACIONES</h2>
            
            <form onSubmit={handleSubmit} className="booking-form" noValidate>
              
              <div className="form-group">
                {errors.name && <p className="field-error-msg">{errors.name}</p>}
                <input type="text" placeholder="Nombre" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="form-group">
                {errors.phone && <p className="field-error-msg">{errors.phone}</p>}
                <input type="tel" placeholder="Teléfono" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div className="form-group">
                {errors.email && <p className="field-error-msg">{errors.email}</p>}
                <input type="email" placeholder="Correo" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="form-group">
                {errors.date && <p className="field-error-msg">{errors.date}</p>}
                <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>

              <div className="form-group">
                {errors.details && <p className="field-error-msg">{errors.details}</p>}
                <textarea placeholder="Detalles..." value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} />
              </div>

              <div className="form-group">
                {errors.smsOptIn && <p className="field-error-msg">{errors.smsOptIn}</p>}
                <label className="compliance-checkbox">
                  <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                  <span>Acepto los términos de privacidad.</span>
                </label>
              </div>

              <button type="submit" className="gold-button">ENVIAR</button>
            </form>
            {status && <p className="status-banner">{status}</p>}
          </div>
        </div>
      )}

      <footer className="legal-footer">
        <p>© {new Date().getFullYear()} CompaValdo.</p>
        <div className="legal-links">
          <a href="/privacy">Privacidad</a> | <a href="/terms">Términos</a>
        </div>
      </footer>
    </div>
  );
}

export default App;