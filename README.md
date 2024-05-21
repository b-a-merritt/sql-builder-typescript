<div style="display: flex; align-items: center; justify-content: space-between; max-width: 500px"> 
  <h1 style='font-size: 40px; color: #4287f5; text-decoration: none;'>PostgreSquirrel</h1>
  <img src='./public/logo.svg' style="height: 200px; width: 250px;">
</div>
<div style="display:flex; gap: 48px;">
  <div style="display:flex; gap: 16px;">
    <p>Install Size</p>
    <a href="https://pkg-size.dev/postgresqurl"><img src="https://pkg-size.dev/badge/install/21851" title="Install size for postgresqurl"></a>
  </div>
  <div style="display:flex; gap: 16px;">
    <p>Bundle Size</p>
    <a href="https://pkg-size.dev/postgresqurl"><img src="https://pkg-size.dev/badge/bundle/7338" title="Bundle size for postgresqurl"></a>
  </div>
</div>

PostgreSquirrel (or SQURL) is a PostgreSQL query builder without plans to be anything else. Instead of doing many things poorly, why not do one thing well? (With your help, of course, so please report issues and make PRs).

SQURL is not meant to abstract away the intricacies of SQL, nor is it meant to make it so its users don't need to know SQL. It is intended for the average SQL enjoyer to write SQL queries faster (while in a JavaScript environment). Ever forget if `ORDER BY` comes before or after `GROUP BY`? SQURL will tell you. To do so, the SQURL query builder uses the [builder pattern](https://refactoring.guru/design-patterns/builder).

# Getting Started

To create a query, one must begin by instantiating a new query

```TypeScript
const query = new SQURL('User')
```

One may pass an optional configuration as the second argument, the fields of which are all optional. The `pretty` key prints the query on new lines for better readability.

```TypeScript
const config = {
  pretty: true,
  schema: 'public',
}

const query = new SQURL('User', config)
```

All queries are terminated by the `.query` method, which returns the following type

```TypeScript
type Query {
  query: string;
  placeholders?: string[];
}
```

If you need convincing about SQURL doesn't use string concatenation, [placeholders are enough to prevent SQL injection](https://stackoverflow.com/a/306675)

## Aliases

Before getting into the creation of the queries, a quick note about aliasing:

SQURL specifies aliases next to the tables it modifies. The alias is specified in the next method for the table specified in the query's instantiation.

```TypeScript
const query = new SQURL('User')
  .as('u')
```

However, aliases are specified next to where they are first introduced for all other tables. This is because code is most manageable to read when logic is combined (locality of behavior).

```TypeScript
const join = {
  fields: ['id'],
  on: { left: 'id', right: 'user_id' },
  tables: { left: 'User', right: 'ContactInfo' },
  aliases: { left: 'u', right: 'ci' },
  type: 'LEFT',
}
```

## SELECT

Just like a raw PostgreSQL query, SQURL `SELECT` queries support no, one, or many `JOIN`s, `WHERE` and `GROUP BY` clauses, and `ORDER BY`, `OFFSET`, and `LIMIT` declarations.

The anatomy of a SQURL `SELECT` query follows the same anteriority of normal PostgreSQL queries as well.

For example, this SQURL query

```TypeScript
const query = new SQURL('User')
  .select(['id', 'first_name', 'last_name'])
  .join({
    fields: ['address1', 'city', 'oblast'],
    on: { left: 'id', right: 'user_id' },
    tables: { left: 'User', right: 'ContactInfo' },
    type: 'LEFT',
  })
  .where([
    {
      table: 'User',
      field: 'last_name',
      between: ['Blazheiev', 'Honcharyuk']
    },
    {
      table: 'ContactInfo',
      field: 'oblast',
      equals: 'Lvivska',
    }
  ])
  .orderBy([
    {
      field: 'last_name',
      sort_order: 'asc',
      table: 'User',
    }
  ])
  .limit(5)
  .offset(15)
  .query();
```

yields the following query

```SQL
SELECT
  $1,$2,$3,$4,$5,$6
FROM public."User"
LEFT JOIN public."ContactInfo"
ON public."User".id = public."ContactInfo".user_id
WHERE $7 BETWEEN $8 AND $9
AND $10 = $11
ORDER BY "User".last_name
LIMIT 5
OFFSET 15
```

and these placeholders

```TypeScript
[
  '"User".id',
  '"User".first_name',
  '"User".last_name',
  '"ContactInfo".address1',
  '"ContactInfo".city',
  '"ContactInfo".oblast',
  '"User".last_name',
  "'Blazheiev'",
  "'Honcharyuk'",
  '"ContactInfo".oblast',
  "'Lvivska'"
]
```

### Nested Objects and Arrays

One interesting feature of SQURL is its ability to make nested objects without resorting to subqueries. Oftentimes, relations are easier to treat as object or array fields of the response instead of simply strings. One can do so by replacing a `string` field with the following:

```TypeScript
const query = new SQURL('User')
  .select(['id', 'first_name', 'last_name'])
  .join({
    fields: [
      {
        alais: 'contact_info',
        fields: ['address1', 'city', 'oblast'],
        groupByKey: 'id',
        relationship: 'ONE_TO_ONE',
      }
    ],
    on: { left: 'id', right: 'user_id' },
    tables: { left: 'User', right: 'ContactInfo' },
    type: 'LEFT',
  })
  .query();
```

What that gives you is this query

```SQL
SELECT
$1,$2,$3,$4
FROM public."User"
LEFT JOIN public."ContactInfo"
ON public."User".id = public."ContactInfo".user_id
```

these placeholdres

```TypeScript
[
  '"User".id',
  '"User".first_name',
  '"User".last_name',
  `jsonb_build_object(
    'address1', "ContactInfo".address1,
    'city', "ContactInfo".city,
    'oblast', "ContactInfo".oblast,
    'id', "ContactInfo".id
  ) AS "contact_info"`
]
```

and ultimately, a response that looks like this

```JSON
[
  {
    "id": 1,
    "first_name": "Ben",
    "last_name": "Merritt",
    "contact_info": {
      "address1": "Svobody Ave, 28",
      "city": "Lviv",
      "oblast": "Lvivska",
      "id": 1
    }
  },
  ...
]
```

These types of queries work for `ONE_TO_MANY` relationships as well, returning an array of objects when specified. Right now, SQURL only supports this nesting one level deep. One can get around this limitation by using this type of field on an even deeper join.

## UPDATE

The SQURL update method accepts `Record<string, unknown>` and allows for keywords such as `ARRAY`, `CURRENT_DATE`, `CURRENT_TIMESTAMP`, and `DEFAULT` to be used in addition to whatever `string`, `number` or `Date` is specified.

For example:

```TypeScript
const query = new SQURL('User')
  .update({
    first_name: 'Ben',
    last_name: 'Merritt',
    interests: ['God', 'Catholicism', 'Ukrainian Victory'],
  })
  .returning(['id', 'first_name', 'last_name', 'interests'])
  .where([
    {
      field: 'id',
      equals: 1,
    }
  ])
  .query();
```

yields

```SQL
UPDATE public."User"
SET ( first_name, last_name, interests )
VALUES ( $1, $2, $3 )
WHERE $5 = $6
RETURNING id, first_name, last_name, interests
```

with placeholders

```TypeScript
[
  "'Ben'",
  "'Merritt'",
  "'{God, Catholicism, Ukrainian Victory}'",
  '"User".id',
  '1'
]
```

If you are accustomed to ORM's, remember to specify the `returning()` method or you will not get those fields in the response.

## INSERT

SQURL's insert method works the same as update.

```TypeScript
const query = new SQURL('User', { pretty: true })
  .insert({
    id: 'DEFAULT',
    first_name: 'Ben',
    ...
  })
  .returning(['id'])
  .query();
```

## DELETE

Lastly, we have SQURL's delete method. No surpise--it works just like the others

```TypeScript
const query = new SQURL('User')
  .delete()
  .returning(['id', 'first_name', 'approved_at', 'last_name'])
  .where([
    {
      field: 'id',
      equals: 1,
    }
  ])
  .query();
```
