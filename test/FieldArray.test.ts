import {FieldArray} from "../src/FieldArray";

describe('fieldArray', () => {
  it('should print correctly', async () => {
    expect(FieldArray.createFrom([2, 4, 5, 6, 1, 4]).prettyPrint).toEqual(
      "┌──────┬──────┬──────┐\n│ A1:2 │ A2:4 │ A3:5 │\n├──────┼──────┼──────┤\n│ B1:4 │ B2:1 │ B3:6 │\n└──────┴──────┴──────┘"
    );
  });
});
