import { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface DayDot {
  dayNumber: number;
  completed: boolean;
  skipped: boolean;
  isToday: boolean;
  isRest: boolean;
  isFuture: boolean;
}

export interface WeekTaskRow {
  id: string;
  title: string;
  taskType: string;
  duration: number;
  completed: boolean;
  skipped: boolean;
  isToday: boolean;
  day: number;
  description?: string;
  mood?: number;
  reflection?: string;
  hasNotes: boolean;
}

export interface WeekCardProps {
  weekNumber: number;
  focus: string;
  completedCount: number;
  totalCount: number;
  isActive: boolean;
  isCompleted: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  days: DayDot[];
  tasks: WeekTaskRow[];
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😫',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '🤩',
};

const TASK_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  practice: { bg: 'rgba(124,58,237,0.12)', text: '#a78bfa' },
  learning: { bg: 'rgba(14,165,233,0.12)', text: '#38bdf8' },
  reflection: { bg: 'rgba(139,92,246,0.12)', text: '#c4b5fd' },
};

function getTypeStyle(taskType: string): { bg: string; text: string } {
  return TASK_TYPE_COLORS[taskType] ?? { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' };
}

function TaskRow({ task }: { task: WeekTaskRow }) {
  const [expanded, setExpanded] = useState(false);
  const typeStyle = getTypeStyle(task.taskType);
  const canExpand = task.completed && (task.description || task.mood || task.reflection);

  return (
    <div>
      <div
        onClick={() => canExpand && setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 16px',
          cursor: canExpand ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Status dot */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            flexShrink: 0,
            background: task.completed
              ? '#7c3aed'
              : task.skipped
              ? 'rgba(239,68,68,0.6)'
              : task.isToday
              ? '#a78bfa'
              : '#334155',
            boxShadow: task.isToday && !task.completed && !task.skipped
              ? '0 0 0 3px rgba(167,139,250,0.2)'
              : 'none',
          }}
        />

        {/* Title */}
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: task.completed ? '#d1d5db' : '#6b7280',
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textDecoration: task.skipped ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>

        {/* Type badge */}
        <span
          style={{
            fontSize: 10,
            padding: '1px 7px',
            borderRadius: 99,
            background: typeStyle.bg,
            color: typeStyle.text,
            flexShrink: 0,
            fontWeight: 500,
            textTransform: 'capitalize' as const,
          }}
        >
          {task.taskType}
        </span>

        {/* Duration */}
        <span style={{ fontSize: 11, color: '#4b5563', flexShrink: 0 }}>
          {task.duration}m
        </span>

        {/* Notes icon */}
        {task.hasNotes && (
          <MessageSquare size={12} color="#a78bfa" style={{ flexShrink: 0 }} />
        )}
      </div>

      {/* Sub-expansion for completed tasks */}
      <AnimatePresence>
        {expanded && canExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '8px 16px 10px 30px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {task.description && (
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 6px', lineHeight: 1.5 }}>
                  {task.description}
                </p>
              )}
              {task.mood && (
                <span style={{ fontSize: 14, marginRight: 6 }}>
                  {MOOD_EMOJIS[task.mood] ?? ''}
                </span>
              )}
              {task.reflection && (
                <p
                  style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    fontStyle: 'italic',
                    margin: '4px 0 0',
                    lineHeight: 1.5,
                  }}
                >
                  "{task.reflection}"
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WeekCard({
  weekNumber,
  focus,
  completedCount,
  totalCount,
  isActive,
  isCompleted,
  isExpanded,
  onToggle,
  days,
  tasks,
}: WeekCardProps) {
  const borderColor = isActive
    ? 'rgba(124,58,237,0.25)'
    : isCompleted
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(255,255,255,0.03)';
  const bgColor = isActive ? 'rgba(124,58,237,0.04)' : 'rgba(255,255,255,0.01)';

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        background: bgColor,
        borderRadius: 18,
        overflow: 'hidden' as const,
      }}
    >
      {/* Header button */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 16px 12px',
          cursor: 'pointer',
          textAlign: 'left' as const,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Row 1: Week label + status + count + chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
            Week {weekNumber}
          </span>

          {/* Active pulse dot */}
          {isActive && !isCompleted && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#a78bfa',
                display: 'inline-block',
                animation: 'week-card-pulse 2s ease-in-out infinite',
              }}
            />
          )}

          {/* Completed checkmark */}
          {isCompleted && <CheckCircle size={13} color="#6d28d9" />}

          <span style={{ flex: 1 }} />

          {/* Task count */}
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {completedCount}/{totalCount}
          </span>

          {/* Chevron */}
          {isExpanded ? (
            <ChevronUp size={14} color="#6b7280" />
          ) : (
            <ChevronDown size={14} color="#6b7280" />
          )}
        </div>

        {/* Row 2: Focus text */}
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px', lineHeight: 1.4 }}>
          {focus}
        </p>

        {/* Row 3: Day dots */}
        <div style={{ display: 'flex', gap: 4 }}>
          {days.map((dot) => {
            let dotBg: string;
            let boxShadow = 'none';

            if (dot.completed) {
              dotBg = '#7c3aed';
            } else if (dot.skipped) {
              dotBg = 'rgba(239,68,68,0.4)';
            } else if (dot.isToday) {
              dotBg = '#a78bfa';
              boxShadow = '0 0 0 3px rgba(167,139,250,0.2)';
            } else if (dot.isRest) {
              dotBg = 'rgba(255,255,255,0.08)';
            } else if (dot.isFuture) {
              dotBg = 'rgba(255,255,255,0.04)';
            } else {
              dotBg = 'rgba(255,255,255,0.04)';
            }

            return (
              <div
                key={dot.dayNumber}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 99,
                  background: dotBg,
                  boxShadow,
                }}
              />
            );
          })}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* Divider */}
            <div
              style={{
                height: 1,
                background: 'rgba(255,255,255,0.05)',
                margin: '0 16px',
              }}
            />

            {/* Task list */}
            <div style={{ paddingTop: 4, paddingBottom: 8 }}>
              {tasks.length === 0 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: '#4b5563',
                    padding: '12px 16px',
                    margin: 0,
                  }}
                >
                  No tasks yet for this week.
                </p>
              ) : (
                tasks.map((task, i) => (
                  <div
                    key={task.id}
                    style={{
                      borderTop:
                        i === 0
                          ? 'none'
                          : '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    <TaskRow task={task} />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframe for pulse animation */}
      <style>{`
        @keyframes week-card-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
