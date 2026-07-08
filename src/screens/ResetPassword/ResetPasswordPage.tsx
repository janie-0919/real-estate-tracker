'use client';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@/compat/router';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import styles from '../Login/LoginPage.module.scss';

type State = 'waiting' | 'ready' | 'done';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<State>('waiting');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase가 URL 해시(#access_token=...&type=recovery)를 자동 처리하고
    // PASSWORD_RECOVERY 이벤트를 발생시킴
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setPageState('done');
    }
  };

  if (pageState === 'waiting') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card} style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              비밀번호 재설정 링크를 확인하는 중...
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              이메일의 링크를 통해 접속했는지 확인해 주세요.
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/login" style={{ color: '#2563eb', fontSize: '0.9rem' }}>로그인 페이지로 돌아가기</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            <svg width="36" height="36" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="6" fill="#2563EB" />
              <path d="M6 22L16 10L26 22H6Z" fill="white" opacity="0.9" />
              <rect x="12" y="16" width="8" height="6" fill="#1E40AF" />
            </svg>
            <span>부동산 트래커</span>
          </Link>
          <div className={styles.card}>
            <div className={styles.successMsg} style={{ marginBottom: 0 }}>
              비밀번호가 성공적으로 변경되었습니다.
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <Button variant="primary" size="lg" onClick={() => navigate('/')}>
                홈으로 이동
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#2563EB" />
            <path d="M6 22L16 10L26 22H6Z" fill="white" opacity="0.9" />
            <rect x="12" y="16" width="8" height="6" fill="#1E40AF" />
          </svg>
          <span>부동산 트래커</span>
        </Link>

        <div className={styles.card}>
          <div className={styles.forgotHeader}>
            <h2 className={styles.forgotTitle}>새 비밀번호 설정</h2>
            <p className={styles.forgotDesc}>새로 사용할 비밀번호를 입력해 주세요.</p>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>새 비밀번호</label>
              <input
                className={styles.input}
                type="password"
                placeholder="8자 이상 입력"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>비밀번호 확인</label>
              <input
                className={styles.input}
                type="password"
                placeholder="동일한 비밀번호 재입력"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
              비밀번호 변경
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
