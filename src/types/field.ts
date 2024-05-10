type Relationship = 'ONE_TO_ONE' | 'ONE_TO_MANY';

type FieldBuilder = {
  alias: string;
  relationship?: Relationship;
  fields: string[];
  groupByKey?: string;
};

export type Field = FieldBuilder | string;
