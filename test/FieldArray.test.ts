import {FieldArray, NotAllowedToTake, NotPossibleToSteal} from '../src/FieldArray'

describe('FieldArray', () => {
  describe('isAllowedToTake', () => {
    it.each([
      [FieldArray.createFrom([2, 2]), 0],
      [FieldArray.createNewInitialized(), 0],
      [FieldArray.createNewInitialized(), 1],
      [FieldArray.createNewInitialized(), 15]])(
      'allowed to take with fieldArray:\n%s\n and index %i',
      (arr, index) => {
        expect((arr as FieldArray).isAllowedToTake(index as number).isAllowed).toBe(true);
      },
    );

    it.each([
      [FieldArray.createFrom([2, 2]), 2, 'notAllowedBecauseIndexOutOfBound'],
      [FieldArray.createFrom([1, 2]), 0, 'notAllowedBecauseNotEnoughStones'],
      [FieldArray.createFrom([0, 2]), 0, 'notAllowedBecauseNoStoneExists']])(
      'not allowed to take with fieldArray:\n%s\n and %i because %s',
      (arr, index, reason) => {
        const result = (arr as FieldArray).isAllowedToTake(index as number);
        expect(result.isAllowed).toBe(false);
        expect((result as NotAllowedToTake).reason).toBe(reason);
      },
    );
  });

  describe('take', () => {
    it.each([
      [
        FieldArray.createFrom([2, 0, 0, 0, 0, 0]),
        0,
        FieldArray.createFrom([0, 1, 1, 0, 0, 0])
      ],
      [
        FieldArray.createFrom([3, 0, 0, 0, 0, 0]),
        0,
        FieldArray.createFrom([0, 1, 1, 1, 0, 0])
      ],
      [
        FieldArray.createFrom([0, 0, 0, 3, 0, 0]),
        3,
        FieldArray.createFrom([1, 0, 0, 0, 1, 1])
      ],
      [
        FieldArray.createFrom([7, 0, 0, 0, 0, 0]),
        0,
        FieldArray.createFrom([1, 2, 1, 1, 1, 1])
      ],
      [
        FieldArray.createFrom([0, 0, 2, 0, 0, 0]),
        2,
        FieldArray.createFrom([0, 0, 0, 1, 1, 0])
      ],
      [
        FieldArray.createFrom([1, 1, 0, 0, 0, 2]),
        5,
        FieldArray.createFrom([2, 2, 0, 0, 0, 0])
      ]
    ])(
      'take with fieldArray:\n%s\n and index %i, expected: \n%s\n',
      (arr, index, expected) => {
        const updated = (arr as FieldArray).take(index as number).updated;
        try {
          expect(updated).toEqual(expected);
        } catch {
          throw new Error(`But was:\n${updated.toString()}`)
        }
      },
    );
  });

  describe('isPossibleToSteal', () => {
    it.each([
      [FieldArray.createNewInitialized(), 0, FieldArray.createFullFrom(FieldArray.createNewInitialized())],
      [FieldArray.createFrom([0, 0, 2, 0, 0, 0]), 2, FieldArray.createFullFrom({length: 6})],
      [FieldArray.createFrom([2, 0, 0, 0, 0, 0]), 0, FieldArray.createFrom([0, 0, 2, 0, 0, 0])],
      [FieldArray.createFrom([0, 2, 0, 0, 0, 0]), 1, FieldArray.createFrom([0, 2, 0, 0, 0, 0])],
      [FieldArray.createFrom([0, 0, 2, 0, 0, 0]), 2, FieldArray.createFrom([2, 0, 0, 0, 0, 0])]
    ])(
      'possible to steal with fieldArray:\n%s\n and index %i and OtherFieldArray:\n%s\n',
      (arr, index, other) => {
        expect((arr as FieldArray).isPossibleToSteal(index as number, other as FieldArray).isPossible).toBe(true);
      },
    );

    it.each([
      [FieldArray.createNewInitialized(), 8, FieldArray.createFullFrom(FieldArray.createNewInitialized()), 'notPossibleBecauseSecondRow'],
      [FieldArray.createFrom([2, 0, 0, 0, 2, 0]), 4, FieldArray.createFullFrom(FieldArray.createNewInitialized()), 'notPossibleBecauseSecondRow'],
      [FieldArray.createFrom([0, 1, 0, 0, 0, 0]), 1, FieldArray.createFullFrom(FieldArray.createNewInitialized()), 'notPossibleBecauseNotEnoughStones'],
      [FieldArray.createFrom([2, 0, 0, 0, 0, 0]), 0, FieldArray.createFrom([2, 2, 0, 2, 2, 2]), 'notPossibleBecauseOtherSideHasNoStones'],
    ])(
      'not possible to steal with fieldArray:\n%s\n and %i and otherFieldArray:\n%s\n because %s',
      (arr, index, other, reason) => {
        const result = (arr as FieldArray).isPossibleToSteal(index as number, other as FieldArray);
        expect(result.isPossible).toBe(false);
        expect((result as NotPossibleToSteal).reason).toBe(reason);
      },
    );
  });

  describe('steal', () => {
    it.each([
      [
        FieldArray.createFrom([2, 0, 0, 0, 0, 0]),
        FieldArray.createFrom([0, 0, 2, 0, 0, 0]),
        0,
        FieldArray.createFrom([4, 0, 0, 0, 0, 0]),
        FieldArray.createFrom([0, 0, 0, 0, 0, 0])
      ]
    ])(
      'steal with fieldArray:\n%s\n and index %i and fieldArray:\n%s\n, expected: \n%s\n and \n%s\n',
      (arr, other, index, expected, expectedStolenFrom) => {
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
      },
    );
  });
});
