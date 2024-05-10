import { WHERE_CLAUSE_MAP, VALUE_KEYWORDS } from './constants';
import { InitializationOptions } from './types/common';
import { Field } from './types/field';
import { Join } from './types/join';
import { BuilderMethods } from './types/methods';
import { OrderBy } from './types/order';
import { Where } from './types/where';

export interface SQURL {
  as: BuilderMethods.As;
  select: BuilderMethods.Select;
  delete: BuilderMethods.Delete;
  insert: BuilderMethods.Insert;
  update: BuilderMethods.Update;
}

export class SQURL {
  private alias?: string;
  private delimiter: ' ' | '\n' = '\n';
  private schema: string = 'public';
  private table: string;
  private type!: 'SELECT' | 'DELETE' | 'INSERT' | 'UPDATE';

  private fields?: Set<string>;
  private joinTerms?: Set<string>;
  private joinTableKeys?: Set<string>;
  private whereClauses?: Set<string>;
  private groupByTerms?: Set<string>;
  private havingClauses?: Set<string>;
  private orderByTerms?: Set<string>;
  private limitAmt?: number;
  private changeKeys?: string[];
  private changeValues?: string[];

  constructor(table: string, options?: InitializationOptions) {
    this.schema = options?.schema || 'public';
    this.table = table;
    this.delimiter = !!options?.pretty ? '\n' : ' ';
  }

  public as = (alias: string) => {
    this.alias = alias;
    return {
      delete: this.delete,
      insert: this.insert,
      select: this.select,
      update: this.update,
    };
  };

  /**
   * @param fields the fields to be selected from the current table
   * @note when selecting fields from join tables, specify them in the join method
   */
  public select: BuilderMethods.Select = (fields: Field[]) => {
    this.type = 'SELECT';
    this.fields = new Set();

    for (const field of fields) {
      this.fields.add(this.formatField(field, this.alias || this.table));
    }

    return {
      groupBy: this.groupBy,
      join: this.join,
      limit: this.limit,
      orderBy: this.orderBy,
      query: this.query,
      where: this.where,
    };
  };

  public update = (obj: Record<string, unknown>) => {
    this.type = 'UPDATE';
    this.changeKeys = Object.keys(obj);
    this.changeValues = Object.values(obj).map(this.formatInsertValue);
    return {
      query: this.query,
      returning: this.returning,
      where: this.where,
    };
  };

  public insert = (obj: Record<string, unknown>) => {
    this.type = 'INSERT';
    this.changeKeys = Object.keys(obj);
    this.changeValues = Object.values(obj).map(this.formatInsertValue);
    return {
      query: this.query,
      returning: this.returning,
    };
  };

  private formatInsertValue = (value: unknown) => {
    if (typeof value === 'string' && VALUE_KEYWORDS.includes(value)) {
      return value;
    } else if (typeof value === 'number') {
      return `${value}`;
    } else if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return `'${value}'`;
  };

  public delete = () => {
    this.type = 'DELETE';
    return {
      query: this.query,
      returning: this.returning,
      where: this.where,
    };
  };

  private formatField = (bldr: Field, table: string) => {
    if (typeof bldr === 'string') {
      return `"${table}".${bldr}`;
    } else {
      const { alias, fields, groupByKey = 'id', relationship } = bldr;

      const jsonAggValue = `jsonb_build_object(${this.delimiter}${fields
        .map((field) => `'${field}', "${table}".${field},${this.delimiter}`)
        .join('')}'${groupByKey}', "${table}".${groupByKey})`;

      if (relationship === 'ONE_TO_ONE') {
        return `${jsonAggValue}${this.delimiter}AS "${alias}"`;
      } else {
        return `COALESCE(${this.delimiter}jsonb_agg(${this.delimiter}DISTINCT ${jsonAggValue}${this.delimiter})${this.delimiter}FILTER (WHERE "${table}".${groupByKey} IS NOT NULL), '[]'${this.delimiter})${this.delimiter}AS "${alias}"`;
      }
    }
  };

  private join = (join: Join) => {
    if (!this.joinTerms) {
      this.joinTerms = new Set<string>();
    }
    if (!this.joinTableKeys) {
      this.joinTableKeys = new Set<string>();
    }

    for (const field of join.fields) {
      this.fields!.add(
        this.formatField(field, join?.aliases?.right || join.tables.right)
      );
    }

    const joinTerm = `${join.type} JOIN ${this.schema}."${join.tables.right}"${join.aliases?.right ? ' AS "' + join.aliases.right + '"' : ''}`;
    const onStatement = `${this.delimiter}ON ${join?.aliases?.left ? `"${join.aliases.left}"` : `${this.schema}."${join.tables.left}"`}.${join.on.left} = ${join?.aliases?.right ? `"${join.aliases.right}"` : `${this.schema}."${join.tables.right}"`}.${join.on.right}`;

    this.joinTerms.add(joinTerm + onStatement);

    // ensure the join table pks are recorded for group by
    if (typeof join.pk === 'string') {
      this.joinTableKeys.add(
        `"${join?.aliases?.right || join.tables.right}".id`
      );
    } else if (typeof join.pk !== 'undefined') {
      for (const pk of join.pk) {
        this.joinTableKeys.add(
          `"${join?.aliases?.right || join.tables.right}".${pk}`
        );
      }
    } else {
      this.joinTableKeys.add(
        `"${join?.aliases?.right || join.tables.right}".id`
      );
    }

    return {
      groupBy: this.groupBy,
      join: this.join,
      limit: this.limit,
      orderBy: this.orderBy,
      query: this.query,
      where: this.where,
    };
  };

  private returning = (fields: string[]) => {
    this.fields = new Set<string>(fields);
    return {
      query: this.query,
      where: this.where,
    };
  };

  private limit = (amount: number) => {
    this.limitAmt = amount;
    return {
      query: this.query,
    };
  };

  private groupBy = (fields: { field: string; table: string }[]) => {
    if (!this.groupByTerms) {
      this.groupByTerms = new Set<string>();
    }

    for (const field of fields) {
      this.groupByTerms?.add(`"${field.table}".${field.field}`);
    }

    return {
      having: this.having,
      limit: this.limit,
      orderBy: this.orderBy,
      query: this.query,
    };
  };

  /**
   * join tables should be in group by
   */
  private groupByKeysWithJoins = () => {
    if (!!this.groupByTerms && !!this.joinTableKeys) {
      this.groupByTerms.add(
        `${this.alias ? `"${this.alias}"` : `${this.schema}."${this.table}"`}.id`
      );
      for (const joinTableKey of this.joinTableKeys) {
        this.groupByTerms.add(joinTableKey);
      }
    }
  };

  private findClause = (clause: Where) => {
    if (clause?.between) {
      return `${WHERE_CLAUSE_MAP['between']} '${clause.between[0]}' AND '${clause.between[1]}'`;
    } else if (clause?.equals) {
      return `${WHERE_CLAUSE_MAP['equals']} '${clause.equals}'`;
    } else if (clause?.gt) {
      return `${WHERE_CLAUSE_MAP['gt']} '${clause.gt}'`;
    } else if (clause?.gte) {
      return `${WHERE_CLAUSE_MAP['gte']} '${clause.gte}'`;
    } else if (clause?.in) {
      return `${WHERE_CLAUSE_MAP['in']} '${clause.in}'`;
    } else if (clause?.is) {
      return `${WHERE_CLAUSE_MAP['is']} '${clause.is}'`;
    } else if (clause?.isNot) {
      return `${WHERE_CLAUSE_MAP['isNot']} '${clause.isNot}'`;
    } else if (clause?.like) {
      return `${WHERE_CLAUSE_MAP['like']} '${clause.like}'`;
    } else if (clause?.lt) {
      return `${WHERE_CLAUSE_MAP['lt']} '${clause.lt}'`;
    } else if (clause?.lte) {
      return `${WHERE_CLAUSE_MAP['lte']} '${clause.lte}'`;
    } else {
      throw Error('Clause operator not recognized');
    }
  };

  private having = (clauses: Where[]) => {
    this.havingClauses = new Set<string>();

    for (const clause of clauses) {
      this.havingClauses.add(
        `"${clause?.table || this.table}".${clause.field} ${this.findClause(clause)}`
      );
    }

    return {
      limit: this.limit,
      orderBy: this.orderBy,
      query: this.query,
    };
  };

  private orderBy = (orderByTerms: OrderBy[]) => {
    if (!this.orderByTerms) {
      this.orderByTerms = new Set<string>();
    }

    for (const orderBy of orderByTerms) {
      this.orderByTerms.add(
        `"${orderBy?.table || this.alias || `${this.schema}."${this.table}"`}".${orderBy.field}`
      );
    }

    return {
      limit: this.limit,
      query: this.query,
    };
  };

  private where = (clauses: Where[]) => {
    this.whereClauses = new Set<string>();

    for (const clause of clauses) {
      this.whereClauses.add(
        `"${clause?.table || this.table}".${clause.field} ${this.findClause(clause)}`
      );
    }

    return {
      query: this.query,
      groupBy: this.groupBy,
    };
  };

  private query = () => {
    switch (this.type) {
      case 'SELECT':
        return this.formatSelect();
      case 'INSERT':
        return this.formatInsert();
      case 'DELETE':
        return this.formatDelete();
      case 'UPDATE':
        return this.formatUpdate();
    }
  };

  private formatSelect = () => {
    this.groupByKeysWithJoins();

    const select = `SELECT${this.delimiter}`;
    const fields = `${[...this.fields!].join(',' + this.delimiter)}${this.delimiter}`;
    const from = `FROM ${this.schema}."${this.table}"${this.delimiter}`;
    const as = this.alias ? ` AS "${this.alias}"${this.delimiter}` : '';
    const join = !!this.joinTerms
      ? `${[...this.joinTerms].join(this.delimiter)}${this.delimiter}`
      : '';
    const where = !!this.whereClauses
      ? `WHERE ${[...this.whereClauses].join(this.delimiter + 'AND ')}${this.delimiter}`
      : '';
    const groupBy = !!this.groupByTerms
      ? `GROUP BY ${[...this.groupByTerms].join(',' + this.delimiter)}${this.delimiter}`
      : '';
    const having = !!this.havingClauses
      ? `HAVING ${[...this.havingClauses].join(',' + this.delimiter)}${this.delimiter}`
      : '';
    const orderBy = !!this.orderByTerms
      ? `ORDER BY ${[...this.orderByTerms].join(',' + this.delimiter)}${this.delimiter}`
      : '';
    const limit = !!this.limitAmt ? `LIMIT ${this.limitAmt}` : '';

    return `${select}${fields}${from}${as}${join}${where}${groupBy}${having}${orderBy}${limit}`;
  };

  private formatInsert = () => {
    const insertInto = `INSERT INTO ${this.schema}."${this.table}"${this.delimiter}`;
    const keys = `(${this.delimiter}${this.changeKeys!.join(',' + this.delimiter)}${this.delimiter})${this.delimiter}`;
    const values = `VALUES (${this.delimiter}${this.changeValues!.join(',' + this.delimiter)}${this.delimiter})${this.delimiter}`;
    const returning = !!this.fields
      ? `RETURNING ${[...this.fields].join(',' + this.delimiter)}${this.delimiter}`
      : '';

    return `${insertInto}${keys}${values}${returning}`;
  };

  private formatDelete = () => {
    const deleteFrom = `DELETE FROM ${this.schema}."${this.table}"${this.delimiter}`;
    const where = !!this.whereClauses
      ? `WHERE ${[...this.whereClauses].join(this.delimiter + 'AND ')}${this.delimiter}`
      : '';
    const returning = !!this.fields
      ? `RETURNING ${[...this.fields].join(',' + this.delimiter)}`
      : '';

    return `${deleteFrom}${where}${returning}`;
  };

  private formatUpdate = () => {
    const update = `UPDATE ${this.schema}."${this.table}"${this.delimiter}`;
    const set = `SET (${this.delimiter}${this.changeKeys!.join(',' + this.delimiter)}${this.delimiter})`;
    const values = ` = (${this.delimiter}${this.changeValues!.join(',' + this.delimiter)}${this.delimiter})${this.delimiter}`;
    const where = !!this.whereClauses
      ? `WHERE ${[...this.whereClauses].join(this.delimiter + 'AND ')}${this.delimiter}`
      : '';
    const returning = !!this.fields
      ? `RETURNING ${[...this.fields].join(',' + this.delimiter)}`
      : '';

    return `${update}${set}${values}${where}${returning}`;
  };
}
