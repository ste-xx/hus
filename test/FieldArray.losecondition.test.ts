import {FieldArray} from "../src/FieldArray";

describe('fieldArray', () => {
  /* eslint-disable indent,@typescript-eslint/indent */
  // @formatter:off
  it.each`
     note                         | arr                                            | expected               
     ${'lose: top row empty'}     | ${FieldArray.createFrom([0, 0, 2, 2])}   | ${true}
     ${'lose: stones < 2'}        | ${FieldArray.createFrom([1, 1, 1, 1])}   | ${true}
     ${'lose: stones < 2'}        | ${FieldArray.createFrom([1, 0, 0, 1])}   | ${true}
     ${'!lose: init'}             | ${FieldArray.createNewInitialized()}           | ${false}
     ${'!lose: bottom row empty'} | ${FieldArray.createFrom([2, 2, 0, 0])}   | ${false}
     ${'!lose'}                   | ${FieldArray.createFrom([1, 1, 2, 2])}   | ${false}
    `('$note arr: $arr.prettyPrint expected: $expected', async ({arr, expected}) => {
    // @formatter:on
    expect(arr.isInLoseCondition()).toBe(expected);
  });
});
