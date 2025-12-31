import { Flame, Calendar, TrendingUp, Settings, CheckCircle2, Circle, Clock, Play } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Dashboard() {
  const {
    universalProfile,
    roadmap,
    tasks,
    currentDay,
    streak,
    completionRate,
    completeTask,
    setStep
  } = useStore();

  const todaysTasks = tasks.filter(t => t.day === currentDay);
  const completedTasks = todaysTasks.filter(t => t.completed);
  const pendingTasks = todaysTasks.filter(t => !t.completed);
  const allDone = todaysTasks.length > 0 && todaysTasks.every(t => t.completed);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'practice':
        return Play;
      case 'learning':
        return Calendar;
      case 'reflection':
        return TrendingUp;
      default:
        return Circle;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fafafa',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #f0f0f0',
        padding: '20px 24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 300, color: 'black', marginBottom: '4px' }}>
              {getGreeting()}, {universalProfile.name || 'there'}
            </h1>
            <p style={{ fontSize: '14px', fontWeight: 300, color: '#999' }}>
              Day {currentDay} • {roadmap?.title}
            </p>
          </div>
          <button
            onClick={() => setStep(8)}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#fafafa',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
          >
            <Settings size={20} color="#666" />
          </button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Stats cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Flame size={16} color={streak > 0 ? '#ff6b35' : '#ccc'} />
              <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>Streak</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 300, color: 'black' }}>
              {streak}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 300, color: '#999' }}>
              {streak === 1 ? 'day' : 'days'}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <TrendingUp size={16} color="#666" />
              <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>Progress</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 300, color: 'black' }}>
              {Math.round(completionRate)}%
            </div>
            <div style={{ fontSize: '11px', fontWeight: 300, color: '#999' }}>
              today
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Calendar size={16} color="#666" />
              <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>Week</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 300, color: 'black' }}>
              {Math.ceil(currentDay / 7)}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 300, color: '#999' }}>
              of {Math.ceil((roadmap?.duration || 6) * 4)}
            </div>
          </div>
        </div>

        {/* All done message */}
        {allDone && (
          <div style={{
            backgroundColor: 'black',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontSize: '18px', fontWeight: 300, marginBottom: '4px' }}>
              All done for today!
            </div>
            <div style={{ fontSize: '14px', fontWeight: 300, color: '#ccc' }}>
              Great work. See you tomorrow!
            </div>
          </div>
        )}

        {/* Today's tasks */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 400, color: 'black' }}>
              Today's Tasks
            </h2>
            <span style={{ fontSize: '14px', fontWeight: 300, color: '#999' }}>
              {completedTasks.length} of {todaysTasks.length}
            </span>
          </div>

          {todaysTasks.length === 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid #f0f0f0',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '14px', fontWeight: 300, color: '#999' }}>
                No tasks for today. Check back tomorrow!
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todaysTasks.map((task) => {
              const Icon = getTaskIcon(task.type);
              return (
                <div
                  key={task.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #f0f0f0',
                    opacity: task.completed ? 0.6 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => !task.completed && completeTask(task.id)}
                      disabled={task.completed}
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: task.completed ? 'black' : 'white',
                        border: `2px solid ${task.completed ? 'black' : '#e5e5e5'}`,
                        borderRadius: '50%',
                        cursor: task.completed ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                        marginTop: '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (!task.completed) e.currentTarget.style.borderColor = 'black';
                      }}
                      onMouseLeave={(e) => {
                        if (!task.completed) e.currentTarget.style.borderColor = '#e5e5e5';
                      }}
                    >
                      {task.completed && <CheckCircle2 size={16} color="white" />}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <Icon size={14} color="#999" />
                        <h3 style={{
                          fontSize: '15px',
                          fontWeight: 400,
                          color: 'black',
                          textDecoration: task.completed ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </h3>
                      </div>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: 300,
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        {task.description}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 300,
                        color: '#999'
                      }}>
                        <Clock size={12} />
                        {formatDuration(task.duration)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current phase info */}
        {roadmap && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #f0f0f0'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 400, color: 'black', marginBottom: '8px' }}>
              Current Phase
            </h3>
            <p style={{ fontSize: '16px', fontWeight: 300, color: 'black', marginBottom: '4px' }}>
              {roadmap.phases[0]?.title}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 300, color: '#666' }}>
              {roadmap.phases[0]?.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
