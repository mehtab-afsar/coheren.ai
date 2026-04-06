/**
 * TaskVariantPicker — Item 7 (Speculative Task Variants)
 *
 * Shown before FocusCard when 3 variant tasks exist for the current day
 * and the user hasn't yet chosen one. Tapping a card calls selectTaskVariant.
 */

import { useStore } from '@core/store/useStore';
import type { Task } from '@core/store/useStore';

interface Props {
  day: number;
  tasks: Task[];
}

const VARIANT_CONFIG = {
  light: {
    icon: '🌱',
    label: 'Light',
    color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200',
  },
  standard: {
    icon: '⚡',
    label: 'Standard',
    color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200',
  },
  deep: {
    icon: '🔥',
    label: 'Deep',
    color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200',
  },
} as const;

export function TaskVariantPicker({ day, tasks }: Props) {
  const selectTaskVariant = useStore(s => s.selectTaskVariant);

  const ordered = (['light', 'standard', 'deep'] as const)
    .map(v => ({ variant: v, task: tasks.find(t => t.variant === v) }))
    .filter((x): x is { variant: 'light' | 'standard' | 'deep'; task: Task } => x.task != null);

  if (ordered.length === 0) return null;

  return (
    <div className="px-4 py-6 space-y-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
        How much energy do you have today?
      </p>
      {ordered.map(({ variant, task }) => {
        const cfg = VARIANT_CONFIG[variant];
        return (
          <button
            key={variant}
            onClick={() => selectTaskVariant(day, variant)}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-95 ${cfg.color}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {task.duration} min
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {task.title}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
