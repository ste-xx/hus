import {Field} from "./Field";

export interface AllowedToTake {
  isAllowed: true;
  map: <T>(f: (v: this) => T) => T;
  combine: (f: () => AllowedToTake | NotAllowedToTake) => AllowedToTake | NotAllowedToTake;
}


function createAllowedToTake(): AllowedToTake {
  const self: AllowedToTake = {
    isAllowed: true,
    map: <T>(f: (v: AllowedToTake) => T): T => f(self),
    combine: (f: () => AllowedToTake | NotAllowedToTake): AllowedToTake | NotAllowedToTake => f()
  };
  return self;
}

export interface NotAllowedToTake {
  isAllowed: false;
  reason: string;
  map: <T>(f: (v: NotAllowedToTake) => T) => T;
  combine: (f: () => AllowedToTake | NotAllowedToTake) => NotAllowedToTake;
}

function createNotAllowedBecause(reason: string): NotAllowedToTake {
  const self: NotAllowedToTake = {
    isAllowed: false,
    reason: `notAllowedBecause${reason}`,
    combine: (): NotAllowedToTake => self,
    map: <T>(f: (v: NotAllowedToTake) => T) => f(self)
  };
  return self;
}

export interface PossibleToSteal {
  isPossible: true;
  map: <T>(f: (v: PossibleToSteal) => T) => T;
  combine: (f: () => PossibleToSteal | NotPossibleToSteal) => PossibleToSteal | NotPossibleToSteal;
}

function createIsPossibleToSteal(): PossibleToSteal {
  const self: PossibleToSteal = {
    isPossible: true,
    map: <T>(f: (v: PossibleToSteal) => T) => f(self),
    combine: (f: () => PossibleToSteal | NotPossibleToSteal): PossibleToSteal | NotPossibleToSteal => f()
  };
  return self;
}

export interface NotPossibleToSteal {
  isPossible: false;
  reason: string;
  map: <T>(f: (v: NotPossibleToSteal) => T) => T;
  combine: (f: () => PossibleToSteal | NotPossibleToSteal) => NotPossibleToSteal;
}

function* arrGen<T>(length: number, fn: (index: number) => T): Generator<T> {
  for (let i = 0; i < length; i++) {
    yield fn(i);
  }
}

function createIsNotPossibleToStealBecause(reason: string): NotPossibleToSteal {
  const self: NotPossibleToSteal = {
    isPossible: false,
    combine: () => self,
    map: <T>(f: (v: NotPossibleToSteal) => T) => f(self),
    reason: `notPossibleBecause${reason}`
  };
  return self;
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

  public isAllowedToTake(index: number): (AllowedToTake | NotAllowedToTake) {
    const inIndexRange = (): (AllowedToTake | NotAllowedToTake) => index >= 0 && index < this.length ? createAllowedToTake() : createNotAllowedBecause('IndexOutOfBound');
    const existsStone = (): (AllowedToTake | NotAllowedToTake) => this[index].stones > 0 ? createAllowedToTake() : createNotAllowedBecause('NoStoneExists');
    const enoughStones = (): (AllowedToTake | NotAllowedToTake) => this[index].stones > 1 ? createAllowedToTake() : createNotAllowedBecause('NotEnoughStones');
    // if one rule returns false -> not allowed
    const rules = [
      inIndexRange,
      existsStone,
      enoughStones
    ];
    return rules.reduce<AllowedToTake | NotAllowedToTake>((result, rule) => result.combine(rule), createAllowedToTake());
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

  public isPossibleToSteal(index: number, other: FieldArray): (PossibleToSteal | NotPossibleToSteal) {
    const inCorrectRow = (): (PossibleToSteal | NotPossibleToSteal) => this.isTopRow(index) ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('SecondRow');
    const enoughStones = (): (PossibleToSteal | NotPossibleToSteal) => this[index].stones > 1 ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('NotEnoughStones');
    const otherSideHasStones = (): (PossibleToSteal | NotPossibleToSteal) => other[this.otherSideIndex(index)].stones > 0 ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('OtherSideHasNoStones');
    // if one rule returns false -> not possible
    const rules = [
      inCorrectRow,
      enoughStones,
      otherSideHasStones
    ];
    return rules.reduce<(PossibleToSteal | NotPossibleToSteal)>((result, rule) => result.combine(rule), createIsPossibleToSteal());
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

  public isInLoseCondition(): boolean {
    const topRowIsFilled = this.topRow().reduce((acc, cur): boolean => acc || cur.isNotEmpty(), false);
    const moreThan1Stone = [...this].reduce((acc, cur): boolean => acc || cur.stones > 1, false);
    return !topRowIsFilled || !moreThan1Stone;
  }
}
