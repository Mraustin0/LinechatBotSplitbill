const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#f0faf4',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 40px',
        boxShadow: '0 4px 24px #0001', textAlign: 'center', maxWidth: 360, width: '100%',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 4 }}>SplitBill</h1>
        <p style={{ color: '#888', marginBottom: 32 }}>ดูประวัติและจัดการบิลของคุณ</p>
        <a href={`${API}/auth/line`} style={{
          display: 'block', background: '#06C755', color: '#fff',
          padding: '14px 24px', borderRadius: 8, textDecoration: 'none',
          fontWeight: 600, fontSize: 16,
        }}>
          เข้าสู่ระบบด้วย LINE
        </a>
      </div>
    </div>
  );
}
