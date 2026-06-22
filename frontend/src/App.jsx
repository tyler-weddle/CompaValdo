import { useState, useEffect, useRef } from 'react';
import { 
  FaInstagram, FaTwitter, FaYoutube, FaSpotify, FaApple, FaSoundcloud 
} from 'react-icons/fa';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', date: '', details: '' });
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
    }
  }, []);

  const socials = [
    { icon: <FaInstagram />, url: 'https://instagram.com', label: 'Instagram' },
    { icon: <FaTwitter />, url: 'https://twitter.com', label: 'Twitter' },
    { icon: <FaYoutube />, url: 'https://youtube.com', label: 'YouTube' },
    { icon: <FaSpotify />, url: '#', label: 'Spotify' },
    { icon: <FaApple />, url: '#', label: 'Apple Music' },
    { icon: <FaSoundcloud />, url: '#', label: 'SoundCloud' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!optIn) { setStatus('Acepte los términos.'); return; }
    setStatus('Enviando...');
    try {
      const response = await fetch('http://localhost:5000/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, smsOptIn: optIn }),
      });
      const data = await response.json();
      if (data.success) {
        setStatus('¡Reserva enviada!');
        setFormData({ name: '', phone: '', email: '', date: '', details: '' });
        setTimeout(() => { setIsModalOpen(false); setStatus(''); }, 2000);
      } else { setStatus('Error.'); }
    } catch { setStatus('Error de conexión.'); }
  };

  return (
    <div className="site-wrapper">
      <video autoPlay loop muted playsInline preload="auto" className="hero-video">
        <source src="/video2.mp4" type="video/mp4" />
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
          <p className="artist-tagline">MÚSICA NORTEÑO</p>
          <button className="gold-button trigger-btn" onClick={() => setIsModalOpen(true)}>
            RESERVAR FECHA / CONTRATACIONES
          </button>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="form-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>CONTRATACIONES</h2>
            <form onSubmit={handleSubmit} className="booking-form">
              <input type="text" placeholder="Nombre" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              <input type="tel" placeholder="Teléfono" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
              <input type="email" placeholder="Correo" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
              <textarea placeholder="Detalles..." value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} required />
              <label className="compliance-checkbox">
                <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                <span>Acepto los términos de privacidad.</span>
              </label>
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