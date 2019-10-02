import {
  EndTurnEvent,
  EventBus,
  EventDispatcher,
  EventPayload,
  LogEvent,
  PlayErrorEvent,
  PlayEvent,
  TurnEvent
} from "./events";
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


interface PossibleToSteal {
  isPossible: true,
  combine: (f: () => PossibleToSteal | NotPossibleToSteal) => PossibleToSteal | NotPossibleToSteal;
}

function createIsPossibleToSteal(): PossibleToSteal {
  return {
    isPossible: true,
    combine: (f: () => PossibleToSteal | NotPossibleToSteal): PossibleToSteal | NotPossibleToSteal => f()
  }
}

export interface NotPossibleToSteal {
  isPossible: false;
  reason: string,
  combine: (f: () => PossibleToSteal | NotPossibleToSteal) => NotPossibleToSteal
}

function createIsNotPossibleToStealBecause(reason: string): NotPossibleToSteal {
  const created: NotPossibleToSteal = {
    isPossible: false,
    combine: () => created,
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

  public isPossibleToSteal(index: number): (PossibleToSteal | NotPossibleToSteal) {
    const isInCorrectRow = (): (PossibleToSteal | NotPossibleToSteal) => index < this.length / 2 ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('SecondRow');
    const enoughStones = (): (PossibleToSteal | NotPossibleToSteal) => this[index].stones > 1 ? createIsPossibleToSteal() : createIsNotPossibleToStealBecause('NotEnoughStones');

    // if one rule returns false -> not possible
    const rules: Array<() => (PossibleToSteal | NotPossibleToSteal)> = [
      isInCorrectRow,
      enoughStones
    ];

    return rules.reduce((result, rule) => result.combine(rule), createIsPossibleToSteal() as (PossibleToSteal | NotPossibleToSteal));
    return rules.reduce((value, rule) => value.isPossible ? rule() : value, {isPossible: true} as (PossibleToSteal | NotPossibleToSteal));
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
      newFieldArray: new FieldArray(this.toArray()
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
    eventBus.addEventListener<PlayEvent>('play', when(this.isThisBoard.bind(this), this.play.bind(this)));
  }

  private isThisBoard({boardSideId}: EventPayload<PlayEvent>) {
    return boardSideId === this.id
  }

  public existsStonesFor(fieldIndex: number) {
    return this.field[fieldIndex].isNotEmpty();
  };

  public getStoneCountFor(fieldIndex: number) {
    return this.field[fieldIndex].stones;
  }

  private log(msg: string): void {
    this.eventDispatcher<LogEvent>('log', {msg});
  }

  public play(payload: EventPayload<PlayEvent>): EventPayload<PlayEvent> {
    const {player, fieldIndex} = payload;
    const log = (msg: string) => this.log(`${player.name} ${msg}`);

    log(`tries to take ${BoardSide.indexToName(fieldIndex)}`);
    const isAllowedToTakeResult = this.field.isAllowedToTake(fieldIndex);
    if (!isAllowedToTakeResult.isAllowed) {
      this.eventDispatcher<PlayErrorEvent>('playError', {reason: isAllowedToTakeResult.reason});
      log(`take ${BoardSide.indexToName(fieldIndex)} failed: ${isAllowedToTakeResult.map(BoardSide.notAllowedToTakeToLogMessage)}`);
      return payload;
    }

    log(`take ${BoardSide.indexToName(fieldIndex)} with ${this.field[fieldIndex].stones} ${this.field[fieldIndex].stones === 1 ? 'stone' : 'stones'}`);
    const {newFieldArray, lastSeatedIndex} = this.field.take(fieldIndex);
    this.field = newFieldArray;

    log(`tries to steal on position ${BoardSide.indexToName(lastSeatedIndex)}`);
    const isPossibleToStealResult = newFieldArray.isPossibleToSteal(fieldIndex);
    log(`${isPossibleToStealResult.isPossible ? `steals on position ${BoardSide.indexToName(lastSeatedIndex)}` : `can not steal because: ${isPossibleToStealResult.reason}`}`);
    // this.eventDispatcher<TryStealEvent>('trySteal', {
    //   player,
    //   boardSideId: this.id,
    //   fieldIndex: lastSeatedIndex,
    //   stoneCount: this.field[lastSeatedIndex].stones
    // });

    // steal phase
    // check win condition
    // check loose condition
    // check retake condition
    // end turn
    this.eventDispatcher<EndTurnEvent>('endTurn', {player: payload.player});
    return payload;
  }

  //
  // public trySteal(payload: EventPayload<TryStealEvent>): EventPayload<TryStealEvent> {
  //   console.warn('try steal' + payload.stoneCount);
  //   this.eventDispatcher<EndTurnEvent>('endTurn', {player: payload.player});
  //   this.eventDispatcher<LogEvent>('log', {msg: `${payload.player.name} ends the turn.`});
  //   return payload;
  // }

  private static indexToName(fieldIndex: number) {
    return `${fieldIndex < 8 ? `A${fieldIndex + 1}` : `B${16 - fieldIndex}`}`;
  }

  private static notAllowedToTakeToLogMessage(error: NotAllowedToTake) {
    switch (error.reason) {
      case "notAllowedBecauseNoStoneExists":
        return 'can not take because, there are no stones';
      case "notAllowedBecauseNotEnoughStones":
        return 'can not take, at least two stones are required';
      case 'notAllowedBecauseIndexOutOfBound':
        return 'can not take, index out of bound';
      default:
        return 'unknown';
    }
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
    this.eventDispatcher<LogEvent>('log', {msg: `${this.player0.name} turn.`});
  }
}

