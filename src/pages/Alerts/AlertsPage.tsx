import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AlertCondition } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/format';
import { SEOUL_DISTRICT_NAMES } from '@/data/districts';
import styles from './AlertsPage.module.scss';
import { useAlerts } from '@/hooks/useAlerts';

const DISTRICTS = SEOUL_DISTRICT_NAMES;

const defaultForm: Omit<AlertCondition, 'id' | 'createdAt'> = {
  name: '',
  districts: [],
  dealType: 'sale',
  channels: ['email'],
  isActive: true,
  priceMax: 100000,
  areaMin: 33,
  areaMax: 165,
  floorMin: 1,
};

function manwonToLabel(v: number): string {
  if (v === 0) return '제한 없음';
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

interface SliderFieldProps {
  label: string;
  unit?: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  displayFn?: (v: number) => string;
  onChange: (v: number | undefined) => void;
}

function SliderField({ label, unit, value, min, max, step, displayFn, onChange }: SliderFieldProps) {
  const current = value ?? min;
  const display = current === min
    ? '제한 없음'
    : displayFn
      ? displayFn(current)
      : `${current.toLocaleString()}${unit ?? ''}`;

  const pct = ((current - min) / (max - min)) * 100;

  return (
    <div className={styles.sliderField}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValueBadge}>{display}</span>
      </div>
      <div className={styles.sliderTrack}>
        <div className={styles.sliderFill} style={{ width: `${pct}%` }} />
        <input
          type="range"
          className={styles.slider}
          min={min}
          max={max}
          step={step}
          value={current}
          onChange={e => {
            const n = Number(e.target.value);
            onChange(n === min ? undefined : n);
          }}
        />
      </div>
      <div className={styles.sliderTicks}>
        <span>{displayFn ? displayFn(min) : `${min}${unit ?? ''}`}</span>
        <span>{displayFn ? displayFn(Math.round((min + max) / 2)) : `${Math.round((min + max) / 2)}${unit ?? ''}`}</span>
        <span>{displayFn ? displayFn(max) : `${max}${unit ?? ''}`}</span>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });

  const { alerts, isLoading, addAlert, toggleAlert, deleteAlert } = useAlerts();

  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAlert({ ...form });
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>알림 설정</h1>
          <p className={styles.sub}>원하는 조건의 매물이 등록되면 즉시 알림을 받으세요</p>
        </div>
        {!isCreating && (
          <Button variant="primary" onClick={() => user ? setIsCreating(true) : navigate(`/login?from=${encodeURIComponent(location.pathname)}`)}
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

      {!user && (
        <div className={styles.loginBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>로그인하면 알림 설정이 <strong>저장되고 이메일 알림</strong>을 받을 수 있습니다.</span>
          <Link to={`/login?from=${encodeURIComponent(location.pathname)}`} className={styles.loginBannerLink}>
            로그인하기
          </Link>
        </div>
      )}

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

            {/* ── 슬라이더 ── */}
            <SliderField
              label="최대 가격"
              value={form.priceMax}
              min={0}
              max={300000}
              step={5000}
              displayFn={manwonToLabel}
              onChange={v => setForm(p => ({ ...p, priceMax: v }))}
            />

            <div className={styles.sliderRow}>
              <SliderField
                label="최소 면적"
                unit="㎡"
                value={form.areaMin}
                min={0}
                max={300}
                step={3}
                onChange={v => setForm(p => ({ ...p, areaMin: v }))}
              />
              <SliderField
                label="최대 면적"
                unit="㎡"
                value={form.areaMax}
                min={0}
                max={300}
                step={3}
                onChange={v => setForm(p => ({ ...p, areaMax: v }))}
              />
            </div>

            <SliderField
              label="최소 층수"
              unit="층"
              value={form.floorMin}
              min={1}
              max={50}
              step={1}
              onChange={v => setForm(p => ({ ...p, floorMin: v }))}
            />

            <div className={styles.formGroup}>
              <label className={styles.label}>알림 채널</label>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                📧 <span style={{ fontSize: '0.875rem', color: '#111827' }}>가입한 이메일</span>로 알림이 발송됩니다.
              </p>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" variant="primary">저장</Button>
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>취소</Button>
            </div>
          </form>
        </div>
      )}
      {isLoading ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>알림 불러오는 중...</p>
      ) : (
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
                          {alert.priceMax && <Badge variant="default" size="sm">~{manwonToLabel(alert.priceMax)}</Badge>}
                          {alert.areaMin && <Badge variant="default" size="sm">{alert.areaMin}㎡↑</Badge>}
                          {alert.areaMax && <Badge variant="default" size="sm">{alert.areaMax}㎡↓</Badge>}
                          {alert.floorMin && <Badge variant="default" size="sm">{alert.floorMin}층↑</Badge>}
                        </div>
                        <div className={styles.alertMeta}>
                          <span>📧 이메일 알림</span>
                          <span>생성: {formatDate(alert.createdAt)}</span>
                        </div>
                      </div>

                      <div className={styles.alertActions}>
                        {/* 토글 스위치 */}
                        <button
                            className={styles.toggleBtn}
                            onClick={() => toggleAlert(alert.id, alert.isActive)}
                            title={alert.isActive ? '비활성화' : '활성화'}
                            aria-pressed={alert.isActive}
                        >
                          <div className={`${styles.toggleTrack} ${alert.isActive ? styles.toggleOn : ''}`}>
                            <div className={styles.toggleThumb} />
                          </div>
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
      )}
    </div>
  );
}