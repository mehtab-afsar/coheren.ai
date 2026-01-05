import { tokens, progress, text } from '../../design-system';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  showLabels?: boolean;
  labelFormat?: 'question' | 'step' | 'custom';
  customLabel?: string;
}

export function ProgressIndicator({
  current,
  total,
  showLabels = true,
  labelFormat = 'question',
  customLabel,
}: ProgressIndicatorProps) {
  const percentage = (current / total) * 100;

  const getLabel = () => {
    if (customLabel) return customLabel;
    if (labelFormat === 'question') return `Question ${current} of ${total}`;
    if (labelFormat === 'step') return `Step ${current} of ${total}`;
    return '';
  };

  return (
    <div style={{ marginBottom: tokens.spacing['3xl'] }}>
      {showLabels && (
        <div style={progress.textContainer}>
          <span style={text.caption}>
            {getLabel()}
          </span>
          <span style={text.caption}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div style={progress.container}>
        <div style={progress.fill(percentage)} />
      </div>
    </div>
  );
}
