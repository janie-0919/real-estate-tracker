import { useState } from 'react';
import type { AlertCondition } from '@/types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/format';
import styles from './AlertsPage.module.scss';

const DEMO_ALERTS: AlertCondition[] = [
  {
    id: 'A001',
    name: '강남 소형 급매',
    districts: ['서울 강남구'],
    dealType: 'sale',
    priceMax: 90000,
    areaMin: 59,
    areaMax: 65,
    floorMin: 3,
    deviationMax: 2,
    channels: ['web', 'email'],
    isActive: true,
    createdAt: '2024-01-10',
  },
  {
    id: 'A002',
    name: '마포 전세',
    districts: ['서울 마포구'],
    dealType: 'lease',
    priceMax: 60000,
    channels: ['web'],
    isActive: false,
    createdAt: '2024-01-05',
  },
];

const DISTRICTS = [
  '서울 서초구', '서울 강남구', '서울 마포구', '서울 성동구',
  '서울 용산구', '서울 송파구', '서울 영등포구', '서울 노원구',
];

const defaultForm: Omit<AlertCondition, 'id' | 'createdAt'> = {
  name: '',
  districts: [],
  dealType: 'sale',
  channels: ['web'],
  isActive: true,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertCondition[]>(DEMO_ALERTS);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });

  const toggleActive = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlert: AlertCondition = {
      ...form,
      id: `A${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAlerts(prev => [...prev, newAlert]);
    setIsCreating(false);
    setForm({ ...defaultForm });
  };

  const toggleDistrict = (d: string) => {
    setForm(prev => ({
      ...prev,
      districts: prev.districts.includes(d)
        ? prev.districts.filter(x => x !== d)
        : [...prev.districts, d],
    }));
  };

  const toggleChannel = (ch: 'web' | 'email') => {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(x => x !== ch)
        : [...prev.channels, ch],
    }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>알림 설정</h1>
          <p className={styles.sub}>원하는 조건의 매물이 등록되면 즉시 알림을 받으세요</p>
        </div>
        {!isCreating && (
          <Button variant="primary" onClick={() => setIsCreating(true)}
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            알림 추가
          </Button>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>새 알림 조건 만들기</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>알림 이름 *</label>
              <input
                className={styles.input}
                type="text"
                placeholder="예: 강남 급매 모니터링"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>관심 지역 *</label>
              <div className={styles.chipGroup}>
                {DISTRICTS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.chip} ${form.districts.includes(d) ? styles.chipActive : ''}`}
                    onClick={() => toggleDistrict(d)}
                  >
                    {d.replace('서울 ', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>거래 유형</label>
                <select
                  className={styles.select}
                  value={form.dealType}
                  onChange={e => setForm(p => ({ ...p, dealType: e.target.value as AlertCondition['dealType'] }))}
                >
                  <option value="all">전체</option>
                  <option value="sale">매매</option>
                  <option value="lease">전세</option>
                  <option value="monthly">월세</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>최대 가격 (만원)</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="예: 90000"
                  value={form.priceMax ?? ''}
                  onChange={e => setForm(p => ({ ...p, priceMax: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>면적 (㎡)</label>
                <div className={styles.rangeRow}>
                  <input
                    className={styles.input}
                    type="number"
                    placeholder="최소"
                    value={form.areaMin ?? ''}
                    onChange={e => setForm(p => ({ ...p, areaMin: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                  <span className={styles.sep}>~</span>
                  <input
                    className={styles.input}
                    type="number"
                    placeholder="최대"
                    value={form.areaMax ?? ''}
                    onChange={e => setForm(p => ({ ...p, areaMax: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>최소 층수</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="예: 3"
                  value={form.floorMin ?? ''}
                  onChange={e => setForm(p => ({ ...p, floorMin: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>최대 괴리율 (%)</label>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="예: 3"
                  value={form.deviationMax ?? ''}
                  onChange={e => setForm(p => ({ ...p, deviationMax: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>알림 채널</label>
              <div className={styles.channelGroup}>
                {(['web', 'email'] as const).map(ch => (
                  <label key={ch} className={styles.channelLabel}>
                    <input
                      type="checkbox"
                      checked={form.channels.includes(ch)}
                      onChange={() => toggleChannel(ch)}
                    />
                    {ch === 'web' ? '🌐 웹 알림' : '📧 이메일'}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" variant="primary">저장</Button>
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>취소</Button>
            </div>
          </form>
        </div>
      )}

      {/* Alert list */}
      <div className={styles.alertList}>
        {alerts.length === 0 ? (
          <div className={styles.empty}>
            <p>설정된 알림이 없습니다.</p>
            <p className={styles.emptySub}>알림을 추가하면 조건에 맞는 매물이 등록될 때 즉시 알림을 받을 수 있습니다.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className={`${styles.alertCard} ${!alert.isActive ? styles.inactive : ''}`}>
              <div className={styles.alertMain}>
                <div className={styles.alertHeader}>
                  <h3 className={styles.alertName}>{alert.name}</h3>
                  <Badge variant={alert.isActive ? 'success' : 'default'}>
                    {alert.isActive ? '활성' : '비활성'}
                  </Badge>
                </div>

                <div className={styles.alertConditions}>
                  {alert.districts.map(d => <Badge key={d} variant="info" size="sm">{d}</Badge>)}
                  {alert.dealType !== 'all' && (
                    <Badge variant="primary" size="sm">
                      {alert.dealType === 'sale' ? '매매' : alert.dealType === 'lease' ? '전세' : '월세'}
                    </Badge>
                  )}
                  {alert.priceMax && <Badge variant="default" size="sm">~{(alert.priceMax / 10000).toFixed(0)}억</Badge>}
                  {alert.areaMin && <Badge variant="default" size="sm">{alert.areaMin}㎡ 이상</Badge>}
                  {alert.floorMin && <Badge variant="default" size="sm">{alert.floorMin}층 이상</Badge>}
                  {alert.deviationMax !== undefined && <Badge variant="warning" size="sm">괴리율 {alert.deviationMax}% 이하</Badge>}
                </div>

                <div className={styles.alertMeta}>
                  <span>채널: {alert.channels.map(c => c === 'web' ? '웹' : '이메일').join(', ')}</span>
                  <span>생성: {formatDate(alert.createdAt)}</span>
                </div>
              </div>

              <div className={styles.alertActions}>
                <button
                  className={styles.toggleBtn}
                  onClick={() => toggleActive(alert.id)}
                  title={alert.isActive ? '비활성화' : '활성화'}
                >
                  {alert.isActive ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="10" rx="5" fill="#16a34a" stroke="none" />
                      <circle cx="16" cy="12" r="3.5" fill="white" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="7" width="20" height="10" rx="5" fill="#d1d5db" />
                      <circle cx="8" cy="12" r="3.5" fill="white" />
                    </svg>
                  )}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteAlert(alert.id)}
                  title="삭제"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
