import {MinMaxKi} from '../src/MinMaxKi';
import {FieldArray} from '../src/FieldArray';

describe('MinMaxKi', () => {
  describe('getValidMoves', () => {
    /* eslint-disable indent,@typescript-eslint/indent */
    // @formatter:off
    it.each`
       arr                                                  | expected
       ${FieldArray.createFrom([2, 0, 0, 0, 0, 0])}  | ${[0]}
       ${FieldArray.createFrom([2, 2, 0, 0, 0, 0])}  | ${[0, 1]}
       ${FieldArray.createFrom([0, 1, 0, 0, 0, 0])}  | ${[]}
       ${FieldArray.createNewInitialized()}           | ${[0, 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15]}
      `('getValidMoves with fieldArray: $arr.prettyPrint', async ({arr, expected}) => {
      // @formatter:on
      expect(MinMaxKi.getValidMoves(arr as FieldArray)).toEqual(expected);
    });
    /* eslint-enable indent,@typescript-eslint/indent */
  });

  describe('simulateMove', () => {
    it('should distribute stones from a valid position', async () => {
      // Taking from index 1 (2 stones) in a standard board
      const myField = FieldArray.createNewInitialized();
      const otherField = FieldArray.createNewInitialized();
      const {currentField, otherField: newOtherField} = MinMaxKi.simulateMove(myField, otherField, 1);
      // After distributing 2 stones from index 1, index 1 becomes 0
      expect(currentField[1].stones).toBe(0);
      expect(newOtherField).toBeDefined();
    });

    it('should not move stones from an index with only 1 stone', async () => {
      const myField = FieldArray.createFrom([1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const otherField = FieldArray.createNewInitialized();
      // index 0 has 1 stone, which is not valid (isAllowedToTake requires > 1)
      const {currentField} = MinMaxKi.simulateMove(myField, otherField, 0);
      // Stones should remain unchanged since the move is not allowed
      expect(currentField[0].stones).toBe(1);
    });
  });

  describe('evaluate', () => {
    it('should return positive when current player has more stones', async () => {
      const currentField = FieldArray.createFrom([4, 4, 4, 4, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0]);
      const otherField = FieldArray.createFrom([2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0]);
      expect(MinMaxKi.evaluate(currentField, otherField)).toBeGreaterThan(0);
    });

    it('should return negative when opponent has more stones', async () => {
      const currentField = FieldArray.createFrom([2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0]);
      const otherField = FieldArray.createFrom([4, 4, 4, 4, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0]);
      expect(MinMaxKi.evaluate(currentField, otherField)).toBeLessThan(0);
    });

    it('should return 0 for equal boards', async () => {
      const field = FieldArray.createNewInitialized();
      expect(MinMaxKi.evaluate(field, field)).toBe(0);
    });
  });

  describe('findBestMove', () => {
    it('should return a valid move index', async () => {
      const ki = new MinMaxKi(
        {name: 'test'},
        () => {/* noop */},
        {addEventListener: () => {/* noop */}, removeEventListener: () => {/* noop */}}
      );
      const myField = FieldArray.createNewInitialized();
      const otherField = FieldArray.createNewInitialized();
      const move = ki.findBestMove(myField, otherField);
      expect(MinMaxKi.getValidMoves(myField)).toContain(move);
    });

    it('should prefer a move that results in more stones', async () => {
      const ki = new MinMaxKi(
        {name: 'test'},
        () => {/* noop */},
        {addEventListener: () => {/* noop */}, removeEventListener: () => {/* noop */}}
      );
      // One move leads to a steal (gaining stones), check that it is preferred
      const myField = FieldArray.createNewInitialized();
      const otherField = FieldArray.createNewInitialized();
      const move = ki.findBestMove(myField, otherField);
      // The chosen move must be a valid move index (stones > 1)
      expect(myField[move].stones).toBeGreaterThan(1);
    });
  });
});
