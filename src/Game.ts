import {
  EndTurnEvent,
  EventBus,
  EventDispatcher,
  EventPayload,
  FinishGameLoseEvent,
  FinishGameWinEvent,
  LogEvent,
  PlayErrorEvent,
  PlayEvent,
  TurnEvent
} from "./events";
import {uuidv4, when} from "./fn";
import {FieldArray, NotAllowedToTake, NotPossibleToSteal} from "./FieldArray";

export class BoardSide {
  readonly field: FieldArray;
  public readonly id: string;
  private readonly eventDispatcher: EventDispatcher;
  private readonly eventBus: EventBus;
  private readonly playFn: (x: EventPayload<PlayEvent>) => EventPayload<PlayEvent>;
  private readonly iteration: number;

  private constructor(id: string, field: FieldArray, iteration: number, eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.field = field;
    this.eventDispatcher = eventDispatcher;
    this.id = id;
    this.iteration = iteration;
    this.eventBus = eventBus;
    this.playFn = when(this.isThisBoard.bind(this), this.play.bind(this));
    this.eventBus.addEventListener<PlayEvent>('play', this.playFn);
  }

  public static createNew(eventDispatcher: EventDispatcher, eventBus: EventBus): BoardSide {
    return new BoardSide(uuidv4(), FieldArray.createNewInitialized(), 0, eventDispatcher, eventBus);
  }

  private static createNewVersionFrom(boardSide: BoardSide, field: FieldArray): BoardSide {
    boardSide.shutdown();
    return new BoardSide(boardSide.id, field, boardSide.iteration + 1, boardSide.eventDispatcher, boardSide.eventBus);
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

    logWithPrefix(`tries to take ${BoardSide.indexToName(fieldIndex)}`);
    const isAllowedToTakeResult = this.field.isAllowedToTake(fieldIndex);
    if (!isAllowedToTakeResult.isAllowed) {
      this.eventDispatcher<PlayErrorEvent>('playError', {reason: isAllowedToTakeResult.reason});
      logWithPrefix(`take ${BoardSide.indexToName(fieldIndex)} failed: ${isAllowedToTakeResult.map(BoardSide.notAllowedToTakeToLogMessage)}`);
      return payload;
    }
    const {updated, otherUpdated} = this.take(fieldIndex, this.field, otherBoardSide.field, logWithPrefix, true);

    const eventPayload = {
      player,
      boardSide: BoardSide.createNewVersionFrom(this, updated),
      otherBoardSide: BoardSide.createNewVersionFrom(otherBoardSide, otherUpdated)
    };

    if (otherUpdated.isInLoseCondition()) {
      logWithPrefix(`wins`);
      this.eventDispatcher<FinishGameWinEvent>('finishGameWin', eventPayload)
    } else if (updated.isInLoseCondition()) {
      logWithPrefix(`lose`);
      this.eventDispatcher<FinishGameLoseEvent>('finishGameLose', eventPayload);
    } else {
      this.eventDispatcher<EndTurnEvent>('endTurn', eventPayload);
      this.log('\n');
    }
    return payload;
  }

  private take(index: number, arr: FieldArray, otherArr: FieldArray, log: (msg: string) => void, first: boolean): { updated: FieldArray; otherUpdated: FieldArray } {
    if (otherArr.isInLoseCondition() || arr.isInLoseCondition()) {
      return {updated: arr, otherUpdated: otherArr};
    }
    const logIfNotFirst = (msg: string): void => {
      if (!first) {
        log(msg);
      }
    };

    logIfNotFirst(`tries to retake ${BoardSide.indexToName(index)}`);
    const isAllowedToTakeResult = arr.isAllowedToTake(index);
    if (!isAllowedToTakeResult.isAllowed) {
      logIfNotFirst(`can not retake`);
      return {updated: arr, otherUpdated: otherArr};
    }

    const printStones = (arr: FieldArray, index: number): string => `${arr[index].stones} ${arr[index].stones === 1 ? 'stone' : 'stones'}`;
    log(`${first ? 'take' : 'retake'} ${BoardSide.indexToName(index)} with ${printStones(arr, index)}`);
    const {updated: afterTake, lastSeatedIndex} = arr.take(index);
    log(`tries to steal on position ${BoardSide.indexToName(lastSeatedIndex)}`);
    const isPossibleToStealResult = afterTake.isPossibleToSteal(lastSeatedIndex, otherArr);
    log(`${isPossibleToStealResult.isPossible ? `steals on position ${BoardSide.indexToName(lastSeatedIndex)} with ${printStones(afterTake, lastSeatedIndex)}` : `can not steal because: ${isPossibleToStealResult.map(BoardSide.notPossibleToStealToLogMessage)}`}`);
    const {updated: afterSteal, otherAfterStolenFrom} = afterTake.steal(lastSeatedIndex, otherArr);
    log(`new stone count on position ${BoardSide.indexToName(lastSeatedIndex)}: ${printStones(afterSteal, lastSeatedIndex)}`);
    return this.take(lastSeatedIndex, afterSteal, otherAfterStolenFrom, log, false);
  }

  private shutdown(): void {
    this.eventBus.removeEventListener('play', this.playFn);
  }

  private static indexToName(fieldIndex: number): string {
    return `${fieldIndex < 8 ? `A${fieldIndex + 1}` : `B${16 - fieldIndex}`}`;
  }

  private static notAllowedToTakeToLogMessage(error: NotAllowedToTake): string {
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

  private static notPossibleToStealToLogMessage(error: NotPossibleToSteal): string {
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
    this.side0 = BoardSide.createNew(eventDispatcher, eventBus);
    this.side1 = BoardSide.createNew(eventDispatcher, eventBus);

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

  constructor(eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.player0 = new Player('Player 1');
    this.player1 = new Player('Player 2');

    this.board = new Board(this.player0, this.player1, eventDispatcher, eventBus);

    this.eventDispatcher = eventDispatcher;
    this.eventDispatcher<TurnEvent>('turn', {player: this.player0});
    this.eventDispatcher<LogEvent>('log', {msg: `${this.player0.name} turn.`});
  }
}

