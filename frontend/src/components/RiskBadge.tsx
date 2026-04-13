type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface RiskBadgeProps {
  level: RiskLevel;
}

const classMap: Record<RiskLevel, string> = {
  Low: 'risk-badge-low',
  Medium: 'risk-badge-medium',
  High: 'risk-badge-high',
  Critical: 'risk-badge-critical',
};

export const RiskBadge = ({ level }: RiskBadgeProps) => (
  <span className={classMap[level]}>{level}</span>
);
