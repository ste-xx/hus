import {
  EndTurnEvent,
  EventBus,
  EventDispatcher,
  EventPayload,
  TakeErrorEvent,
  TakeEvent,
  TryStealEvent,
  TryTakeEvent,
  TurnEvent
} from "./event";
import {uuidv4, when} from "./fn";

export class Field {
  public readonly stones: number;

  constructor(stones: number) {
    this.stones = stones;
  }

  public isEmpty(): boolean {
    return this.stones === 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }
}

interface AllowedToTake {
  isAllowed: true;
  map: <T>(f: (v: this) => T) => T
}

function createAllowedToTake(): AllowedToTake {
  return {
    isAllowed: true,
    map: <T>(f: (v: AllowedToTake) => T) => f({isAllowed: true} as AllowedToTake)
  }
}

export interface NotAllowedToTake {
  isAllowed: false;
  reason: string;
  map: <T>(f: (v: NotAllowedToTake) => T) => T
}

interface NotAllowedBecauseNoStoneExists extends NotAllowedToTake {
  reason: 'notAllowedBecauseNoStoneExists'
}

interface NotAllowedBecauseIndexOutOfBound extends NotAllowedToTake {
  reason: 'notAllowedBecauseIndexOutOfBound'
}

function createNotAllowedBecauseNoStoneExists(): NotAllowedBecauseNoStoneExists {
  return {
    isAllowed: false,
    reason: 'notAllowedBecauseNoStoneExists',
    map: <T>(f: (v: NotAllowedBecauseNoStoneExists) => T) => f({
      isAllowed: false,
      reason: 'notAllowedBecauseNoStoneExists'
    } as NotAllowedBecauseNoStoneExists)
  }
}

function createNotAllowedBecauseIndexOutOfBound(): NotAllowedBecauseIndexOutOfBound {
  return {
    isAllowed: false,
    reason: 'notAllowedBecauseIndexOutOfBound',
    map: <T>(f: (v: NotAllowedBecauseIndexOutOfBound) => T) => f({
      isAllowed: false,
      reason: 'notAllowedBecauseIndexOutOfBound'
    } as NotAllowedBecauseIndexOutOfBound)
  }
}

interface NotAllowedBecauseNotMinStones extends NotAllowedToTake {
  reason: 'notAllowedBecauseNotMinStones'
}

function createNotAllowedBecauseNotMinStones(): NotAllowedBecauseNotMinStones {
  return {
    isAllowed: false,
    reason: 'notAllowedBecauseNotMinStones',
    map: <T>(f: (v: NotAllowedBecauseNotMinStones) => T) => f({
      isAllowed: false,
      reason: 'notAllowedBecauseNotMinStones'
    } as NotAllowedBecauseNotMinStones)
  }
}

type IsAllowedToTakeResult = (AllowedToTake | NotAllowedBecauseNoStoneExists | NotAllowedBecauseNotMinStones | NotAllowedBecauseIndexOutOfBound);

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

  * [Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }

  public toArray() {
    return Array.from(this);
  }

  private indexToPrintablePosition(index: number) {
    return `${index < this.length / 2 ? 'A' : 'B'}${index % (this.length / 2) + 1}`;
  }

  public toString() {
    const arr = this.toArray();
    return [
      ...arr.slice(0, this.length / 2).map(({stones}, i) => `A${i + 1}:${stones}`),
      ...arr.slice(this.length / 2, this.length).reverse().map(({stones}, i) => `B${i + 1}:${stones}`)
    ].reduce((acc, cur, idx) => `${acc}${idx === this.length / 2 ? '\n ' : ' '}${cur}`, '');
  }

  public isAllowedToTake(index: number): IsAllowedToTakeResult {
    const inIndexRange = (): IsAllowedToTakeResult => index >= 0 && index < this.length ? createAllowedToTake() : createNotAllowedBecauseIndexOutOfBound();
    const existsStone = (): IsAllowedToTakeResult => this[index].stones > 0 ? createAllowedToTake() : createNotAllowedBecauseNoStoneExists();
    const minStones = (): IsAllowedToTakeResult => this[index].stones > 1 ? createAllowedToTake() : createNotAllowedBecauseNotMinStones();
    // if one rule returns false -> not allowed
    const rules: Array<() => IsAllowedToTakeResult> = [
      inIndexRange,
      existsStone,
      minStones
    ];
    return rules.reduce((value, rule) => value.isAllowed ? rule() : value, {isAllowed: true} as IsAllowedToTakeResult);
  }

  public take(index: number): { newFieldArray: FieldArray, lastSeatedIndex: number } {
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
      newFieldArray: new FieldArray([...this]
        .map(ifTakenField(createZeroField))
        .map(createFieldPlus(fullRoundTrips()))
        .map(ifInStepRange(createFieldPlus(1)))
      ),
      lastSeatedIndex: (index + steps) % this.length
    }
  }
}

export class BoardSide {
  private field: FieldArray;
  public readonly id: string;
  private readonly eventDispatcher: EventDispatcher;

  constructor(field: FieldArray, eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.field = field;
    this.eventDispatcher = eventDispatcher;
    this.id = uuidv4();
    // todo: remove eventlistener if not current board
    eventBus.addEventListener<TryTakeEvent>('tryTake', when(this.isThisBoard.bind(this), this.tryTake.bind(this)));
    eventBus.addEventListener<TakeEvent>('take', when(this.isThisBoard.bind(this), this.take.bind(this)));
    eventBus.addEventListener<TryStealEvent>('trySteal', when(this.isThisBoard.bind(this), this.trySteal.bind(this)));

  }

  private isThisBoard({boardSideId}: EventPayload<TryTakeEvent>) {
    return boardSideId === this.id
  }

  public existsStonesFor(fieldIndex: number) {
    return this.field[fieldIndex].isNotEmpty();
  };

  public getStoneCountFor(fieldIndex: number) {
    return this.field[fieldIndex].stones;
  }

  public tryTake(payload: EventPayload<TryTakeEvent>): EventPayload<TryTakeEvent> {
    const {player, fieldIndex} = payload;
    const take = this.field.isAllowedToTake(fieldIndex);
    if (take.isAllowed) {
      this.eventDispatcher<TakeEvent>('take', {
        player,
        boardSideId: this.id,
        fieldIndex,
        stoneCount: this.field[fieldIndex].stones
      });
      return payload;
    }

    this.eventDispatcher<TakeErrorEvent>('takeError', {
      player,
      //@formatter:off
      reason: take.map((error: NotAllowedToTake) => {
        switch (error.reason) {
          case "notAllowedBecauseNoStoneExists": return 'can not take because, there are no stones';
          case "notAllowedBecauseNotMinStones":  return 'can not take, at least two stones are required';
          case 'notAllowedBecauseIndexOutOfBound': return 'can not take, index out of bound';
          default: return 'unknown';
        }
      }),
      //@formatter:on
      fieldIndex
    });

    return payload;
  }

  public take(payload: EventPayload<TakeEvent>): EventPayload<TakeEvent> {
    const {player, fieldIndex} = payload;
    const {newFieldArray, lastSeatedIndex} = this.field.take(fieldIndex);
    this.field = newFieldArray;

    this.eventDispatcher<TryStealEvent>('trySteal', {
      player,
      boardSideId: this.id,
      fieldIndex: lastSeatedIndex,
      stoneCount: this.field[lastSeatedIndex].stones
    });
    // distribute stones
    // steal phase
    // check win condition
    // check loose condition
    // check retake condition
    // end turn
//    this.eventDispatcher<EndTurnEvent>('endTurn', {player: payload.player});
    return payload;
  }

  public trySteal(payload: EventPayload<TryStealEvent>): EventPayload<TryStealEvent> {
    console.warn('try steal' + payload.stoneCount);
    this.eventDispatcher<EndTurnEvent>('endTurn', {player: payload.player});
    return payload;
  }
}

class Board {
  public readonly side0: BoardSide;
  public readonly side1: BoardSide;

  constructor(eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.side0 = new BoardSide(FieldArray.createNewInitialized(), eventDispatcher, eventBus);
    this.side1 = new BoardSide(FieldArray.createNewInitialized(), eventDispatcher, eventBus);
  }
}

export class Player {
  private side: BoardSide;
  public name: string;
  public eventDispatcher: EventDispatcher;

  constructor(name: string, side: BoardSide, eventDispatcher: EventDispatcher) {
    this.name = name;
    this.side = side;
    this.eventDispatcher = eventDispatcher;
  }

  public getStoneCountFor(fieldIndex: number): number {
    return this.side.getStoneCountFor(fieldIndex);
  }

  public take(fieldIndex: number) {
    this.eventDispatcher<TryTakeEvent>('tryTake', {boardSideId: this.side.id, player: this, fieldIndex});
  }
}

export class Game {
  public player0: Player;
  public player1: Player;
  public board: Board;
  public eventDispatcher: EventDispatcher;

  constructor(eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.board = new Board(eventDispatcher, eventBus);

    this.player0 = new Player('Player 1', this.board.side0, eventDispatcher);
    this.player1 = new Player('Player 2', this.board.side1, eventDispatcher);

    this.eventDispatcher = eventDispatcher;
    this.eventDispatcher<TurnEvent>('turn', {player: this.player0});
  }
}


