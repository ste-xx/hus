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
import {FieldArray, NotAllowedToTake, NotPossibleToSteal} from "./FieldArray";

export class BoardSide {
  field: FieldArray;
  public readonly id: string;
  private readonly eventDispatcher: EventDispatcher;
  private readonly board: Board;

  constructor(field: FieldArray, board: Board, eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.field = field;
    this.board = board;
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
    const isPossibleToStealResult = newFieldArray.isPossibleToSteal(lastSeatedIndex, this.board.getOtherSide(this).field);
    log(`${isPossibleToStealResult.isPossible ? `steals on position ${BoardSide.indexToName(lastSeatedIndex)}` : `can not steal because: ${isPossibleToStealResult.map(BoardSide.notPossibleToStealToLogMessage)}`}`);
    // todo implement steal
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
        return 'There are no stones';
      case "notAllowedBecauseNotEnoughStones":
        return 'At least two stones are required';
      case 'notAllowedBecauseIndexOutOfBound':
        return 'Index out of bound';
      default:
        return 'unknown';
    }
  }

  private static notPossibleToStealToLogMessage(error: NotPossibleToSteal) {
    switch (error.reason) {
      case "notPossibleBecauseSecondRow":
        return 'It is in the second row';
      case "notPossibleBecauseNotEnoughStones":
        return 'At least two stones are required';
      case 'notPossibleBecauseOtherSideHasNoStones':
        return 'Other side has no stones';
      default:
        return 'unknown';
    }
  }
}

class Board {
  public readonly side0: BoardSide;
  public readonly side1: BoardSide;

  constructor(eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.side0 = new BoardSide(FieldArray.createNewInitialized(), this, eventDispatcher, eventBus);
    this.side1 = new BoardSide(FieldArray.createNewInitialized(), this, eventDispatcher, eventBus);
  }

  public getOtherSide(side: BoardSide): BoardSide {
    return side.id === this.side0.id ? this.side1 : this.side0;
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

