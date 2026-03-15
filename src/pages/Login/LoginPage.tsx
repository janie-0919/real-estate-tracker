import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import styles from './LoginPage.module.scss';

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#2563EB" />
            <path d="M6 22L16 10L26 22H6Z" fill="white" opacity="0.9" />
            <rect x="12" y="16" width="8" height="6" fill="#1E40AF" />
          </svg>
          <span>부동산 트래커</span>
        </Link>

        <div className={styles.card}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${tab === 'login' ? styles.active : ''}`}
              onClick={() => setTab('login')}
            >
              로그인
            </button>
            <button
              className={`${styles.tabBtn} ${tab === 'signup' ? styles.active : ''}`}
              onClick={() => setTab('signup')}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {tab === 'signup' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>이름</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>이메일</label>
              <input
                className={styles.input}
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>비밀번호</label>
              <input
                className={styles.input}
                type="password"
                placeholder={tab === 'login' ? '비밀번호' : '8자 이상 입력'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={tab === 'signup' ? 8 : undefined}
              />
            </div>

            {tab === 'login' && (
              <div className={styles.forgotRow}>
                <a href="#" className={styles.forgotLink}>비밀번호 찾기</a>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
              {tab === 'login' ? '로그인' : '회원가입'}
            </Button>
          </form>

          <div className={styles.divider}>
            <span>또는</span>
          </div>

          <div className={styles.socialBtns}>
            <button className={styles.socialBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0112 4.9c1.83 0 3.47.66 4.74 1.75L20.1 3.3A12 12 0 0012 0C7.37 0 3.39 2.61 1.36 6.44l3.91 3.32z" />
                <path fill="#34A853" d="M16.04 19.26A7.1 7.1 0 0112 20.1c-2.95 0-5.49-1.79-6.7-4.37l-3.93 3.03C3.43 21.42 7.39 24 12 24c3.17 0 6.12-1.15 8.35-3.04l-4.31-1.7z" />
                <path fill="#FBBC05" d="M19.5 12.22c0-.7-.07-1.38-.18-2.03H12v3.84h4.21a3.6 3.6 0 01-1.57 2.36l4.3 1.7c2.5-2.3 3.93-5.69 3.56-5.87z" />
                <path fill="#4285F4" d="M5.3 14.13A7.16 7.16 0 014.9 12c0-.74.12-1.46.33-2.14L1.36 6.44A11.94 11.94 0 000 12c0 1.96.47 3.8 1.31 5.42l3.99-3.29z" />
              </svg>
              Google로 계속하기
            </button>
            <button className={styles.socialBtn} style={{ background: '#fee500', color: '#111' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#111">
                <path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.89 1.91 5.44 4.79 6.94l-1.22 4.44 4.39-2.89c.65.09 1.32.14 2.04.14 5.52 0 10-3.69 10-8.25C22 6.69 17.52 3 12 3z" />
              </svg>
              카카오로 계속하기
            </button>
          </div>
        </div>

        <p className={styles.terms}>
          계속하면 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
