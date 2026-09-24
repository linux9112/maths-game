import Dexie, { type Table } from 'dexie';
import {
  CalculationAttempt,
  CalculationStatRecord,
  UserProfileRecord,
  DailyChallengeRecord,
} from './types';

/**
 * Dexie 4 database schema for offline calculation telemetry,
 * mastery tracking, player profile, and daily challenges.
 */
export class MathAppDatabase extends Dexie {
  calculation_attempts!: Table<CalculationAttempt, number>;
  calculation_stats!: Table<CalculationStatRecord, string>;
  user_profile!: Table<UserProfileRecord, string>;
  daily_challenges!: Table<DailyChallengeRecord, string>;

  constructor(dbName = 'MathAppDB') {
    super(dbName);
    this.version(1).stores({
      calculation_attempts: '++id, factId, operator, timestamp, isCorrect, mode',
      calculation_stats: 'factId, operator, errorRate, weaknessScore, lastPracticed',
      user_profile: 'id, xp, level, currentStreak, bestStreak, lastActiveDate',
      daily_challenges: 'dateKey, completed, score, timeSec',
    });
  }
}

export const db = new MathAppDatabase();
