import {EventBus, EventDispatcher, EventPayload, TakeErrorEvent, TakeEvent, TryTakeEvent, TurnEvent} from "./event";
import {uuidv4, when} from "./fn";

class Field {
  public readonly stones: number;

  constructor(stones: number) {
    this.stones = stones;
  }
}

type isAllowedToTakeResult = { isAllowed: true } | { isAllowed: false; reason: string }

class BoardSide {
  private readonly board: Board;
  //todo linked list?
  private readonly fields: Field[] = [];
  public readonly id: string;
  private readonly eventDispatcher: EventDispatcher;

  constructor(board: Board, fields: Field[], eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.fields = fields;
    this.board = board;
    this.eventDispatcher = eventDispatcher;
    this.id = uuidv4();
    // todo: remove eventlistener if not current board
    eventBus.addEventListener<TryTakeEvent>('tryTake', when(this.isThisBoard.bind(this), this.take.bind(this)));
  }

  private isThisBoard({boardSideId}: EventPayload<TryTakeEvent>) {
    return boardSideId === this.id
  }

  public existsStonesFor(fieldIndex: number) {
    return this.fields[fieldIndex].stones > 0;
  };

  public getStonesFor(index: number) {
    return this.fields[index];
  }

  public take(payload: EventPayload<TryTakeEvent>): EventPayload<TryTakeEvent> {
    const {player, fieldIndex} = payload;
    const existsStone = (): boolean => this.existsStonesFor(fieldIndex);
    const minStones = (): boolean => this.getStonesFor(fieldIndex).stones > 1;

    const toIsAllowedToTakeResult = (reason: string) => (isAllowed: boolean) => isAllowed ? {isAllowed} : {
      isAllowed,
      reason
    };
    // if one rule returns false -> not allowed
    const rules: Array<() => isAllowedToTakeResult> = [
      () => [existsStone()].map(toIsAllowedToTakeResult('can not take because, there are no stones'))[0],
      () => [minStones()].map(toIsAllowedToTakeResult('can not take, at least two stones are required'))[0],
    ];

    const result = rules.reduce((value, rule) => value.isAllowed ? rule() : value, {isAllowed: true} as isAllowedToTakeResult);
    if (result.isAllowed) {
      this.eventDispatcher<TakeEvent>('take', {player, fieldIndex});
      return payload;
    }

    this.eventDispatcher<TakeErrorEvent>('takeError', {
      player,
      reason: result.reason,
      fieldIndex
    });

    return payload;
  }
}

class Board {
  public readonly side0: BoardSide;
  public readonly side1: BoardSide;

  constructor(eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.side0 = new BoardSide(this, Array.from({length: 16}, (v, i) => new Field(i > 3 && i < 8 ? 0 : 2)), eventDispatcher, eventBus);
    this.side1 = new BoardSide(this, Array.from({length: 16}, (v, i) => new Field(i > 3 && i < 8 ? 0 : 2)), eventDispatcher, eventBus);
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

  public getStonesFor(fieldIndex: number): number {
    return this.side.getStonesFor(fieldIndex).stones;
  }

  public take(fieldIndex: number) {
    this.eventDispatcher<TryTakeEvent>('tryTake', {boardSideId: this.side.id, player: this, fieldIndex});
    // this.eventDispatcher<EndTurnEvent>('endTurn', {player: this});
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


