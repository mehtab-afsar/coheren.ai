import { useState, useMemo } from 'react';
import { BookOpen, CheckCircle2, FileText, Search, StickyNote } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';

type LibraryTab = 'tasks' | 'notes';

const TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  practice:   { bg: 'rgba(124,58,237,0.10)', color: '#a78bfa', label: 'Practice' },
  learning:   { bg: 'rgba(16,185,129,0.10)',  color: '#34d399', label: 'Learning' },
  reflection: { bg: 'rgba(245,158,11,0.10)',  color: '#fbbf24', label: 'Reflect' },
};

export default function LibraryView() {
  const { tasks } = useStore();
  const [activeTab, setActiveTab] = useState<LibraryTab>('tasks');
  const [query, setQuery] = useState('');

  const completedTasks = useMemo(() =>
    tasks
      .filter(t => t.completed)
      .sort((a, b) => b.day - a.day),
    [tasks]
  );

  // Gather notes from localStorage
  const notedTasks = useMemo(() => {
    return tasks
      .filter(t => {
        const note = localStorage.getItem(`note_${t.id}`);
        return note && note.trim().length > 0;
      })
      .map(t => ({
        task: t,
        note: localStorage.getItem(`note_${t.id}`) as string,
      }))
      .sort((a, b) => b.task.day - a.task.day);
  }, [tasks]);

  const q = query.toLowerCase().trim();

  const filteredTasks = q
    ? completedTasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        String(t.day).includes(q)
      )
    : completedTasks;

  const filteredNotes = q
    ? notedTasks.filter(({ task, note }) =>
        task.title.toLowerCase().includes(q) ||
        note.toLowerCase().includes(q)
      )
    : notedTasks;

  const tabCount = activeTab === 'tasks' ? filteredTasks.length : filteredNotes.length;

  return (
    <div>
      <h1 style={{ ...text.h1, marginBottom: tokens.spacing.lg }}>Library</h1>
      <p style={{ ...text.body, color: tokens.colors.text.secondary, marginBottom: tokens.spacing['2xl'] }}>
        Your completed sessions and saved notes.
      </p>

      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: tokens.spacing.xl,
      }}>
        <Search
          size={15}
          color={tokens.colors.text.tertiary}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          placeholder="Search tasks or notes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 14px 10px 38px',
            fontSize: tokens.typography.sizes.base,
            color: tokens.colors.text.primary,
            backgroundColor: tokens.colors.surface,
            border: `1.5px solid ${tokens.colors.gray[200]}`,
            borderRadius: tokens.borderRadius.lg,
            outline: 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = tokens.colors.primary;
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = tokens.colors.gray[200];
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'inline-flex',
        backgroundColor: tokens.colors.gray[50],
        borderRadius: tokens.borderRadius.lg,
        padding: '3px',
        marginBottom: tokens.spacing['2xl'],
        gap: '2px',
      }}>
        {([
          { id: 'tasks' as const, label: 'Completed', icon: CheckCircle2, count: completedTasks.length },
          { id: 'notes' as const, label: 'Notes', icon: StickyNote, count: notedTasks.length },
        ] as const).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: tokens.borderRadius.md,
                border: 'none',
                cursor: 'pointer',
                fontSize: tokens.typography.sizes.sm,
                fontWeight: isActive ? tokens.typography.weights.medium : tokens.typography.weights.regular,
                color: isActive ? tokens.colors.primary : tokens.colors.text.secondary,
                backgroundColor: isActive ? tokens.colors.surface : 'transparent',
                boxShadow: isActive ? tokens.shadows.sm : 'none',
                transition: 'all 150ms ease',
              }}
            >
              <Icon size={13} strokeWidth={isActive ? 2 : 1.5} />
              {tab.label}
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: tokens.borderRadius.full,
                backgroundColor: isActive ? tokens.colors.primarySubtle : tokens.colors.gray[100],
                color: isActive ? tokens.colors.primary : tokens.colors.text.tertiary,
                fontWeight: tokens.typography.weights.medium,
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {tabCount === 0 && (
        <div style={{
          ...card.standard,
          textAlign: 'center',
          padding: tokens.spacing['3xl'],
          color: tokens.colors.text.secondary,
        }}>
          {activeTab === 'tasks' ? (
            <>
              <CheckCircle2 size={32} color={tokens.colors.gray[300]} style={{ marginBottom: tokens.spacing.md }} />
              <p style={{ ...text.body, color: tokens.colors.text.secondary, margin: 0 }}>
                {q ? 'No completed tasks match your search.' : 'No completed tasks yet — keep going!'}
              </p>
            </>
          ) : (
            <>
              <FileText size={32} color={tokens.colors.gray[300]} style={{ marginBottom: tokens.spacing.md }} />
              <p style={{ ...text.body, color: tokens.colors.text.secondary, margin: 0 }}>
                {q ? 'No notes match your search.' : 'No notes yet. Use Focus Mode to take notes during sessions.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Completed Tasks list */}
      {activeTab === 'tasks' && filteredTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          {filteredTasks.map(task => {
            const typeStyle = TYPE_COLORS[task.type] ?? TYPE_COLORS.practice;
            const hasNote = Boolean(localStorage.getItem(`note_${task.id}`)?.trim());
            return (
              <div
                key={task.id}
                style={{
                  ...card.standard,
                  padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: tokens.spacing.md,
                  transition: 'box-shadow 200ms ease, transform 200ms ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.10)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = tokens.shadows.sm;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <CheckCircle2
                  size={18}
                  color={tokens.colors.success}
                  strokeWidth={2}
                  style={{ flexShrink: 0, marginTop: '2px' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: tokens.typography.sizes.base,
                      fontWeight: tokens.typography.weights.medium,
                      color: tokens.colors.text.primary,
                    }}>
                      {task.title}
                    </span>
                    {hasNote && (
                      <StickyNote size={12} color={tokens.colors.text.tertiary} title="Has note" />
                    )}
                  </div>
                  {task.description && (
                    <p style={{
                      fontSize: tokens.typography.sizes.sm,
                      color: tokens.colors.text.secondary,
                      margin: '0 0 8px',
                      lineHeight: '1.45',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: tokens.borderRadius.full,
                      backgroundColor: typeStyle.bg,
                      color: typeStyle.color,
                      fontWeight: tokens.typography.weights.medium,
                      letterSpacing: '0.02em',
                    }}>
                      {typeStyle.label}
                    </span>
                    <span style={{ fontSize: '11px', color: tokens.colors.text.tertiary }}>
                      Day {task.day}
                    </span>
                    {task.duration && (
                      <span style={{ fontSize: '11px', color: tokens.colors.text.tertiary }}>
                        · {task.duration} min
                      </span>
                    )}
                    {task.adjustedDifficulty && (
                      <span style={{ fontSize: '11px', color: tokens.colors.text.tertiary }}>
                        · {task.adjustedDifficulty}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes list */}
      {activeTab === 'notes' && filteredNotes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          {filteredNotes.map(({ task, note }) => (
            <div
              key={task.id}
              style={{
                ...card.standard,
                padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
                transition: 'box-shadow 200ms ease, transform 200ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.10)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = tokens.shadows.sm;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <BookOpen size={14} color={tokens.colors.primary} strokeWidth={1.5} />
                <span style={{
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.medium,
                  color: tokens.colors.text.primary,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: tokens.colors.text.tertiary,
                  flexShrink: 0,
                }}>
                  Day {task.day}
                </span>
              </div>
              <p style={{
                fontSize: tokens.typography.sizes.sm,
                color: tokens.colors.text.secondary,
                margin: 0,
                lineHeight: '1.55',
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
              }}>
                {note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
