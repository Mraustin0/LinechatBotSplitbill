import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../lib/api';

export default function Dashboard({ user, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get('/api/summary').then((r) => setSummary(r.data));
    api.get('/api/bills').then((r) => setBills(r.data));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#06C755', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>🧾 SplitBill</div>
          <div style={{ color: '#d4f5d4', fontSize: 13 }}>สวัสดี, {user.name}</div>
        </div>
        <button onClick={onLogout} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
          padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
        }}>ออกจากระบบ</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #eee' }}>
        {[['overview', '📊 ภาพรวม'], ['bills', '📋 บิลทั้งหมด']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '14px', border: 'none', background: 'none',
            cursor: 'pointer', fontWeight: tab === key ? 700 : 400,
            color: tab === key ? '#06C755' : '#888',
            borderBottom: tab === key ? '2px solid #06C755' : '2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        {tab === 'overview' && summary && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <Card label="จ่ายแล้ว" value={`฿${summary.totalPaid.toLocaleString()}`} color="#06C755" />
              <Card label="ค้างจ่าย" value={`฿${summary.totalUnpaid.toLocaleString()}`} color="#FF4444" />
            </div>

            {/* Bar chart */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #0001' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333' }}>ค่าใช้จ่ายรายเดือน</div>
              {summary.chart.length === 0 ? (
                <div style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>ยังไม่มีข้อมูล</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={summary.chart}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`฿${v}`, 'ยอด']} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {summary.chart.map((_, i) => (
                        <Cell key={i} fill="#06C755" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}

        {tab === 'bills' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bills.length === 0 && (
              <div style={{ color: '#aaa', textAlign: 'center', padding: 48 }}>ยังไม่มีบิล</div>
            )}
            {bills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px', boxShadow: '0 2px 8px #0001' }}>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 22 }}>{value}</div>
    </div>
  );
}

function BillCard({ bill }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#222' }}>{bill.title}</div>
          <div style={{ color: '#888', fontSize: 12 }}>{new Date(bill.createdAt).toLocaleDateString('th-TH')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: bill.paid ? '#06C755' : '#FF6B00' }}>฿{bill.myAmount}</div>
          <div style={{ fontSize: 11, color: bill.paid ? '#06C755' : '#FF6B00' }}>{bill.paid ? 'จ่ายแล้ว ✅' : 'ค้างจ่าย ⏳'}</div>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 16px', background: '#fafafa' }}>
          {bill.members.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span style={{ color: '#555' }}>{m.name}</span>
              <span style={{ color: m.paid ? '#06C755' : '#888' }}>฿{m.amount} {m.paid ? '✅' : '⏳'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
