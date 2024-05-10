import { WhereOperators } from './types/where';

export const WHERE_CLAUSE_MAP: Record<WhereOperators, string> = {
  between: 'BETWEEN',
  equals: '=',
  gt: '>',
  gte: '>=',
  in: 'IN',
  is: 'IS',
  isNot: 'IS NOT',
  like: 'LIKE',
  lt: '<',
  lte: '<=',
} as const;

export const VALUE_KEYWORDS = [
  'ARRAY',
  'CURRENT_DATE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'DATE',
  'DEFAULT',
];
