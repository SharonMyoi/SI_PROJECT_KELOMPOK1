import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/'); return; }

    const fetchUser = async () => {
      try {
        const response = await axios.get('http://prodify.test/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(response.data.data)
      } catch (error) {
        localStorage.removeItem('token')
        navigate('/')
      }
    }
    fetchUser()
  }, [navigate])

  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    try {
      await axios.post('http://prodify.test/api/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error(error)
    } finally {
      localStorage.removeItem('token')
      navigate('/')
    }
  }

  if (!user) return <div className="loading">Memuat sistem...</div>

  return (
    <div className="dashboard-wrapper">
      {/* SIDEBAR KIRI */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">
             <i className="fa-solid fa-boxes-stacked"></i>
             <span>PRODIFY</span>
          </div>
        </div>

        <div className="user-profile-side">
           <img src={`https://ui-avatars.com/api/?name=${user.name}&background=facc15&color=fff`} alt="avatar" />
           <div className="user-info">
              <p className="u-name">{user.name}</p>
              <p className="u-role">{user.role.toUpperCase()}</p>
           </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item active">
            <i className="fa-solid fa-house"></i> Dashboard
          </div>
          {/* Menu Laporan dan Notifikasi sudah dihapus sementara */}
        </nav>

        <button className="btn-logout-side" onClick={handleLogout}>
          <i className="fa-solid fa-arrow-right-from-bracket"></i> Keluar
        </button>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="main-content">
        <header className="content-header">
          <div>
            <h1>Dashboard Owner</h1>
            <p>Pantau semua aktivitas produksi secara real-time.</p>
          </div>
        </header>

        <section className="welcome-section">
           <div className="welcome-card">
              <div className="welcome-text">
                <h2>Selamat Datang, <span>{user.name}</span>! 👋</h2>
                <p>Sistem otentikasi PRODIFY sudah aktif. Token keamanan kamu valid sebagai <strong>{user.role}</strong>.</p>
              </div>
              <div className="welcome-img">
                 <i className="fa-solid fa-chart-line"></i>
              </div>
           </div>
        </section>
      </main>
    </div>
  )
}