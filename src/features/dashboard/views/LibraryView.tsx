import { useState, useMemo } from 'react';
import { Search, Play, BookOpen, ExternalLink, Sparkles, Youtube, FileText, Zap, Star, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@core/store/useStore';
import { useBreakpoint } from '@hooks/useBreakpoint';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ResourceItem {
  id: string;
  title: string;
  type: 'video' | 'article' | 'tool' | 'practice';
  url: string;
  channel?: string;
  duration?: string;
  tags: string[];
  description: string;
  why?: string;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
  } catch { /* ignore */ }
  return null;
}

const TYPE_CONFIG = {
  video:    { icon: Youtube,   color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   label: 'Videos' },
  article:  { icon: FileText,  color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  label: 'Articles' },
  tool:     { icon: Zap,       color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: 'Tools' },
  practice: { icon: Star,      color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   label: 'Practice' },
} as const;

// ─── Resource Row (compact expandable) ───────────────────────────────────────
function ResourceRow({ resource }: { resource: ResourceItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[resource.type];
  const TypeIcon = cfg.icon;
  const thumbId = extractYouTubeId(resource.url);
  const thumbUrl = thumbId ? `https://img.youtube.com/vi/${thumbId}/mqdefault.jpg` : null;

  return (
    <div style={{ borderBottom: '1px solid #f0f0f5' }}>
      {/* ── Collapsed row — 56px ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '8px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          minHeight: 56,
        }}
      >
        {/* Thumbnail / icon square */}
        <div style={{
          width: 40, height: 40, borderRadius: 8, overflow: 'hidden',
          flexShrink: 0, background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {thumbUrl ? (
            <>
              <img
                src={thumbUrl}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Play size={12} color="#fff" fill="#fff" />
              </div>
            </>
          ) : (
            <TypeIcon size={18} color={cfg.color} strokeWidth={1.8} />
          )}
        </div>

        {/* Title + channel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 500, color: '#111',
            margin: 0, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {resource.title}
          </p>
          {resource.channel && (
            <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
              {resource.channel}
            </p>
          )}
        </div>

        {/* Duration + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {resource.duration && (
            <span style={{
              fontSize: 10, fontWeight: 500, color: '#9ca3af',
              background: '#f3f4f6', borderRadius: 4, padding: '2px 6px',
            }}>
              {resource.duration}
            </span>
          )}
          {expanded
            ? <ChevronUp size={14} color="#9ca3af" />
            : <ChevronDown size={14} color="#9ca3af" />
          }
        </div>
      </button>

      {/* ── Expanded detail ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: 16, paddingLeft: 52 }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: '0 0 12px' }}>
                {resource.description}
              </p>
              {resource.why && (
                <div style={{
                  background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.1)',
                  borderRadius: 10, padding: '10px 12px', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 4 }}>
                    <Sparkles size={11} color="#7c3aed" />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Why this helps
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                    {resource.why}
                  </p>
                </div>
              )}
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: '#fff', borderRadius: 8, textDecoration: 'none',
                  fontSize: 12, fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
                }}
              >
                <ExternalLink size={11} strokeWidth={2} />
                Open {resource.type === 'video' ? 'on YouTube' : 'resource'}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function ResourceSection({
  type,
  resources,
  collapsed,
  onToggle,
}: {
  type: ResourceItem['type'];
  resources: ResourceItem[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const cfg = TYPE_CONFIG[type];
  const TypeIcon = cfg.icon;

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Section header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '12px 0 10px',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid #f0f0f5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TypeIcon size={14} color={cfg.color} strokeWidth={2} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{cfg.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: cfg.color,
            background: cfg.bg, borderRadius: 99, padding: '1px 7px',
          }}>
            {resources.length}
          </span>
        </div>
        {collapsed
          ? <ChevronDown size={16} color="#9ca3af" />
          : <ChevronUp size={16} color="#9ca3af" />
        }
      </button>

      {/* Rows */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="rows"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {resources.map(r => (
              <ResourceRow key={r.id} resource={r} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Library View ────────────────────────────────────────────────────────
export default function LibraryView() {
  const { isMobile } = useBreakpoint();
  const tasks = useStore(s => s.tasks);
  const currentGoal = useStore(s => s.currentGoal);
  const roadmap = useStore(s => s.roadmap);
  const currentDay = useStore(s => s.currentDay);

  const [search, setSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (type: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  // Extract all unique resources from tasks
  const allResources = useMemo<ResourceItem[]>(() => {
    const seen = new Set<string>();
    const result: ResourceItem[] = [];

    tasks.forEach(task => {
      const res = task.resources as { primary?: Record<string, unknown>; supplementary?: Record<string, unknown>[] } | undefined;
      if (!res) return;

      const pushResource = (r: Record<string, unknown>, suffix: string) => {
        const url = r.url as string | undefined;
        if (!url || seen.has(url)) return;
        seen.add(url);
        const rawType = r.type as string | undefined;
        const type: ResourceItem['type'] = rawType === 'video' ? 'video' : rawType === 'article' ? 'article' : rawType === 'tool' ? 'tool' : 'practice';
        result.push({
          id: `${task.id}_${suffix}`,
          title: (r.title as string | undefined) ?? task.title,
          type,
          url,
          channel: r.channel as string | undefined,
          duration: (r.watchMinutes as number | undefined) ? `${r.watchMinutes}min` : (r.duration as string | undefined),
          tags: [task.type, ...((r.topics as string[] | undefined) ?? [])].filter(Boolean),
          description: (r.description as string | undefined) ?? task.description ?? '',
          why: r.why as string | undefined,
        });
      };

      if (res.primary) pushResource(res.primary, 'primary');
      res.supplementary?.forEach((sr, idx) => pushResource(sr, `supp_${idx}`));
    });

    return result;
  }, [tasks]);

  // "For you" = resources from recent tasks (last 3 days)
  const forYouIds = useMemo(() => {
    const recentUrls = new Set<string>();
    tasks.forEach(t => {
      if (t.day < currentDay - 2 || t.day > currentDay) return;
      const res = t.resources as { primary?: Record<string, unknown> } | undefined;
      const url = res?.primary?.url as string | undefined;
      if (url) recentUrls.add(url);
    });
    return new Set(allResources.filter(r => recentUrls.has(r.url)).slice(0, 4).map(r => r.id));
  }, [allResources, tasks, currentDay]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allResources;
    const q = search.toLowerCase();
    return allResources.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      (r.channel ?? '').toLowerCase().includes(q)
    );
  }, [allResources, search]);

  const domain = currentGoal?.category || currentGoal?.specificGoal || roadmap?.title || 'Your Goal';

  const SECTIONS: ResourceItem['type'][] = ['video', 'article', 'tool', 'practice'];

  const forYouResources = allResources.filter(r => forYouIds.has(r.id));

  return (
    <div style={{ paddingBottom: isMobile ? 'calc(96px + env(safe-area-inset-bottom))' : 40 }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, letterSpacing: '-0.03em' }}>
            Library
          </h1>
          {allResources.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#7c3aed',
              background: 'rgba(124,58,237,0.08)', borderRadius: 99, padding: '2px 8px',
            }}>
              {allResources.length}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Curated for your {domain.toLowerCase()} journey
        </p>
      </div>

      {/* ── Search ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f9fafb', border: '1px solid #efefef',
        borderRadius: 12, padding: '10px 14px', marginBottom: 24,
      }}>
        <Search size={15} color="#9ca3af" strokeWidth={2} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search resources…"
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: 14, color: '#374151', fontFamily: 'inherit',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {allResources.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#f9fafb', borderRadius: 16, border: '1px dashed #e5e7eb',
        }}>
          <BookOpen size={36} color="#d1d5db" strokeWidth={1.5} />
          <p style={{ color: '#9ca3af', fontSize: 14, margin: '16px 0 6px', fontWeight: 500 }}>
            No resources yet
          </p>
          <p style={{ color: '#d1d5db', fontSize: 12, margin: 0 }}>
            Resources appear here as you progress through your plan
          </p>
        </div>
      )}

      {/* ── For You Today ── */}
      {!search && forYouResources.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid #f0f0f5' }}>
            <Sparkles size={13} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>For You Today</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', borderRadius: 99, padding: '1px 7px' }}>
              {forYouResources.length}
            </span>
          </div>
          {forYouResources.map(r => (
            <ResourceRow key={r.id} resource={r} />
          ))}
        </div>
      )}

      {/* ── Search results ── */}
      {search && (
        <div>
          {filtered.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
              No resources match "{search}"
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
              </p>
              {filtered.map(r => <ResourceRow key={r.id} resource={r} />)}
            </>
          )}
        </div>
      )}

      {/* ── Grouped sections ── */}
      {!search && allResources.length > 0 && (
        <div>
          {SECTIONS.map(type => {
            const sectionResources = allResources.filter(r => r.type === type);
            if (sectionResources.length === 0) return null;
            return (
              <ResourceSection
                key={type}
                type={type}
                resources={sectionResources}
                collapsed={collapsedSections.has(type)}
                onToggle={() => toggleSection(type)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
