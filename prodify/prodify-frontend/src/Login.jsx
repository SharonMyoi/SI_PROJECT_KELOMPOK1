import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import './App.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isError, setIsError] = useState(false) // State penanda error
  const [errorMsg, setErrorMsg] = useState('')  // State pesan error
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsError(false) // Reset error setiap kali tombol ditekan
    setErrorMsg('')

    try {
      const response = await axios.post('http://prodify.test/api/login', {
        username,
        password
      })
      
      localStorage.setItem('token', response.data.data.access_token)
      navigate('/dashboard')
      
    } catch (error) {
      setIsError(true) // Nyalakan mode error
      if (error.response && error.response.status === 401) {
        // Tangkap pesan "Username atau password salah" dari Laravel
        setErrorMsg(error.response.data.message)
      } else {
        setErrorMsg('Gagal terhubung ke server.')
      }
    }
  }

  const fillDemo = (role) => {
    setUsername(role + '1')
    setPassword('password')
    setIsError(false)
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="brand-badge">✨ Sistem Informasi Manajemen Produksi</div>
        <h1 className="brand-title">Kelola produksi <span>rajut handmade</span><br/>dengan rapi & real-time.</h1>
        <p className="brand-subtitle">Pusatkan pesanan, distribusikan task ke pengrajin di rumah masing-masing, pantau stok, dan hitung upah otomatis berdasarkan poin.</p>
        <div className="brand-footer">© 2026 Rief's Collection</div>
      </div>

      <div className="login-right">
        <div className="form-wrapper">
          <h2 className="form-title">Masuk ke akun Anda</h2>
          <p className="form-subtitle">Gunakan username & password yang diberikan admin.</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label className={isError ? 'text-error' : ''}>Username</label>
              <input 
                type="text" 
                placeholder="👤  Masukkan username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className={isError ? 'input-error' : ''}
                required 
              />
            </div>
            <div className="input-group">
              <label className={isError ? 'text-error' : ''}>Password</label>
              <input 
                type="password" 
                placeholder="🔒  ••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className={isError ? 'input-error' : ''}
                required 
              />
            </div>

            {/* Pesan Error dari Backend */}
            {isError && <p className="error-message">{errorMsg}</p>}

            <button type="submit" className="btn-submit">➔ Masuk</button>
            
            {/* Lupa Password Link */}
            <div className="forgot-password">
              <a href="#">Lupa password</a>
            </div>
          </form>

          <div className="demo-section">
            <p>AKUN DEMO (KLIK UNTUK ISI OTOMATIS)</p>
            <div className="demo-buttons">
              <button type="button" onClick={() => fillDemo('admin')}><strong>Admin</strong><br/><span>admin1</span></button>
              <button type="button" onClick={() => fillDemo('owner')}><strong>Owner</strong><br/><span>owner1</span></button>
              <button type="button" onClick={() => fillDemo('pengrajin')}><strong>Pengrajin</strong><br/><span>pengrajin1</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}