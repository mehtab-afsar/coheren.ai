/**
 * Agent Health Dashboard — debug panel for monitoring the 5-agent pipeline.
 *
 * Shows: success rate, avg latency, recent errors, per-agent breakdown.
 * Only visible when `?debug=agents` is in the URL or the feature flag is on.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@lib/supabase';
import { useStore } from '@core/store/useStore';

interface AgentLogRow {
  id: string;
  agent_name: string;
  run_type: string;
  latency_ms: number | null;
  model_used: string | null;
  success: boolean;
  error_msg: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface AgentStats {
  agentName: string;
  totalRuns: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastError: string | null;
  lastRunAt: string | null;
}

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  agent1_goal_analyzer: 'Agent 1 — Goal Analyzer',
  agent2_stone_identifier: 'Agent 2 — Stone Identifier',
  agent3_curriculum_builder: 'Agent 3 — Curriculum Builder',
  agent4_task_generator: 'Agent 4 — Task Generator',
  agent5_recalibrator: 'Agent 5 — Recalibrator',
};

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function computeStats(logs: AgentLogRow[]): AgentStats[] {
  const grouped = new Map<string, AgentLogRow[]>();
  for (const log of logs) {
    const existing = grouped.get(log.agent_name) ?? [];
    existing.push(log);
    grouped.set(log.agent_name, existing);
  }

  const stats: AgentStats[] = [];
  for (const [agentName, agentLogs] of grouped) {
    const successes = agentLogs.filter(l => l.success).length;
    const latencies = agentLogs
      .filter(l => l.latency_ms != null)
      .map(l => l.latency_ms!)
      .sort((a, b) => a - b);

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Idx] ?? avgLatency;

    const lastError = agentLogs
      .filter(l => !l.success && l.error_msg)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.error_msg ?? null;

    const lastRun = agentLogs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    stats.push({
      agentName,
      totalRuns: agentLogs.length,
      successRate: agentLogs.length > 0 ? (successes / agentLogs.length) * 100 : 0,
      avgLatencyMs: avgLatency,
      p95LatencyMs: p95Latency,
      lastError,
      lastRunAt: lastRun?.created_at ?? null,
    });
  }

  // Sort by agent name order
  const order = Object.keys(AGENT_DISPLAY_NAMES);
  stats.sort((a, b) => order.indexOf(a.agentName) - order.indexOf(b.agentName));
  return stats;
}

export default function AgentHealthDashboard() {
  const user = useStore(s => s.user);
  const [logs, setLogs] = useState<AgentLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchCountRef = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    const currentFetch = ++fetchCountRef.current;

    const hoursMap = { '24h': 24, '7d': 168, '30d': 720 };
    const since = new Date(Date.now() - hoursMap[timeRange] * 3600000).toISOString();

    supabase
      .from('agent_logs')
      .select('id, agent_name, run_type, latency_ms, model_used, success, error_msg, created_at, metadata')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error: fetchError }) => {
        if (currentFetch !== fetchCountRef.current) return; // stale
        if (fetchError) {
          setError(fetchError.message);
          setLogs([]);
        } else {
          setError(null);
          setLogs((data ?? []) as AgentLogRow[]);
        }
        setLoading(false);
      });
  }, [user?.id, timeRange, refreshKey]);

  const fetchLogs = () => setRefreshKey(k => k + 1);

  const stats = computeStats(logs);
  const totalRuns = logs.length;
  const totalErrors = logs.filter(l => !l.success).length;
  const overallSuccessRate = totalRuns > 0 ? ((totalRuns - totalErrors) / totalRuns * 100).toFixed(1) : '—';

  const recentErrors = logs
    .filter(l => !l.success)
    .slice(0, 5);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Agent Health Dashboard</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: timeRange === range ? '#7c3aed' : '#e2e8f0',
                background: timeRange === range ? '#7c3aed' : 'white',
                color: timeRange === range ? 'white' : '#64748b',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {range}
            </button>
          ))}
          <button
            onClick={fetchLogs}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
              background: 'white', color: '#64748b', fontSize: 13, cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 16, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Total Runs</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>{loading ? '...' : totalRuns}</div>
        </div>
        <div style={{ padding: 16, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Success Rate</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: Number(overallSuccessRate) >= 90 ? '#16a34a' : Number(overallSuccessRate) >= 70 ? '#f59e0b' : '#dc2626' }}>
            {loading ? '...' : `${overallSuccessRate}%`}
          </div>
        </div>
        <div style={{ padding: 16, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Errors ({timeRange})</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalErrors > 0 ? '#dc2626' : '#16a34a' }}>
            {loading ? '...' : totalErrors}
          </div>
        </div>
      </div>

      {/* Per-agent breakdown */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 12 }}>Per-Agent Breakdown</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {loading ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading...</div>
        ) : stats.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>No agent runs recorded yet.</div>
        ) : (
          stats.map(s => (
            <div key={s.agentName} style={{
              padding: 14, background: 'white', borderRadius: 10, border: '1px solid #e2e8f0',
              display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                  {AGENT_DISPLAY_NAMES[s.agentName] ?? s.agentName}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {s.totalRuns} runs · Last: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : 'never'}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.successRate >= 90 ? '#16a34a' : s.successRate >= 70 ? '#f59e0b' : '#dc2626' }}>
                  {s.successRate.toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>success</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{formatLatency(s.avgLatencyMs)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>avg</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.p95LatencyMs > 15000 ? '#f59e0b' : '#1a1a2e' }}>{formatLatency(s.p95LatencyMs)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>p95</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent errors */}
      {recentErrors.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#dc2626', marginBottom: 12 }}>Recent Errors</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentErrors.map(e => (
              <div key={e.id} style={{
                padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                    {AGENT_DISPLAY_NAMES[e.agent_name] ?? e.agent_name}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#7f1d1d', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {e.error_msg ?? 'Unknown error'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
