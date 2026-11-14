import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card } from './primitives';
import { API_BASE_URL, handleUnauthorizedResponse } from '../../services/api';
import { readSession } from '../../utils/storage';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}: {
  children: ReactNode;
  variant?: 'neutral' | 'brand' | 'success' | 'warning' | 'critical' | 'orange' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`us-badge tone-${variant} size-${size}${className ? ` ${className}` : ''}`}>
      {dot && <span className="us-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    setFailed(false);
    if (!src || !src.startsWith(`${API_BASE_URL}/files/`)) {
      setResolvedSrc(src || undefined);
      return;
    }
    setResolvedSrc(undefined);
    let active = true;
    let objectUrl = '';
    const token = readSession()?.token;
    if (!token) {
      setResolvedSrc(undefined);
      return;
    }
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        handleUnauthorizedResponse(response);
        if (!response.ok) throw new Error('Avatar unavailable');
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase() || '?';
  return (
    <span
      className={`us-avatar size-${size}${className ? ` ${className}` : ''}`}
      aria-label={name}
      role="img"
    >
      {resolvedSrc && !failed ? (
        <img src={resolvedSrc} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  change,
  changeLabel,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  change?: number;
  changeLabel?: string;
}) {
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;
  const ChangeIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  return (
    <Card className="us-stat-card" padding="md">
      <div className="us-stat-top">
        <span>{label}</span>
        {icon && <span className="us-stat-icon">{icon}</span>}
      </div>
      <div className="us-stat-value">{value}</div>
      {change !== undefined && (
        <div
          className={['us-stat-change', isPositive && 'is-positive', isNegative && 'is-negative']
            .filter(Boolean)
            .join(' ')}
        >
          <ChangeIcon size={14} aria-hidden="true" />
          <span>
            {Math.abs(change)}%{changeLabel ? ` ${changeLabel}` : ''}
          </span>
        </div>
      )}
    </Card>
  );
}
