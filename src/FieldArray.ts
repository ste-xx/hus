import {Field} from "./Field";

export type AllowedToTake<T extends boolean> = {
  isAllowed: T;
  map: <U>(f: (v: AllowedToTake<T>) => U) => U;
  combine: (f: () => AllowedToTake<boolean>) => AllowedToTake<boolean>;
  reason: string;
};

export const isNotAllowedToTake = (v: AllowedToTake<boolean>): v is AllowedToTake<false> =>{
  return !v.isAllowed;
}

function createAllowedToTake(): AllowedToTake<true> {
  const self: AllowedToTake<true> = {
    isAllowed: true,
    map: <T>(f: (v: AllowedToTake<true>) => T): T => f(self),
    combine: (f: () => AllowedToTake<boolean>): AllowedToTake<boolean> => f(),
    reason: ''
  };
  return self;
}

function createNotAllowedBecause(reason: string): AllowedToTake<false> {
  const self: AllowedToTake<false> = {
    isAllowed: false,
    map: <T>(f: (v: AllowedToTake<false>) => T) => f(self),
    combine: (): AllowedToTake<false> => self,
    reason: `notAllowedBecause${reason}`
  };
  return self;
}

export interface PossibleToSteal<T extends boolean> {
  isPossible: T;
  map: <U>(f: (v: this) => U) => U;
  combine: (f: () => PossibleToSteal<boolean>) => PossibleToSteal<boolean>;
  reason: string;
}

function createIsPossibleToSteal(): PossibleToSteal<true> {
  const self: PossibleToSteal<true> = {
    isPossible: true,
    map: <T>(f: (v: PossibleToSteal<true>) => T) => f(self),
    combine: (f: () => PossibleToSteal<boolean>): PossibleToSteal<boolean> => f(),
    reason: ''
  };
  return self;
}

export const isNotPossibleToSteal = (v: PossibleToSteal<boolean>): v is PossibleToSteal<false> =>{
  return !v.isPossible;
};

function createIsNotPossibleToStealBecause(reason: string): PossibleToSteal<false> {
  const self: PossibleToSteal<false> = {
    isPossible: false,
    map: <T>(f: (v: PossibleToSteal<false>) => T) => f(self),
    combine: (): PossibleToSteal<false> => self,
    reason: `notPossibleBecause${reason}`
  };
  return self;
}

export interface LooseCondition<T extends boolean> {
  isLoosed: T;
  map: <T>(f: (v: this) => T) => T;
  combine: (f: () => LooseCondition<boolean>) => LooseCondition<boolean>;
  reason: string;
}


function createIsLoosedCondition(reason: string): LooseCondition<true> {
  const self: LooseCondition<true> = {
    isLoosed: true,
    map: <T>(f: (v: LooseCondition<true>) => T): T => f(self),
    combine: (): LooseCondition<boolean> => self,
    reason: ''
  };
  return self;
}

function createNotLoosedCondition(): LooseCondition<false> {
  const self: LooseCondition<false> = {
    isLoosed: false,
    map: <T>(f: (v: LooseCondition<false>) => T) => f(self),
    combine: (f: () => LooseCondition<boolean>): LooseCondition<boolean> => f(),
    reason: ''
  };
  return self;
}


export const whenOtherwise = <T>(predicate: () => boolean, trueFn: () => T, falseFn: () => T): () => T => {
  return (): T => predicate() ? trueFn() : falseFn();
};

function* arrGen<T>(length: number, fn: (index: number) => T): Generator<T> {
  for (let i = 0; i < length; i++) {
    yield fn(i);
  }
}

export class FieldArray {
  [key: number]: Field

  length: number;
  prettyPrint: string;

  constructor(fields: Field[]) {
    fields.forEach((value, index) => this[index] = value);
    this.length = fields.length;
    this.prettyPrint = this.toString();
  }

  public static createFrom(fields: number[]): FieldArray {
    if (fields.length < 2) {
      throw new Error('At least 2 fields are required');
    }
    if (fields.length % 2 !== 0) {
      throw new Error('fields must be dividable by 2')
    }
    return new FieldArray(fields.map(v => new Field(v)));
  }

  public static createNewInitialized(): FieldArray {
    return FieldArray.createFrom([...arrGen(16, (i) => i > 3 && i < 8 ? 0 : 2)]);
  }

  public static createFullFrom({length}: { length: number }): FieldArray {
    return FieldArray.createFrom([...arrGen(length, () => 2)]);
  }

  * [Symbol.iterator](): Generator<Field> {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }

  private topRow(): Field[] {
    return [...this].slice(0, this.length / 2)
  }

  private isTopRow(index: number): boolean {
    return index < this.length / 2
  }

  private isBottomRow(index: number): boolean {
    return !this.isTopRow(index);
  }

  private bottomRow(): Field[] {
    return [...this].slice(this.length / 2, this.length)
  }

  private otherSideIndex(index: number): number {
    return Math.abs(this.length / 2 - index) - 1;
  }

  public toString(): string {
    return [
      ...this.topRow()
        .map(({stones}, i) => `A${i + 1}:${stones}`),
      ...this.bottomRow()
        .reverse()
        .map(({stones}, i) => `B${i + 1}:${stones}`)
    ].reduce((acc, cur, idx) => `${acc}${idx === this.length / 2 ? '\n ' : ' '}${cur}`, '');
  }

  public isAllowedToTake(index: number): (AllowedToTake<boolean>) {
    const inIndexRange = whenOtherwise<AllowedToTake<boolean>>(() => index >= 0 && index < this.length, createAllowedToTake, () => createNotAllowedBecause('IndexOutOfBound'));
    const existsStone = whenOtherwise<AllowedToTake<boolean>>(() => this[index].stones > 0, createAllowedToTake, () => createNotAllowedBecause('NoStoneExists'));
    const enoughStones = whenOtherwise<AllowedToTake<boolean>>(() => this[index].stones > 1, createAllowedToTake, () => createNotAllowedBecause('NotEnoughStones'));
    // if one rule returns false -> not allowed
    const rules = [
      inIndexRange,
      existsStone,
      enoughStones
    ];
    return rules.reduce<AllowedToTake<boolean>>((result, rule) => result.combine(rule), createAllowedToTake());
  }

  public take(index: number): { updated: FieldArray; lastSeatedIndex: number } {
    const steps = this[index].stones % this.length;
    const ifTakenField = (f: (v: Field) => Field) => (v: Field, i: number): Field => i === index ? f(v) : v;
    const isNextField = (from: number) => (v: Field, i: number): boolean => {
      const nextField = from === this.length - 1 ? 0 : from + 1;
      return i === nextField;
    };
    const ifInStepRange = (f: (v: Field) => Field) => (v: Field, i: number): Field => {
      const steps = this[index].stones % this.length;
      const nextFns = [...arrGen(steps, (i) => isNextField((index + i) % this.length))];
      const isInRange = nextFns.reduce((acc, cur) => cur(v, i) || acc, false);
      return isInRange ? f(v) : v;
    };

    const createZeroField = (): Field => new Field(0);
    const createFieldPlus = (stones: number) => (v: Field): Field => new Field(v.stones + stones);
    const fullRoundTrips = (): number => Math.trunc(this[index].stones / this.length);

    return {
      updated: new FieldArray([...this]
        .map(ifTakenField(createZeroField))
        .map(createFieldPlus(fullRoundTrips()))
        .map(ifInStepRange(createFieldPlus(1)))
      ),
      lastSeatedIndex: (index + steps) % this.length
    }
  }

  public isPossibleToSteal(index: number, other: FieldArray): (PossibleToSteal<boolean>) {
    const inCorrectRow = whenOtherwise<PossibleToSteal<boolean>>(() => this.isTopRow(index), createIsPossibleToSteal, () => createIsNotPossibleToStealBecause('SecondRow'));
    const enoughStones = whenOtherwise<PossibleToSteal<boolean>>(() => this[index].stones > 1, createIsPossibleToSteal, () => createIsNotPossibleToStealBecause('NotEnoughStones'));
    const otherSideHasStones = whenOtherwise<PossibleToSteal<boolean>>(() => other[this.otherSideIndex(index)].stones > 0, createIsPossibleToSteal, () => createIsNotPossibleToStealBecause('OtherSideHasNoStones'));

    // if one rule returns false -> not possible
    const rules = [
      inCorrectRow,
      enoughStones,
      otherSideHasStones
    ];
    return rules.reduce<(PossibleToSteal<boolean>)>((result, rule) => result.combine(rule), createIsPossibleToSteal());
  }

  public steal(index: number, other: FieldArray): { updated: FieldArray; otherAfterStolenFrom: FieldArray } {
    if (!this.isPossibleToSteal(index, other).isPossible) {
      return {
        updated: this,
        otherAfterStolenFrom: other
      };
    }

    const ifSeatedField = (f: (v: Field, i: number) => Field) => (v: Field, i: number): Field => i === index ? f(v, i) : v;
    const stealFrom = (other: FieldArray) => (v: Field, i: number): Field => new Field(v.stones + other[this.otherSideIndex(i)].stones);

    const ifStolenField = (f: (v: Field, i: number) => Field) => (v: Field, i: number): Field => i === (this.otherSideIndex(index)) ? f(v, i) : v;
    const createZeroField = (): Field => new Field(0);

    return {
      updated: new FieldArray([...this].map(ifSeatedField(stealFrom(other)))),
      otherAfterStolenFrom: new FieldArray([...other].map(ifStolenField(createZeroField)))
    };
  }

  public isInLoseCondition(): LooseCondition<boolean> {
    const topRowIsEmpty = whenOtherwise<LooseCondition<boolean>>(
      () => !this.topRow().reduce((acc, cur): boolean => acc || cur.isNotEmpty(), false),
      () => createIsLoosedCondition('toprow empty'),
      createNotLoosedCondition);
    const noMoreThan1StoneEverywhere = whenOtherwise<LooseCondition<boolean>>(
      () => ![...this].reduce((acc, cur): boolean => acc || cur.stones > 1, false),
      () => createIsLoosedCondition('no more than 1 stone everywhere'),
      createNotLoosedCondition);

    const rules = [
      topRowIsEmpty,
      noMoreThan1StoneEverywhere
    ];

    return rules.reduce<(LooseCondition<boolean>)>((result, rule) => result.combine(rule), createNotLoosedCondition());
  }
}
