import {FieldArray, NotAllowedToTake, NotPossibleToSteal} from '../src/FieldArray'

describe('FieldArray', () => {
  describe('isPossibleToSteal', () => {
    /* eslint-disable indent,@typescript-eslint/indent */
    // @formatter:off
    it.each`
       arr                                                | index           | other              
       ${FieldArray.createNewInitialized()}               | ${0} | ${FieldArray.createFullFrom(FieldArray.createNewInitialized())}
       ${FieldArray.createFrom([0, 0, 2, 0, 0, 0])} | ${2}            | ${FieldArray.createFullFrom({length: 6})}
       ${FieldArray.createFrom([2, 0, 0, 0, 0, 0])} | ${0}            | ${FieldArray.createFrom([0, 0, 2, 0, 0, 0])}
       ${FieldArray.createFrom([0, 2, 0, 0, 0, 0])} | ${1}            | ${FieldArray.createFrom([0, 2, 0, 0, 0, 0])}
       ${FieldArray.createFrom([0, 0, 2, 0, 0, 0])} | ${2}            | ${FieldArray.createFrom([2, 0, 0, 0, 0, 0])}
      `('possible to steal with fieldArray: $arr.prettyPrint $index $other.prettyPrint', async ({arr, index,other}) => {
      // @formatter:on
      expect((arr as FieldArray).isPossibleToSteal(index as number, other as FieldArray).isPossible).toBe(true);
    });
    /* eslint-enable indent,@typescript-eslint/indent */

    /* eslint-disable indent,@typescript-eslint/indent */
    // @formatter:off
    it.each`
       reason                                      | arr                                                | index | other               
       ${'notPossibleBecauseSecondRow'}            | ${FieldArray.createNewInitialized()}               | ${8}  | ${FieldArray.createFullFrom(FieldArray.createNewInitialized())}
       ${'notPossibleBecauseSecondRow'}            | ${FieldArray.createFrom([2, 0, 0, 0, 2, 0])} | ${4}  | ${FieldArray.createFullFrom(FieldArray.createNewInitialized())}
       ${'notPossibleBecauseNotEnoughStones'}      | ${FieldArray.createFrom([0, 1, 0, 0, 0, 0])} | ${1}  | ${FieldArray.createFullFrom(FieldArray.createNewInitialized())}
       ${'notPossibleBecauseOtherSideHasNoStones'} | ${FieldArray.createFrom([2, 0, 0, 0, 0, 0])} | ${0}  | ${FieldArray.createFrom([2, 2, 0, 2, 2, 2])}
      `('$note arr: $arr index: $index ', async ({reason, arr, index, other}) => {
      // @formatter:on
      const result = (arr as FieldArray).isPossibleToSteal(index as number, other as FieldArray);
      expect(result.isPossible).toBe(false);
      expect((result as NotPossibleToSteal).reason).toBe(reason);
    });
    /* eslint-enable indent,@typescript-eslint/indent */
  });

  describe('steal', () => {

    /* eslint-disable indent,@typescript-eslint/indent */
    // @formatter:off
    it.each`
      arr   | index | other | expected | expectedStolenFrom               
      ${FieldArray.createFrom([2, 0, 0, 0, 0, 0])} | 
      ${0} | 
      ${FieldArray.createFrom([0, 0, 2, 0, 0, 0])} | 
      ${FieldArray.createFrom([4, 0, 0, 0, 0, 0])} | 
      ${FieldArray.createFrom([0, 0, 0, 0, 0, 0])}
      `('steal with ' +
      'fieldArray: $arr.prettyPrint and ' +
      'index $index and ' +
      'fieldArray:$other.prettyPrint and ' +
      'expected: $expected.prettyPrint and' +
      'expectedStolenFrom $expectedStolenFrom.prettyPrint', async ({arr, other, index, expected, expectedStolenFrom}) => {
      // @formatter:on
        const {updated, otherAfterStolenFrom} = (arr as FieldArray).steal(index as number, other as FieldArray);
        try {
          expect(updated).toEqual(expected);
        } catch {
          throw new Error(`But updated was:\n${updated.toString()}`)
        }
        try {
          expect(otherAfterStolenFrom).toEqual(expectedStolenFrom);
        } catch {
          throw new Error(`But updatedStolenFrom was:\n${otherAfterStolenFrom.toString()}`)
        }
      });
    /* eslint-enable indent,@typescript-eslint/indent */
  });
});
