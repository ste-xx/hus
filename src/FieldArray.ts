import {Field} from "./Field";

export interface AllowedToTake {
  isAllowed: true;
  map: <T>(f: (v: this) => T) => T;
  combine: (f: () => AllowedToTake | NotAllowedToTake) => AllowedToTake | NotAllowedToTake;
}

function createAllowedToTake(): AllowedToTake {
  return {
    isAllowed: true,
    map: <T>(f: (v: AllowedToTake) => T) => f({isAllowed: true} as AllowedToTake),
    combine: (f: () => AllowedToTake | NotAllowedToTake): AllowedToTake | NotAllowedToTake => f()
  };
}

export interface NotAllowedToTake {
  isAllowed: false;
  reason: string;
  map: <T>(f: (v: NotAllowedToTake) => T) => T;
  combine: (f: () => AllowedToTake | NotAllowedToTake) => NotAllowedToTake;
}

function createNotAllowedBecause(reason: string): NotAllowedToTake {
  const created: NotAllowedToTake = {
    isAllowed: false,
    reason: `notAllowedBecause${reason}`,
    combine: (): NotAllowedToTake => created,
    map: <T>(f: (v: NotAllowedToTake) => T) => f(created)
  };
  return created;
}

export interface PossibleToSteal {
  isPossible: true;
  map: <T>(f: (v: PossibleToSteal) => T) => T;
  combine: (f: () => PossibleToSteal | NotPossibleToSteal) => PossibleToSteal | NotPossibleToSteal;
}

function createIsPossibleToSteal(): PossibleToSteal {
  const created: PossibleToSteal = {
    isPossible: true,
    map: <T>(f: (v: PossibleToSteal) => T) => f(created),
    combine: (f: () => PossibleToSteal | NotPossibleToSteal): PossibleToSteal | NotPossibleToSteal => f()
  };
  return created;
}

export interface NotPossibleToSteal {
  isPossible: false;
  reason: string,
  map: <T>(f: (v: NotPossibleToSteal) => T) => T;
  combine: (f: () => PossibleToSteal | NotPossibleToSteal) => NotPossibleToSteal
}

function createIsNotPossibleToStealBecause(reason: string): NotPossibleToSteal {
  const created: NotPossibleToSteal = {
    isPossible: false,
    combine: () => created,
    map: <T>(f: (v: NotPossibleToSteal) => T) => f(created),
    reason: `notPossibleBecause${reason}`
  };
  return created;
}

export class FieldArray {
  [key: number]: Field

  length: number;

  constructor(fields: Field[]) {
    fields.forEach((value, index) => this[index] = value);
    this.length = fields.length;
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
    return FieldArray.createFrom(Array.from({length: 16}, (v, i) => i > 3 && i < 8 ? 0 : 2));
  }

  public static createFullFrom({length}: { length: number }): FieldArray {
    return FieldArray.createFrom(Array.from({length}, (v, i) => 2));
  }

  * [Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }

  public toArray() {
    return Array.from(this);
  }

  public toString() {
    const arr = this.toArray();
    return [
      ...arr.slice(0, this.length / 2).map(({stones}, i) => `A${i + 1}:${stones}`),
      ...arr.slice(this.length / 2, this.length).reverse().map(({stones}, i) => `B${i + 1}:${stones}`)
    ].reduce((acc, cur, idx) => `${acc}${idx === this.length / 2 ? '\n ' : ' '}${cur}`, '');
  }

  public isAllowedToTake(index: number): (AllowedToTake | NotAllowedToTake) {
    const inIndexRange = (): (AllowedToTake | NotAllowedToTake) => index >= 0 && index < this.length ? createAllowedToTake() : createNotAllowedBecause('IndexOutOfBound');
    const existsStone = (): (AllowedToTake | NotAllowedToTake) => this[index].stones > 0 ? createAllowedToTake() : createNotAllowedBecause('NoStoneExists');
    const enoughStones = (): (AllowedToTake | NotAllowedToTake) => this[index].stones > 1 ? createAllowedToTake() : createNotAllowedBecause('NotEnoughStones');
    // if one rule returns false -> not allowed
    const rules: Array<() => (AllowedToTake | NotAllowedToTake)> = [
      inIndexRange,
      existsStone,
      enoughStones
    ];
    return rules.reduce((result, rule) => result.combine(rule), createAllowedToTake() as (AllowedToTake | NotAllowedToTake));
  }

  public take(index: number): { updated: FieldArray, lastSeatedIndex: number } {
    const steps = this[index].stones % this.length;
    const ifTakenField = (f: (v: Field) => Field) => (v: Field, i: number) => i === index ? f(v) : v;
    const isNextField = (from: number) => (v: Field, i: number) => {
      const nextField = from === this.length - 1 ? 0 : from + 1;
      return i === nextField;
    };
    const ifInStepRange = (f: (v: Field) => Field) => (v: Field, i: number) => {
      const steps = this[index].stones % this.length;
      const nextFns = Array.from({length: steps}, (v, i) => isNextField((index + i) % this.length));
      const isInRange = nextFns.reduce((acc, cur) => cur(v, i) || acc, false);
      return isInRange ? f(v) : v;
    };

    const createZeroField = () => new Field(0);
    const createFieldPlus = (stones: number) => (v: Field) => new Field(v.stones + stones);
    const fullRoundTrips = () => Math.trunc(this[index].stones / this.length);

    return {
      updated: new FieldArray(this.toArray()
        .map(ifTakenField(createZeroField))
        .map(createFieldPlus(fullRoundTrips()))
        .map(ifInStepRange(createFieldPlus(1)))
      ),
      lastSeatedIndex: (index + steps) % this.length
    }
  }

  public isPossibleToSteal(index: number, other: FieldArray): (PossibleToSteal | NotPossibleToSteal) {
    const inCorrectRow = (): (PossibleToSteal | NotPossibleToSteal) => index < this.length / 2 ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('SecondRow');
    const enoughStones = (): (PossibleToSteal | NotPossibleToSteal) => this[index].stones > 1 ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('NotEnoughStones');
    const otherSideHasStones = (): (PossibleToSteal | NotPossibleToSteal) => other[(Math.abs(this.length / 2 - index) - 1)].stones > 0 ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('OtherSideHasNoStones');
    // if one rule returns false -> not possible
    const rules: Array<() => (PossibleToSteal | NotPossibleToSteal)> = [
      inCorrectRow,
      enoughStones,
      otherSideHasStones
    ];
    return rules.reduce((result, rule) => result.combine(rule), createIsPossibleToSteal() as (PossibleToSteal | NotPossibleToSteal));
  }

  public steal(index: number, other: FieldArray): { updated: FieldArray, otherAfterStolenFrom: FieldArray } {
    if (!this.isPossibleToSteal(index, other).isPossible) {
      return {
        updated: this,
        otherAfterStolenFrom: other
      };
    }

    const ifSeatedField = (f: (v: Field, i: number) => Field) => (v: Field, i: number) => i === index ? f(v, i) : v;
    const stealFrom = (other: FieldArray) => (v: Field, i: number) => new Field(v.stones + other[(Math.abs(this.length / 2 - i) - 1)].stones);

    const ifStolenField = (f: (v: Field, i: number) => Field) => (v: Field, i: number) => i === (Math.abs(this.length / 2 - index) - 1) ? f(v, i) : v;
    const createZeroField = () => new Field(0);

    return {
      updated: new FieldArray(this.toArray()
        .map(ifSeatedField(stealFrom(other)))
      ),
      otherAfterStolenFrom: new FieldArray(other.toArray()
        .map(ifStolenField(createZeroField)))
    };
  }

  public isInLoseCondition(): boolean {
    const result = Array.from(this)
      .slice(0, this.length / 2)
      .reduce((acc, {stones}) => acc && stones < 2, true);
    return result;
  }
}