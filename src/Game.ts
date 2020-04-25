import {
  EndTurnEvent,
  EventBus,
  EventDispatcher,
  EventPayload,
  FinishGameLoseEvent,
  FinishGameWinEvent,
  LogEvent,
  PlayErrorEvent,
  PlayEvent, ResetEvent, StartGameEvent,
} from "./events";
import {uuidv4, when} from "./fn";
import {AllowedToTake, FieldArray, isNotAllowedToTake, isNotPossibleToSteal, PossibleToSteal} from "./FieldArray";

export class BoardSide {
  readonly field: FieldArray;
  public readonly id: string;
  private readonly eventDispatcher: EventDispatcher;
  private readonly eventBus: EventBus;
  private readonly playFn: (x: EventPayload<PlayEvent>) => EventPayload<PlayEvent>;
  private readonly iteration: number;
  private readonly isBottom: boolean;

  private constructor(id: string, field: FieldArray, isBottom: boolean, iteration: number, eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.field = field;
    this.isBottom = isBottom;
    this.eventDispatcher = eventDispatcher;
    this.id = id;
    this.iteration = iteration;
    this.eventBus = eventBus;
    this.playFn = when(this.isThisBoard.bind(this), this.play.bind(this));
    this.eventBus.addEventListener<PlayEvent>('play', this.playFn);
  }

  public static createNew(isBottom: boolean, eventDispatcher: EventDispatcher, eventBus: EventBus): BoardSide {
    return new BoardSide(uuidv4(), FieldArray.createNewInitialized(), isBottom, 0, eventDispatcher, eventBus);
  }

  private static createNewVersionFrom(boardSide: BoardSide, field: FieldArray): BoardSide {
    boardSide.shutdown();
    return new BoardSide(boardSide.id, field, boardSide.isBottom, boardSide.iteration + 1, boardSide.eventDispatcher, boardSide.eventBus);
  }

  private isThisBoard({boardSide}: EventPayload<PlayEvent>): boolean {
    return boardSide.id === this.id
  }

  public getStoneCountFor(fieldIndex: number): number {
    return this.field[fieldIndex].stones;
  }

  private log(msg: string): void {
    this.eventDispatcher<LogEvent>('log', {msg});
  }

  public play(payload: EventPayload<PlayEvent>): EventPayload<PlayEvent> {
    const {player, fieldIndex, otherBoardSide} = payload;
    const logWithPrefix = (msg: string): void => this.log(`${player.name} ${msg}`);

    logWithPrefix(`tries to take ${this.indexToName(fieldIndex)}`);
    const isAllowedToTakeResult = this.field.isAllowedToTake(fieldIndex);
    if (isNotAllowedToTake(isAllowedToTakeResult)) {
      this.eventDispatcher<PlayErrorEvent>('playError', {reason: isAllowedToTakeResult.reason});
      logWithPrefix(`take ${this.indexToName(fieldIndex)} failed: ${isAllowedToTakeResult.map(BoardSide.notAllowedToTakeToLogMessage)}`);
      return payload;
    }
    const {updated, otherUpdated} = this.take(fieldIndex, this.field, otherBoardSide.field, logWithPrefix, true);

    const eventPayload = {
      player,
      boardSide: BoardSide.createNewVersionFrom(this, updated),
      otherBoardSide: BoardSide.createNewVersionFrom(otherBoardSide, otherUpdated)
    };

    if (otherUpdated.isInLoseCondition().isLoosed) {
      logWithPrefix(`wins`);
      this.eventDispatcher<FinishGameWinEvent>('finishGameWin', eventPayload)
    } else if (updated.isInLoseCondition().isLoosed) {
      logWithPrefix(`lose`);
      this.eventDispatcher<FinishGameLoseEvent>('finishGameLose', eventPayload);
    } else {
      this.eventDispatcher<EndTurnEvent>('endTurn', eventPayload);
      this.log('\n');
    }
    return payload;
  }

  private take(index: number, arr: FieldArray, otherArr: FieldArray, log: (msg: string) => void, first: boolean): { updated: FieldArray; otherUpdated: FieldArray } {
    if (otherArr.isInLoseCondition().isLoosed || arr.isInLoseCondition().isLoosed) {
      return {updated: arr, otherUpdated: otherArr};
    }
    const logIfNotFirst = (msg: string): void => {
      if (!first) {
        log(msg);
      }
    };

    logIfNotFirst(`tries to retake ${this.indexToName(index)}`);
    const isAllowedToTakeResult = arr.isAllowedToTake(index);
    if (!isAllowedToTakeResult.isAllowed) {
      logIfNotFirst(`can not retake`);
      return {updated: arr, otherUpdated: otherArr};
    }

    const printStones = (arr: FieldArray, index: number): string => `${arr[index].stones} ${arr[index].stones === 1 ? 'stone' : 'stones'}`;
    log(`${first ? 'take' : 'retake'} ${this.indexToName(index)} with ${printStones(arr, index)}`);
    const {updated: afterTake, lastSeatedIndex} = arr.take(index);
    log(`tries to steal on position ${this.indexToName(lastSeatedIndex)}`);
    const isPossibleToStealResult = afterTake.isPossibleToSteal(lastSeatedIndex, otherArr);
    log(`${(isNotPossibleToSteal(isPossibleToStealResult) ? `can not steal because: ${isPossibleToStealResult.map(BoardSide.notPossibleToStealToLogMessage)}` : `steals on position ${this.indexToName(lastSeatedIndex)} with ${printStones(afterTake, lastSeatedIndex)}`)}`);
    const {updated: afterSteal, otherAfterStolenFrom} = afterTake.steal(lastSeatedIndex, otherArr);
    log(`new stone count on position ${this.indexToName(lastSeatedIndex)}: ${printStones(afterSteal, lastSeatedIndex)}`);
    return this.take(lastSeatedIndex, afterSteal, otherAfterStolenFrom, log, false);
  }

  private shutdown(): void {
    this.eventBus.removeEventListener('play', this.playFn);
  }

  public indexToName(fieldIndex: number): string {
    if (this.isBottom) {
      return `${fieldIndex < 8 ? `B${(fieldIndex % (this.field.length / 2)) + 1}` : `A${8 - (fieldIndex % (this.field.length / 2))}`}`;
    }
    return `${fieldIndex < 8 ? `C${8 - (fieldIndex % (this.field.length / 2))}` : `D${(fieldIndex % (this.field.length / 2)) + 1}`}`;
  }

  private static notAllowedToTakeToLogMessage(error: AllowedToTake<false>): string {
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

  private static notPossibleToStealToLogMessage(error: PossibleToSteal<false>): string {
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
  public side0: BoardSide;
  public side1: BoardSide;
  private player0: Player;
  private player1: Player;

  constructor(player0: Player, player1: Player, eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.player0 = player0;
    this.player1 = player1;
    this.side0 = BoardSide.createNew(true, eventDispatcher, eventBus);
    this.side1 = BoardSide.createNew(false, eventDispatcher, eventBus);

    eventBus.addEventListener<EndTurnEvent>('endTurn', ({boardSide, otherBoardSide}) => {
      this.side0 = boardSide.id === this.side0.id ? boardSide : otherBoardSide;
      this.side1 = boardSide.id === this.side1.id ? boardSide : otherBoardSide;
    });
  }

  public getBoardSidesFor(player: Player): { own: BoardSide; other: BoardSide } {
    return {
      own: player.name === this.player0.name ? this.side0 : this.side1,
      other: player.name === this.player0.name ? this.side1 : this.side0
    };
  }
}

export class Player {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export class Game {
  public player0: Player;
  public player1: Player;
  public board: Board;
  public eventDispatcher: EventDispatcher;
  private eventBus: EventBus;

  constructor(eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.player0 = new Player('Player 1');
    this.player1 = new Player('Player 2');
    this.board = new Board(this.player0, this.player1, eventDispatcher, eventBus);

    this.eventDispatcher = eventDispatcher;
    this.eventBus = eventBus;
  }

  public go(): void {
    this.eventDispatcher<StartGameEvent>('startGame', {
      player: this.player0,
      boardSide: this.board.side0,
      otherBoardSide: this.board.side1
    });
    this.eventDispatcher<LogEvent>('log', {msg: `${this.player0.name} turn.`});
  }

  public reset(): void {
    this.eventDispatcher<ResetEvent>('reset', {});
    this.eventDispatcher<LogEvent>('log', {msg: `****RESET***`});
    this.board = new Board(this.player0, this.player1, this.eventDispatcher, this.eventBus);
  }
}

