import {EndTurnEvent, EventDispatcher, TakeErrorEvent, TakeEvent, TryTakeEvent, TurnEvent} from "./event";

class Field {
  public stones: number;

  constructor(stones: number) {
    this.stones = stones;
  }
}

class BoardSide {
  private board: Board;
  //linked list?
  private fields: Field[] = [];

  constructor(board: Board, fields: Field[]) {
    this.fields = fields;
    this.board = board;
  }

  public existsStonesFor(fieldIndex: number) {
    return this.fields[fieldIndex].stones > 0;
  };

  getStonesFor(index: number) {
    return this.fields[index];
  }
}

class Board {
  public side0: BoardSide;
  public side1: BoardSide;

  constructor() {
    this.side0 = new BoardSide(this, Array.from({length: 16}, (v, i) => new Field(i > 3 && i < 8 ? 0 : 2)));
    this.side1 = new BoardSide(this, Array.from({length: 16}, (v, i) => new Field(i > 3 && i < 8 ? 0 : 2)));
  }
}


// const when = (cond, f) => x => cond(x) ? f(x) : x;

function wtf<T>(f: () => void): (x: T) => T {
  return (x) => {
    f();
    return x;
  }
}

function when<T>(predicate: (x: T) => boolean, f: (x: T) => T): (x: T) => T {
  return (x) => predicate(x) ? f(x) : x;
}

function whenBoolean(predicate: () => boolean, f: () => void): () => boolean {
  return () => when((ignore: boolean) => predicate(), wtf(f))(true);
}

function applyWhen(predicate: () => boolean, f: () => void): () => boolean {
  return () => {
    if (predicate()) {
      f();
      return true;
    }
    return false;
  };
}

function applyWhenNot(predicate: () => boolean, f: () => void): () => boolean {
  return () => {
    if (!predicate()) {
      f();
      return false;
    }
    return true;
  };
}


function compose2<T, U, V>(f: (x: T) => U, g: (y: U) => V): (x: T) => V {
  return x => g(f(x))
}

// verketette liste -> kann man einfach immer weiter itererien
//
export class Player {
  private side: BoardSide;
  public name: string;
  public eventDispatcher: EventDispatcher;

  constructor(name: string, side: BoardSide, eventDispatcher: EventDispatcher) {
    this.name = name;
    this.side = side;
    this.eventDispatcher = eventDispatcher;
  }

  public getStonesFor(fieldIndex: number): number {
    return this.side.getStonesFor(fieldIndex).stones;
  }

  private isAllowedToTake(fieldIndex: number) {
    const dispatchError = (reason: string) => this.eventDispatcher<TakeErrorEvent>('takeError', {
      player: this,
      reason,
      fieldIndex
    });

    const existsStone = (): boolean => this.side.existsStonesFor(fieldIndex);
    const minStones = (): boolean => this.side.getStonesFor(fieldIndex).stones > 1;

    // if one rule returns false -> not allowed
    const rules: Array<() => boolean> = [
      applyWhenNot(existsStone, () => dispatchError('can not take because, there are no stones')),
      applyWhenNot(minStones, () => dispatchError('can not take, at least 2 stones are required'))
    ];

    return rules.reduce((isAllowed, rule) => isAllowed ? rule() : isAllowed, true);
  }

  public take(fieldIndex: number) {
    this.eventDispatcher<TryTakeEvent>('tryTake', {player: this, fieldIndex});
    if (this.isAllowedToTake(fieldIndex)) {
      this.eventDispatcher<TakeEvent>('take', {player: this, fieldIndex});
      this.eventDispatcher<EndTurnEvent>('endTurn', {player: this});
    }
  }
}

export class Game {
  public player0: Player;
  public player1: Player;
  public board: Board;
  public eventDispatcher: EventDispatcher;

  constructor(eventDispatcher: EventDispatcher) {
    this.board = new Board();

    this.player0 = new Player('Player 1', this.board.side0, eventDispatcher);

    this.player1 = new Player('Player 2', this.board.side1, eventDispatcher);

    this.eventDispatcher = eventDispatcher;
    this.eventDispatcher<TurnEvent>('turn', {player: this.player0});
  }
}


