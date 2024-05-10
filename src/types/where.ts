export type WhereOperators =
  | 'between'
  | 'equals'
  | 'gt'
  | 'gte'
  | 'in'
  | 'is'
  | 'isNot'
  | 'like'
  | 'lt'
  | 'lte';
type AbstractWhereInput = Partial<Record<WhereOperators, any>>;

interface WhereBetweenInput extends AbstractWhereInput {
  between?: [string | number, string | number];
  equals?: never;
  field: string;
  gt?: never;
  gte?: never;
  in?: never;
  is?: never;
  isNot?: never;
  like?: never;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereEqualsInput extends AbstractWhereInput {
  between?: never;
  equals: string | boolean | number;
  field: string;
  gt?: never;
  gte?: never;
  in?: never;
  is?: never;
  isNot?: never;
  like?: never;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereGreaterThanInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt: number | string | Date;
  gte?: never;
  in?: never;
  is?: never;
  isNot?: never;
  like?: never;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereGreaterThanEqualInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt?: never;
  gte: number | string | Date;
  in?: never;
  is?: never;
  isNot?: never;
  like?: never;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereInInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt?: never;
  gte?: never;
  in: string[] | number[] | string;
  is?: never;
  isNot?: never;
  like?: never;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereIsInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt?: never;
  gte?: never;
  in?: never;
  is: string | null | boolean;
  isNot?: never;
  like?: never;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereIsNotInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt?: never;
  gte?: never;
  in?: never;
  is?: never;
  isNot: string | null | boolean;
  like?: never;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereLikeInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt?: never;
  gte?: never;
  in?: never;
  is?: never;
  isNot?: never;
  like: string;
  lt?: never;
  lte?: never;
  table?: string;
}

interface WhereLessThanInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt?: never;
  gte?: never;
  in?: never;
  is?: never;
  isNot?: never;
  like?: never;
  lt: number | string | Date;
  lte?: never;
  table?: string;
}

interface WhereLessThanEqualInput extends AbstractWhereInput {
  between?: never;
  equals?: never;
  field: string;
  gt?: never;
  gte?: never;
  in?: never;
  is?: never;
  isNot?: never;
  like?: never;
  lt?: never;
  lte: number | string | Date;
  table?: string;
}

export type Where =
  | WhereBetweenInput
  | WhereEqualsInput
  | WhereGreaterThanInput
  | WhereGreaterThanEqualInput
  | WhereInInput
  | WhereIsInput
  | WhereIsNotInput
  | WhereLikeInput
  | WhereLessThanInput
  | WhereLessThanEqualInput;
