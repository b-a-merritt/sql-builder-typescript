import { SQURL } from '../builder';

describe('update', () => {
  test('all', () => {
    const query = new SQURL('User')
      .update({
        date_of_birth: new Date(),
      })
      .query();
    const expected = `UPDATE "User" SET date_of_birth = $1 `;
    expect(query.query).toEqual(expected);
  });

  test('where', () => {
    const query = new SQURL('User')
      .update({
        date_of_birth: new Date(),
        first_name: 'Benjamin',
      })
      .where([
        {
          field: 'id',
          equals: 6,
          table: 'User',
        },
      ])
      .query();
    const expected = `UPDATE "User" SET date_of_birth = $1, first_name = $2 WHERE "User".id = $3 `;
    expect(query.query).toEqual(expected);
    expect(query.placeholders?.length).toEqual(3);
  });

  test('returning', () => {
    const query = new SQURL('User')
      .update({
        date_of_birth: new Date(),
        first_name: 'Benjamin',
      })
      .returning(['id', 'date_of_birth'])
      .query();
    const expected = `UPDATE "User" SET date_of_birth = $1, first_name = $2 RETURNING "User".id, "User".date_of_birth`;
    expect(query.query).toEqual(expected);
    expect(query.placeholders?.length).toEqual(2);
  });
});
