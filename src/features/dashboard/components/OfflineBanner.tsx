import { WifiOff } from 'lucide-react';

interface Props {
  pendingCount: number;
}

export default function OfflineBanner({ pendingCount }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fde68a',
      borderRadius: '10px',
      marginBottom: '16px',
    }}>
      <WifiOff size={14} color="#d97706" strokeWidth={2} />
      <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 500, lineHeight: 1.4 }}>
        You're offline.{' '}
        {pendingCount > 0
          ? `${pendingCount} recent change${pendingCount > 1 ? 's' : ''} may not be saved.`
          : 'Changes may not be saved until you reconnect.'}
      </span>
    </div>
  );
}
