import { WHERE_CLAUSE_MAP, VALUE_KEYWORDS } from './constants';
import { InitializationOptions } from './types/common';
import { Field } from './types/field';
import { Join } from './types/join';
import { BuilderMethods } from './types/methods';
import { OrderBy } from './types/order';
import { Where } from './types/where';

export class SQURL {
  public static avg = (field: string, table: string) =>
    `AVG("${table}".${field})`;

  public static count = (field: string, table: string) =>
    `COUNT("${table}".${field})`;

  public static max = (field: string, table: string) =>
    `MAX("${table}".${field})`;

  public static min = (field: string, table: string) =>
    `MIN("${table}".${field})`;

  public static sum = (field: string, table: string) =>
    `SUM("${table}".${field})`;

  private alias?: string;
  private delimiter: ' ' | '\n' = '\n';
  private schema?: string;
  private table: string;
  private type!: 'SELECT' | 'DELETE' | 'INSERT' | 'UPDATE';
  private placeholderChar: string | null;

  private fields?: Set<string>;
  private joinTerms?: Set<string>;
  private joinTableKeys?: Set<string>;
  private whereClauses?: Set<string>;
  private groupByTerms?: Set<string>;
  private havingClauses?: Set<string>;
  private orderByTerms?: Set<string>;
  private limitAmt?: number;
  private offsetAmt?: number;
  private changeKeys?: string[];
  private changeValues?: string[];
  private placeholders?: string[];

  constructor(table: string, options?: InitializationOptions) {
    this.schema = options?.schema;
    this.table = table;
    this.delimiter = !!options?.pretty ? '\n' : ' ';
    this.placeholderChar = !!options?.placeholderChar
      ? options.placeholderChar
      : null;
  }

  public as: BuilderMethods.As = (alias: string) => {
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

  public update: BuilderMethods.Update = (obj: Record<string, unknown>) => {
    this.type = 'UPDATE';
    this.changeKeys = Object.keys(obj);
    this.changeValues = Object.values(obj).map(this.formatValue);

    return {
      query: this.query,
      returning: this.returning,
      where: this.where,
    };
  };

  public insert: BuilderMethods.Insert = (obj: Record<string, unknown>) => {
    this.type = 'INSERT';
    this.changeKeys = Object.keys(obj);
    this.changeValues = Object.values(obj).map(this.formatValue);
    return {
      query: this.query,
      returning: this.returning,
    };
  };

  private formatValue = (value: unknown) => {
    if (Array.isArray(value)) {
      return `{${value.map((item) => `"${item}"`).join(', ')}}`;
    } else if (typeof value === 'string' && VALUE_KEYWORDS.includes(value)) {
      return value;
    } else if (typeof value === 'number') {
      return `${value}`;
    } else if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return `${value}`;
  };

  public delete: BuilderMethods.Delete = () => {
    this.type = 'DELETE';
    return {
      query: this.query,
      returning: this.returning,
      where: this.where,
    };
  };

  private formatField = (bldr: Field, table: string) => {
    const schema = this.schema && !this.alias ? this.schema + '.' : '';
    if (
      typeof bldr === 'string' &&
      ['AVG', 'SUM', 'COUNT', 'MIN', 'MAX'].some((item) =>
        bldr.startsWith(item)
      )
    ) {
      return bldr;
    } else if (typeof bldr === 'string') {
      return `${schema}"${table}".${bldr}`;
    } else {
      const { alias, fields, groupByKey = 'id', relationship } = bldr;

      const jsonAggValue = `jsonb_build_object(${this.delimiter}${fields
        .map(
          (field) =>
            `'${field}', ${schema}"${table}".${field},${this.delimiter}`
        )
        .join('')}'${groupByKey}', ${schema}"${table}".${groupByKey})`;

      if (relationship === 'ONE_TO_ONE') {
        return `${jsonAggValue}${this.delimiter}AS "${alias}"`;
      } else {
        return `COALESCE(${this.delimiter}jsonb_agg(${this.delimiter}DISTINCT ${jsonAggValue}${this.delimiter})${this.delimiter}FILTER (WHERE ${schema}"${table}".${groupByKey} IS NOT NULL), '[]'${this.delimiter})${this.delimiter}AS "${alias}"`;
      }
    }
  };

  private join: BuilderMethods.Join = (join: Join) => {
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

    const joinTerm = `${join.type || 'LEFT'} JOIN ${this.schema}."${join.tables.right}"${join.aliases?.right ? ' AS "' + join.aliases.right + '"' : ''}`;
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

  private returning: BuilderMethods.Returning = (fields: string[]) => {
    this.fields = new Set<string>();

    for (const field of fields) {
      this.fields.add(this.formatField(field, this.alias || this.table));
    }

    return {
      query: this.query,
      where: this.where,
    };
  };

  private limit: BuilderMethods.Limit = (amount: number) => {
    this.limitAmt = amount;
    return {
      offset: this.offset,
      query: this.query,
    };
  };

  private offset: BuilderMethods.Offset = (amount: number) => {
    this.offsetAmt = amount;
    return {
      query: this.query,
    };
  };

  private groupBy: BuilderMethods.GroupBy = (
    fields: { field: string; table: string }[]
  ) => {
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
    if (!this.placeholders) {
      this.placeholders = [];
    }

    const placeholderLength =
      this.type === 'UPDATE'
        ? (this.changeKeys?.length || 0) + this.placeholders.length + 1
        : this.placeholders.length + 1;

    if (clause?.between) {
      this.placeholders.push(this.formatValue(clause.between[0]));
      this.placeholders.push(this.formatValue(clause.between[1]));
      return `${WHERE_CLAUSE_MAP['between']} ${this.placeholderChar || `$${placeholderLength}`} AND ${this.placeholderChar || `$${placeholderLength + 1}`}`;
    } else if (clause?.equals) {
      this.placeholders.push(this.formatValue(clause.equals));
      return `${WHERE_CLAUSE_MAP['equals']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.gt) {
      this.placeholders.push(this.formatValue(clause.gt));
      return `${WHERE_CLAUSE_MAP['gt']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.gte) {
      this.placeholders.push(this.formatValue(clause.gte));
      return `${WHERE_CLAUSE_MAP['gte']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.in) {
      this.placeholders.push(this.formatValue(clause.in));
      return `${WHERE_CLAUSE_MAP['in']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.is) {
      this.placeholders.push(this.formatValue(clause.is));
      return `${WHERE_CLAUSE_MAP['is']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.isNot) {
      this.placeholders.push(this.formatValue(clause.isNot));
      return `${WHERE_CLAUSE_MAP['isNot']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.like) {
      this.placeholders.push(this.formatValue(clause.like));
      return `${WHERE_CLAUSE_MAP['like']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.lt) {
      this.placeholders.push(this.formatValue(clause.lt));
      return `${WHERE_CLAUSE_MAP['lt']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else if (clause?.lte) {
      this.placeholders.push(this.formatValue(clause.lte));
      return `${WHERE_CLAUSE_MAP['lte']} ${this.placeholderChar || `$${placeholderLength}`}`;
    } else {
      throw Error('Clause operator not recognized');
    }
  };

  private having: BuilderMethods.Having = (clauses: Where[]) => {
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

  private orderBy: BuilderMethods.OrderBy = (orderByTerms: OrderBy[]) => {
    if (!this.orderByTerms) {
      this.orderByTerms = new Set<string>();
    }

    for (const orderBy of orderByTerms) {
      this.orderByTerms.add(
        `"${orderBy?.table || this.alias || `${this.schema}."${this.table}"`}".${orderBy.field} ${orderBy.sort_order?.toUpperCase()}`
      );
    }

    return {
      limit: this.limit,
      query: this.query,
    };
  };

  private where: BuilderMethods.Where = (clauses: Where[]) => {
    this.whereClauses = new Set<string>();

    for (const clause of clauses) {
      this.whereClauses.add(
        `${`${this.schema && !this.alias ? this.schema + '.' : ''}"${clause?.table || this.alias || this.table}".${clause.field}`} ${this.findClause(clause)}`
      );
    }

    return {
      groupBy: this.groupBy,
      limit: this.limit,
      orderBy: this.orderBy,
      query: this.query,
    };
  };

  private query: BuilderMethods.Query = () => {
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
    const fields = `${[...this.fields!]}${this.delimiter}`;
    const select = `SELECT${this.delimiter}`;
    const from = `FROM ${this.schema ? this.schema + '.' : ''}"${this.table}"${this.delimiter}`;
    const as = this.alias ? ` AS "${this.alias}"${this.delimiter}` : '';
    const join = !!this.joinTerms
      ? `${[...this.joinTerms].join(this.delimiter)}${this.delimiter}`
      : '';
    const where = !!this.whereClauses
      ? `WHERE ${[...this.whereClauses].join(this.delimiter + 'AND ')}${this.delimiter}`
      : '';
    const groupBy = !!this.groupByTerms
      ? `GROUP BY ${[...this.groupByTerms].join(',')}${this.delimiter}`
      : '';
    const having = !!this.havingClauses
      ? `HAVING ${[...this.havingClauses].join(',' + this.delimiter)}${this.delimiter}`
      : '';
    const orderBy = !!this.orderByTerms
      ? `ORDER BY ${[...this.orderByTerms].join(',' + this.delimiter)}${this.delimiter}`
      : '';
    const limit = !!this.limitAmt
      ? `LIMIT ${this.limitAmt}${this.delimiter}`
      : '';
    const offset = !!this.offsetAmt
      ? `OFFSET ${this.offsetAmt}${this.delimiter}`
      : '';

    const query = `${select}${fields}${from}${as}${join}${where}${groupBy}${having}${orderBy}${limit}${offset}`;

    return {
      query,
      placeholders: this.placeholders,
    };
  };

  private formatInsert = () => {
    const placeholders: string[] = [];

    const insertInto = `INSERT INTO ${this.schema ? this.schema + '.' : ''}"${this.table}"${this.delimiter}`;
    const keys = `(${this.delimiter}${this.changeKeys!.map((item) => {
      return `"${item}"`;
    }).join(',' + this.delimiter)}${this.delimiter})${this.delimiter}`;
    const values = `VALUES (${this.delimiter}${this.changeValues!.map(
      (value) => {
        placeholders.push(value);
        return `${this.placeholderChar || `$${placeholders.length}`}`;
      }
    )!.join(',' + this.delimiter)}${this.delimiter})${this.delimiter}`;
    const returning = !!this.fields
      ? `RETURNING ${[...this.fields].join(',' + this.delimiter)}${this.delimiter}`
      : '';

    const query = `${insertInto}${keys}${values}${returning}`;
    return {
      query,
      placeholders,
    };
  };

  private formatDelete = () => {
    const deleteFrom = `DELETE FROM ${this.schema ? this.schema + '.' : ''}"${this.table}"${this.delimiter}`;
    const where = !!this.whereClauses
      ? `WHERE ${[...this.whereClauses].join(this.delimiter + 'AND ')}${this.delimiter}`
      : '';
    const returning = !!this.fields
      ? `RETURNING ${[...this.fields].join(',' + this.delimiter)}`
      : '';

    const query = `${deleteFrom}${where}${returning}`;

    return {
      query,
      placeholders: this.placeholders,
    };
  };

  private formatUpdate = () => {
    const placeholders: string[] = [];

    const update = `UPDATE ${this.schema ? this.schema + '.' : ''}"${this.table}"${this.delimiter}`;
    const set = `SET${this.delimiter}${this.changeKeys!.map((item, i) => {
      if (this.changeValues![i]) {
        placeholders.push(this.changeValues![i]);
      }
      return `"${item}" = $${i + 1}`;
    }).join(',' + this.delimiter)}${this.delimiter}`;
    const where = !!this.whereClauses
      ? `WHERE ${[...this.whereClauses].join(this.delimiter + 'AND ')}${this.delimiter}`
      : '';
    const returning = !!this.fields
      ? `RETURNING ${[...this.fields].join(',' + this.delimiter)}`
      : '';

    const query = `${update}${set}${where}${returning}`;

    return {
      query,
      placeholders: [...placeholders, ...(this.placeholders || [])],
    };
  };
}
