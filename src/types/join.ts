import { Field } from './field';

type Type = 'INNER' | 'LEFT' | 'RIGHT' | 'OUTER';

export interface Join {
  aliases?: {
    left: string;
    right: string;
  };
  fields: Field[];
  on: {
    left: string;
    right: string;
  };
  pk?: string | string[];
  tables: {
    left: string;
    right: string;
  };
  type?: Type;
}
