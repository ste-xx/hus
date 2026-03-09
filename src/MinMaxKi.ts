import {EventBus, EventDispatcher} from "./Events";
import {BoardSide, Player} from "./Game";
import {FieldArray} from "./FieldArray";

export class MinMaxKi {
  private player: Player;
  private eventBus: EventBus;
  private eventDispatcher: EventDispatcher;
  private readonly depth: number;

  constructor(player: Player, eventDispatcher: EventDispatcher, eventBus: EventBus, depth = 9) {
    this.player = player;
    this.eventBus = eventBus;
    this.eventDispatcher = eventDispatcher;
    this.depth = depth;
    eventBus.addEventListener('startGame', this.startFn.bind(this));
    eventBus.addEventListener('endTurn', this.endTurn.bind(this));
    eventBus.addEventListener('finishGameWin', this.deregister.bind(this));
    eventBus.addEventListener('finishGameLose', this.deregister.bind(this));
  }

  private startFn({player, boardSide, otherBoardSide}: { player: Player; boardSide: BoardSide; otherBoardSide: BoardSide }) {
    if (this.player.name === player.name) {
      setTimeout(() => {
        this.do(boardSide, otherBoardSide);
      }, 100);
    }
  }

  private endTurn({player, boardSide, otherBoardSide}: { player: Player; boardSide: BoardSide; otherBoardSide: BoardSide }) {
    if (this.player.name !== player.name) {
      setTimeout(() => {
        this.do(otherBoardSide, boardSide);
      }, 100);
    }
  }

  private deregister() {
    this.eventBus.removeEventListener('startGame', this.startFn);
    this.eventBus.removeEventListener('endTurn', this.endTurn);
    this.eventBus.removeEventListener('finishGameWin', this.deregister);
    this.eventBus.removeEventListener('finishGameLose', this.deregister);
  }

  private do(boardSide: BoardSide, otherBoardSide: BoardSide) {
    const bestIndex = this.findBestMove(boardSide.field, otherBoardSide.field);
    this.eventDispatcher('play', {
      boardSide,
      otherBoardSide,
      player: this.player,
      fieldIndex: bestIndex
    });
  }

  public static getValidMoves(field: FieldArray): number[] {
    const moves: number[] = [];
    for (let i = 0; i < field.length; i++) {
      if (field[i].stones > 1) {
        moves.push(i);
      }
    }
    return moves;
  }

  public static simulateMove(currentField: FieldArray, otherField: FieldArray, index: number): { currentField: FieldArray; otherField: FieldArray } {
    return MinMaxKi.applyMove(currentField, otherField, index);
  }

  private static applyMove(arr: FieldArray, other: FieldArray, index: number): { currentField: FieldArray; otherField: FieldArray } {
    if (other.isInLoseCondition().isLoosed || arr.isInLoseCondition().isLoosed) {
      return {currentField: arr, otherField: other};
    }
    if (!arr.isAllowedToTake(index).isAllowed) {
      return {currentField: arr, otherField: other};
    }
    const {updated: afterTake, lastSeatedIndex} = arr.take(index);
    const {updated: afterSteal, otherAfterStolenFrom} = afterTake.steal(lastSeatedIndex, other);
    return MinMaxKi.applyMove(afterSteal, otherAfterStolenFrom, lastSeatedIndex);
  }

  public static evaluate(currentField: FieldArray, otherField: FieldArray): number {
    const halfLength = currentField.length / 2;
    let score = 0;
    for (let i = 0; i < currentField.length; i++) {
      score += currentField[i].stones;
      score -= otherField[i].stones;
      if (i < halfLength) {
        score += currentField[i].stones;
        score -= otherField[i].stones;
      }
    }
    return score;
  }

  private negamax(currentField: FieldArray, otherField: FieldArray, depth: number, alpha: number, beta: number): number {
    if (otherField.isInLoseCondition().isLoosed) {
      return Number.POSITIVE_INFINITY;
    }
    if (currentField.isInLoseCondition().isLoosed) {
      return Number.NEGATIVE_INFINITY;
    }
    if (depth === 0) {
      return MinMaxKi.evaluate(currentField, otherField);
    }

    const moves = MinMaxKi.getValidMoves(currentField);
    if (moves.length === 0) {
      return Number.NEGATIVE_INFINITY;
    }

    let maxScore = Number.NEGATIVE_INFINITY;
    for (const move of moves) {
      const result = MinMaxKi.simulateMove(currentField, otherField, move);
      if (result.otherField.isInLoseCondition().isLoosed) {
        return Number.POSITIVE_INFINITY;
      }
      const score = -this.negamax(result.otherField, result.currentField, depth - 1, -beta, -alpha);
      if (score > maxScore) {
        maxScore = score;
      }
      if (score > alpha) {
        alpha = score;
      }
      if (alpha >= beta) {
        break;
      }
    }
    return maxScore;
  }

  public findBestMove(myField: FieldArray, otherField: FieldArray): number {
    const moves = MinMaxKi.getValidMoves(myField);
    if (moves.length === 0) {
      return 0;
    }

    let bestMove = moves[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const move of moves) {
      const result = MinMaxKi.simulateMove(myField, otherField, move);
      if (result.otherField.isInLoseCondition().isLoosed) {
        return move;
      }
      const score = -this.negamax(result.otherField, result.currentField, this.depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }
}
