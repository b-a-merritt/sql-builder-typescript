import { Field } from './field';
import { Join as JoinArg } from './join';
import { OrderBy as OrderByArg } from './order';
import { Where as WhereArg } from './where';

export namespace BuilderMethods {
  export type As = (as: string) => {
    select: Select;
    update: Update;
    delete: Delete;
    insert: Insert;
  };

  export type Query = () => string;

  export type Select = (fields: Field[]) => {
    groupBy: GroupBy;
    join: Join;
    limit: Limit;
    orderBy: OrderBy;
    query: Query;
    where: Where;
  };

  export type Join = (join: JoinArg) => {
    groupBy: GroupBy;
    join: Join;
    limit: Limit;
    orderBy: OrderBy;
    query: Query;
    where: Where;
  };

  export type Update = (obj: Record<string, unknown>) => {
    query: Query;
    returning: Returning;
    where: Where;
  };

  export type Insert = (obj: Record<string, unknown>) => {
    query: Query;
    returning: Returning;
  };

  export type Delete = () => {
    query: Query;
    returning: Returning;
    where: Where;
  };

  export type GroupBy = (fields: { table: string; field: string }[]) => {
    having: Having;
    limit: Limit;
    orderBy: OrderBy;
    query: Query;
  };

  export type Having = (clauses: WhereArg[]) => {
    limit: Limit;
    orderBy: OrderBy;
    query: Query;
  };

  export type OrderBy = (orderBy: OrderByArg[]) => {
    limit: Limit;
    query: Query;
  };

  export type Where = (where: WhereArg[]) => {
    query: Query;
    groupBy: GroupBy;
  };

  export type Limit = (amount: number) => {
    query: Query;
  };

  export type Returning = (fields: string[]) => {
    query: Query;
    where: Where;
  };
}
