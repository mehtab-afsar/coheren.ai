import { User, Clock, Sunrise } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';

export default function ProfileView() {
  const { universalProfile, currentGoal, roadmap } = useStore();

  return (
    <div>
      <h1 style={{ ...text.h1, marginBottom: tokens.spacing['2xl'] }}>
        Your Profile
      </h1>

      {/* Profile Header */}
      <div style={{
        ...card.standard,
        marginBottom: tokens.spacing.xl,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xl
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: tokens.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <User size={40} color={tokens.colors.text.inverse} />
        </div>
        <div>
          <h2 style={{ ...text.h2, marginBottom: tokens.spacing.xs }}>
            {universalProfile.name || 'User'}
          </h2>
          <p style={{ ...text.body, color: tokens.colors.text.secondary }}>
            {currentGoal.specificGoal || 'No goal set'}
          </p>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: tokens.spacing.lg,
        marginBottom: tokens.spacing.xl
      }}>
        {/* Energy Pattern */}
        <div style={card.standard}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Sunrise size={20} color={tokens.colors.text.secondary} />
            <h3 style={{ ...text.h4, margin: 0 }}>Energy Pattern</h3>
          </div>
          <p style={{ ...text.h3, textTransform: 'capitalize', margin: 0 }}>
            {universalProfile.energyPattern || 'Not set'}
          </p>
        </div>

        {/* Wake Time */}
        <div style={card.standard}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Clock size={20} color={tokens.colors.text.secondary} />
            <h3 style={{ ...text.h4, margin: 0 }}>Wake Time</h3>
          </div>
          <p style={{ ...text.h3, margin: 0 }}>
            {universalProfile.dailyRoutine?.wakeTime || 'Not set'}
          </p>
        </div>

        {/* Daily Commitment */}
        <div style={card.standard}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Clock size={20} color={tokens.colors.text.secondary} />
            <h3 style={{ ...text.h4, margin: 0 }}>Daily Commitment</h3>
          </div>
          <p style={{ ...text.h3, margin: 0 }}>
            {roadmap?.dailyTime || 'Not set'}
          </p>
        </div>
      </div>

      {/* Goal Details */}
      <div style={card.standard}>
        <h3 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>
          Current Goal
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.md
        }}>
          <div>
            <p style={{ ...text.caption, color: tokens.colors.text.secondary, marginBottom: tokens.spacing.xs }}>
              Goal
            </p>
            <p style={{ ...text.body, margin: 0 }}>
              {currentGoal.specificGoal || 'No goal set'}
            </p>
          </div>
          <div>
            <p style={{ ...text.caption, color: tokens.colors.text.secondary, marginBottom: tokens.spacing.xs }}>
              Category
            </p>
            <p style={{ ...text.body, margin: 0, textTransform: 'capitalize' }}>
              {currentGoal.category || 'Not set'}
            </p>
          </div>
          <div>
            <p style={{ ...text.caption, color: tokens.colors.text.secondary, marginBottom: tokens.spacing.xs }}>
              Duration
            </p>
            <p style={{ ...text.body, margin: 0 }}>
              {roadmap?.duration ? `${roadmap.duration} months` : 'Not set'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
