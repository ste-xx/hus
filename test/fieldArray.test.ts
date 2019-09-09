import {Field, FieldArray, NotAllowedToTake} from '../src/Game'

describe('fieldArray', () => {
  describe('isAllowedToTake', () => {
    it.each([
      [FieldArray.createFrom([new Field(2), new Field(2)]), 0],
      [FieldArray.createNewInitialized(), 0],
      [FieldArray.createNewInitialized(), 1],
      [FieldArray.createNewInitialized(), 15]])(
      'allowed to take with fieldArray:\n%s\n and index %i',
      (arr, index) => {
        expect((arr as FieldArray).isAllowedToTake(index as number).isAllowed).toBe(true);
      },
    );

    it.each([
      [FieldArray.createFrom([new Field(2), new Field(2)]), 2, 'notAllowedBecauseIndexOutOfBound'],
      [FieldArray.createFrom([new Field(1), new Field(2)]), 0, 'notAllowedBecauseNotMinStones'],
      [FieldArray.createFrom([new Field(0), new Field(2)]), 0, 'notAllowedBecauseNoStoneExists']])(
      'not allowed to take withfieldArray:\n%s\n and %i because %s',
      (arr, index, reason) => {
        const result = (arr as FieldArray).isAllowedToTake(index as number);
        expect(result.isAllowed).toBe(false);
        expect((result as NotAllowedToTake).reason).toBe(reason);
      },
    );
  });
});
