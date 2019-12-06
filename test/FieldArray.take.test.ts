import {FieldArray, NotAllowedToTake, NotPossibleToSteal} from '../src/FieldArray'

describe('FieldArray', () => {
  describe('isAllowedToTake', () => {
    /* eslint-disable indent,@typescript-eslint/indent */
    // @formatter:off
    it.each`
       arr                                     | index               
       ${FieldArray.createFrom([2, 2])}  | ${0}
       ${FieldArray.createNewInitialized()}    | ${0}
       ${FieldArray.createNewInitialized()}    | ${1}
       ${FieldArray.createNewInitialized()}    | ${15}
      `('allowed to take with fieldArray: $arr.prettyPrint $index', async ({arr, index}) => {
      // @formatter:on
      expect((arr as FieldArray).isAllowedToTake(index as number).isAllowed).toBe(true);
    });
    /* eslint-enable indent,@typescript-eslint/indent */

    /* eslint-disable indent,@typescript-eslint/indent */
    // @formatter:off
    it.each`
       reason                                   | arr                                     | index               
       ${'notAllowedBecauseIndexOutOfBound'}    | ${FieldArray.createFrom([2, 2])} | ${2}
       ${'notAllowedBecauseNotEnoughStones'}    | ${FieldArray.createFrom([1, 2])} | ${0}
       ${'notAllowedBecauseNoStoneExists'}      | ${FieldArray.createFrom([0, 2])} | ${0}
      `('not allowed to take with fieldArray: $arr.prettyPrint $index ', async ({arr, index,reason}) => {
      // @formatter:on
      const result = (arr as FieldArray).isAllowedToTake(index as number);
      expect(result.isAllowed).toBe(false);
      expect((result as NotAllowedToTake).reason).toBe(reason);
    });
  });

  describe('take', () => {
    /* eslint-disable indent,@typescript-eslint/indent */
    // @formatter:off
    it.each`
       arr                                               | index          | expected
       ${FieldArray.createFrom([2, 0, 0, 0, 0, 0])} | ${0} | ${FieldArray.createFrom([0, 1, 1, 0, 0, 0])} 
       ${FieldArray.createFrom([3, 0, 0, 0, 0, 0])} | ${0}           | ${FieldArray.createFrom([0, 1, 1, 1, 0, 0])}
       ${FieldArray.createFrom([0, 0, 0, 3, 0, 0])} | ${3}           | ${FieldArray.createFrom([1, 0, 0, 0, 1, 1])}
       ${FieldArray.createFrom([7, 0, 0, 3, 0, 0])} | ${0}           | ${FieldArray.createFrom([1, 2, 1, 4, 1, 1])}
       ${FieldArray.createFrom([0, 0, 2, 0, 0, 0])} | ${2}           | ${FieldArray.createFrom([0, 0, 0, 1, 1, 0])}
       ${FieldArray.createFrom([1, 1, 0, 0, 0, 2])} | ${5}           | ${FieldArray.createFrom([2, 2, 0, 0, 0, 0])}
      `('take with fieldArray: $arr.prettyPrint $index $expected.prettyPrint', async ({arr, index, expected}) => {
      // @formatter:on
      const updated = (arr as FieldArray).take(index as number).updated;
      try {
        expect(updated).toEqual(expected);
      } catch {
        throw new Error(`But was:\n${updated.toString()}`)
      }
    });
    /* eslint-enable indent,@typescript-eslint/indent */
  });
});
