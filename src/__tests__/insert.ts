import { SQURL } from '../builder';

describe('insert', () => {
  test('a record', () => {
    const query = new SQURL('User', { schema: 'public' })
      .insert({
        id: 6,
        first_name: 'Ben',
        last_name: 'Merritt',
      })
      .query();

    const expected =
      'INSERT INTO public."User" ( "id", "first_name", "last_name" ) VALUES ( $1, $2, $3 ) ';

    expect(query.query).toEqual(expected);
    expect(query.placeholders?.[0]).toEqual('6');
    expect(query.placeholders?.[1]).toEqual(`Ben`);
    expect(query.placeholders?.[2]).toEqual(`Merritt`);
  });

  test('returning', () => {
    const query = new SQURL('User', { schema: 'public' })
      .insert({
        id: 6,
        first_name: 'Ben',
        last_name: 'Merritt',
      })
      .returning(['id', 'first_name'])
      .query();

    const expected =
      'INSERT INTO public."User" ( "id", "first_name", "last_name" ) VALUES ( $1, $2, $3 ) RETURNING "User".id, "User".first_name ';

    expect(query.query).toEqual(expected);
    expect(query.placeholders?.[0]).toEqual('6');
    expect(query.placeholders?.[1]).toEqual(`Ben`);
    expect(query.placeholders?.[2]).toEqual(`Merritt`);
  });

  test('an array', () => {
    const query = new SQURL('User', { schema: 'public' })
      .insert({
        id: 6,
        keywords: ['one', 'two', 'three'],
        numbers: [1, 2, 3],
      })
      .query();

    const expected =
      'INSERT INTO public."User" ( "id", "keywords", "numbers" ) VALUES ( $1, $2, $3 ) ';

    expect(query.query).toEqual(expected);
    expect(query.placeholders?.[0]).toEqual('6');
    expect(query.placeholders?.[1]).toEqual(`{"one", "two", "three"}`);
    expect(query.placeholders?.[2]).toEqual(`{"1", "2", "3"}`);
  });
});
