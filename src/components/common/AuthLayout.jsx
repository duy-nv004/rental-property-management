import { Building2, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  'Quản lý tòa nhà, phòng và hợp đồng tập trung',
  'Hóa đơn tự động kèm mã VietQR',
  'Thông báo tức thời qua Telegram',
];

// Khung chung cho Đăng nhập / Đăng ký: banner trái (desktop) + form phải
const AuthLayout = ({ heading, description, title, subtitle, children }) => (
  <div className="auth-page">
    <aside className="auth-banner">
      <div className="auth-brand">
        <div className="app-brand-mark" style={{ overflow: 'hidden', padding: 0 }}>
          <img src="/favicon.png" alt="HomeSync Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div className="auth-brand-name">HomeSync</div>
          <div className="auth-brand-sub">Hệ thống quản lý phòng trọ</div>
        </div>
      </div>

      <div>
        <h1 className="auth-heading">{heading}</h1>
        <p className="auth-desc">{description}</p>
        <ul className="auth-features">
          {FEATURES.map((f) => (
            <li key={f}><CheckCircle2 size={18} aria-hidden="true" /> {f}</li>
          ))}
        </ul>
      </div>

      <div className="auth-footer">
        <span>© 2026 HomeSync</span>
        <span>Điều khoản · Bảo mật</span>
      </div>
    </aside>

    <main className="auth-form-col">
      <div className="auth-form-box">
        <div className="auth-mobile-brand">
          <div className="app-brand-mark" style={{ overflow: 'hidden', padding: 0 }}>
            <img src="/favicon.png" alt="HomeSync Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span className="app-brand-name">HomeSync</span>
        </div>
        <h2 className="auth-title">{title}</h2>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </div>
    </main>
  </div>
);

export default AuthLayout;
