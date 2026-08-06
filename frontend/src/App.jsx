import { useState, useEffect, useRef } from 'react';
import { 
  FaInstagram, FaYoutube, FaSpotify, FaApple, FaPlay, FaPause, FaTimes 
} from 'react-icons/fa';
import './App.css';

// Helper to convert base64 VAPID string into Uint8Array buffer for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', date: '', hours: '', details: '' });
  const [optIn, setOptIn] = useState(false);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const videoRef = useRef(null);

  // Safe SPA admin route state
  const [isAdminPath, setIsAdminPath] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminStatus, setAdminStatus] = useState('');

  // Audio Showcase Player state
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  // Featured song details
  const songData = {
    title: "Estilo CompaValdo",
    artist: "El Compa Valdo",
    src: "/song.mp3"
  };

  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      setIsAdminPath(true);
    }

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

  const getBaseUrl = () => {
    let baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    return baseUrl.replace(/\/+$/, '');
  };

  // Audio Player Handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log("Audio playback error:", err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setStatus('Enviando...');
    
    try {
      const response = await fetch(`${getBaseUrl()}/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, smsOptIn: optIn }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('¡Reserva enviada!');
        setFormData({ name: '', phone: '', email: '', date: '', hours: '', details: '' });
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

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminStatus('Verificando...');

    try {
      const res = await fetch(`${getBaseUrl()}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      });
      const data = await res.json();

      if (data.success) {
        setIsAdminLoggedIn(true);
        setAdminStatus('Sesión iniciada.');
      } else {
        setAdminStatus('Contraseña incorrecta.');
      }
    } catch (err) {
      setAdminStatus('Error de conexión.');
    }
  };

  const handleEnablePush = async () => {
    setAdminStatus('Solicitando permisos...');

    const rawVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!rawVapidKey) {
      alert('Error: VITE_VAPID_PUBLIC_KEY no está configurada en Vercel.');
      setAdminStatus('Error: VAPID Key no configurada.');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Tu navegador no soporta Notificaciones Push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setAdminStatus('Permiso denegado por el usuario.');
        return;
      }

      setAdminStatus('Registrando Service Worker...');
      const register = await navigator.serviceWorker.register('/sw.js');

      const convertedVapidKey = urlBase64ToUint8Array(rawVapidKey);

      setAdminStatus('Suscrito a PushManager...');
      const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      setAdminStatus('Guardando en el servidor...');
      const response = await fetch(`${getBaseUrl()}/api/admin/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, password: adminPass })
      });

      const resData = await response.json();

      if (resData.success) {
        setAdminStatus('¡Notificaciones activadas con éxito!');
      } else {
        setAdminStatus(`Error del servidor: ${resData.message}`);
      }
    } catch (err) {
      console.error('Error registrando Push:', err);
      setAdminStatus(`Error: ${err.name} - ${err.message}`);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setStatus('');
  };

  // Dedicated Admin Panel View
  if (isAdminPath) {
    return (
      <div className="admin-wrapper">
        <div className="admin-card">
          <h2>CompaValdo Admin</h2>

          {!isAdminLoggedIn ? (
            <form onSubmit={handleAdminLogin} className="admin-form">
              <input 
                type="password" 
                placeholder="Contraseña Admin" 
                value={adminPass} 
                onChange={(e) => setAdminPass(e.target.value)}
                className="admin-input"
              />
              <button type="submit" className="gold-button">
                ENTRAR
              </button>
            </form>
          ) : (
            <div className="admin-form">
              <p style={{ color: '#f5f5f5', marginBottom: '10px' }}>✅ Sesión activa.</p>
              <button onClick={handleEnablePush} className="gold-button">
                ACTIVAR NOTIFICACIONES
              </button>
            </div>
          )}

          {adminStatus && <p className="admin-status-msg">{adminStatus}</p>}
        </div>
      </div>
    );
  }

  // Main Public Site
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
          
          {/* CENTERED NEW MUSIC TRIGGER BUTTON */}
          <button 
            className={`music-center-btn ${isPlaying ? 'pulse' : ''}`}
            onClick={() => setIsMusicOpen(!isMusicOpen)}
          >
            {isMusicOpen && <FaTimes />}
            <span>{isMusicOpen ? 'OCULTAR MÚSICA' : 'NUEVA MÚSICA'}</span>
          </button>

          {/* EXPANDABLE CENTER MUSIC WIDGET */}
          {isMusicOpen && (
            <div className="center-music-card">
              <audio 
                ref={audioRef} 
                src={songData.src} 
                onTimeUpdate={handleTimeUpdate} 
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="music-card-header">
                <div className="music-title-info">
                  <p className="song-title">{songData.title}</p>
                  <p className="artist-name">{songData.artist}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className={`eq-bars ${isPlaying ? 'playing' : ''}`}>
                    <div className="eq-bar"></div>
                    <div className="eq-bar"></div>
                    <div className="eq-bar"></div>
                  </div>
                  <span className="music-tag">Estreno</span>
                </div>
              </div>

              <div className="player-controls-row">
                <button className="play-pause-btn" onClick={togglePlay} aria-label="Play / Pause">
                  {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: '2px' }} />}
                </button>

                <div className="scrubber-container">
                  <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek} 
                    className="scrubber-slider" 
                  />
                  <div className="time-display">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN BOOKING CTA */}
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

              {/* BOUNDED DATE FIELD WITH EXPLICIT LABEL */}
              <div className="form-group">
                {errors.date && <p className="field-error-msg">{errors.date}</p>}
                <div className="date-input-wrapper">
                  <span className="input-label">Fecha del evento</span>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})} 
                  />
                </div>
              </div>

              {/* HOURS FIELD (NO ARROW WHEELS, NUMERIC KEYPAD ON MOBILE) */}
              <div className="form-group">
                {errors.hours && <p className="field-error-msg">{errors.hours}</p>}
                <input 
                  type="number" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1" 
                  max="24" 
                  placeholder="Duración del evento (Horas)" 
                  value={formData.hours} 
                  onChange={(e) => setFormData({...formData, hours: e.target.value})} 
                />
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