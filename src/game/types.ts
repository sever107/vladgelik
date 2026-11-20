export type TargetId = 'gclass' | 'lamborghini';

export interface CarItem {
  id: TargetId;
  name: string;
  price: number;
  quality: string;
  image: string;
}

export interface UpgradeAttempt {
  id: string;
  timestamp: string;
  targetId: TargetId;
  success: boolean;
  /** Clockwise degrees, with 0 at twelve o'clock. */
  angle: number;
}

export interface SpinPlan {
  attempt: UpgradeAttempt;
  startAngle: number;
  endAngle: number;
  /** Animation duration in seconds. */
  duration: number;
}

export interface GameStats {
  total: number;
  successes: number;
  failures: number;
  gclass: number;
  lamborghini: number;
}

export interface CarCounts {
  gclass: number;
  lamborghini: number;
}
