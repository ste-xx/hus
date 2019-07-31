import {EventDispatcher, TakeErrorEvent, TakeEvent, TurnEvent} from "./event";

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


//verketette liste -> kann man einfach immer weiter itererien

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

  public take(fieldIndex: number) {
    this.eventDispatcher<TakeEvent>('take', {player: this, fieldIndex});
    if (!this.side.existsStonesFor(fieldIndex)) {
      console.error('wtf');
      this.eventDispatcher<TakeErrorEvent>('takeError', {
        player: this,
        reason: `can not take ${fieldIndex} because, there are no stones`,
        fieldIndex
      });
    }
  }
}

enum PlayerEnum {
  Player0 = "PLAYER0",
  Player1 = "PLAYER1"
}

export class Game {
  public player0: Player;
  public player1: Player;
  public board: Board;
  public eventDispatcher: EventDispatcher;

  constructor(eventDispatcher: EventDispatcher) {
    this.board = new Board();

    this.player0 = new Player('Player 1',this.board.side0, (event, payload) => eventDispatcher(event, {
      ...payload,
      player: 0
    }));

    this.player1 = new Player('Player 2', this.board.side1, (event, payload) => eventDispatcher(event, {
      ...payload,
      player: 1
    }));

    this.eventDispatcher = eventDispatcher;
    this.eventDispatcher<TurnEvent>('turn', {player: this.player0});
  }

  getStonesFor(player: PlayerEnum, fieldIndex: number): number {
    if (player === PlayerEnum.Player0) {
      return this.board.side0.getStonesFor(fieldIndex).stones;
    } else {
      return this.board.side1.getStonesFor(fieldIndex).stones;
    }
  }
}


