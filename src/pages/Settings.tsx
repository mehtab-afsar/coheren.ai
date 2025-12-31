import { ChevronLeft, User, Bell, Target, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function Settings() {
  const { universalProfile, roadmap, checkInTime, resetOnboarding, setStep, setCheckInTime } = useStore();

  const [isEditingCheckIn, setIsEditingCheckIn] = useState(false);
  const [tempCheckInTime, setTempCheckInTime] = useState(checkInTime);

  const handleSaveCheckIn = () => {
    setCheckInTime(tempCheckInTime);
    setIsEditingCheckIn(false);
  };

  const handleCancelCheckIn = () => {
    setTempCheckInTime(checkInTime);
    setIsEditingCheckIn(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to start over? This will delete all your progress.')) {
      resetOnboarding();
      setStep(0);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #f0f0f0',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={() => setStep(7)}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ChevronLeft size={20} color="black" />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 300, color: 'black' }}>
          Settings
        </h1>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Profile Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#999',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Profile
          </h2>

          <div style={{
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <User size={18} color="#666" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Name</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {universalProfile.name || 'Not set'}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <Target size={18} color="#666" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Current Goal</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {roadmap?.title || 'Not set'}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Bell size={18} color="#666" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Check-in Time</div>
                {isEditingCheckIn ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px'
                  }}>
                    <input
                      type="time"
                      value={tempCheckInTime}
                      onChange={(e) => setTempCheckInTime(e.target.value)}
                      autoFocus
                      style={{
                        fontSize: '15px',
                        fontWeight: 300,
                        padding: '4px 8px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'black'}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                    <button
                      onClick={handleSaveCheckIn}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'black',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleCancelCheckIn}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#fafafa',
                        color: 'black',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                      {checkInTime}
                    </div>
                    <button
                      onClick={() => setIsEditingCheckIn(true)}
                      style={{
                        padding: '4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Edit2 size={14} color="#999" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#999',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Schedule
          </h2>

          <div style={{
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Wake Time</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {universalProfile.dailyRoutine?.wakeTime || 'Not set'}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Sleep Time</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {universalProfile.dailyRoutine?.sleepTime || 'Not set'}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Work Hours</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {universalProfile.dailyRoutine?.workHours
                    ? `${universalProfile.dailyRoutine.workHours.start} - ${universalProfile.dailyRoutine.workHours.end}`
                    : 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Info */}
        {roadmap && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#999',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Roadmap
            </h2>

            <div style={{
              backgroundColor: '#fafafa',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Duration</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {roadmap.duration} months
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Daily Time</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {roadmap.dailyTime}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 300, color: '#999' }}>Start Date</div>
                <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                  {new Date(roadmap.startDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#999',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Actions
          </h2>

          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: 'white',
              border: '1px solid #ffebee',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffebee';
              e.currentTarget.style.borderColor = '#ef5350';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#ffebee';
            }}
          >
            <Trash2 size={18} color="#ef5350" />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '15px', fontWeight: 300, color: '#ef5350' }}>
                Reset Everything
              </div>
              <div style={{ fontSize: '12px', fontWeight: 300, color: '#999', marginTop: '2px' }}>
                Delete all progress and start over
              </div>
            </div>
          </button>
        </div>

        {/* App info */}
        <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
          <p style={{ fontSize: '12px', fontWeight: 300, color: '#ccc' }}>
            CONSIST v1.0
          </p>
          <p style={{ fontSize: '11px', fontWeight: 300, color: '#e0e0e0', marginTop: '4px' }}>
            Your everyday ally for consistency
          </p>
        </div>
      </div>
    </div>
  );
}
