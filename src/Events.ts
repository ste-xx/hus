import {BoardSide, Player} from "./Game";

export type Events = string;
export type StartGameEvent = 'startGame';
export type EndTurnEvent = 'endTurn';
export type PlayEvent = 'play';
export type PlayErrorEvent = 'playError';
export type FinishGameWinEvent = 'finishGameWin';
export type FinishGameLoseEvent = 'finishGameLose';
export type LogEvent = 'log';
export type ResetEvent = 'reset';

//@formatter:off
export type EventPayload<E> =
  E extends StartGameEvent  ? { player: Player; boardSide: BoardSide; otherBoardSide: BoardSide } :
  E extends EndTurnEvent ? { player: Player; boardSide: BoardSide; otherBoardSide: BoardSide } :
  E extends PlayEvent ? { player: Player; boardSide: BoardSide; otherBoardSide: BoardSide; fieldIndex: number } :
  E extends PlayErrorEvent ? {reason: string} :
  E extends FinishGameWinEvent ? {player: Player; boardSide: BoardSide; otherBoardSide: BoardSide} :
  E extends FinishGameLoseEvent ? {player: Player; boardSide: BoardSide; otherBoardSide: BoardSide} :
  E extends LogEvent ? {msg: string} :
  E extends ResetEvent ? {} :
  unknown;
//formatter:on

export type EventDispatcher = <E extends Events>(event: E, payload: EventPayload<E>) => void;

export type EventBus = {
  addEventListener: <E extends Events>(event: E, cb: (payload: EventPayload<E>) => void) => void;
  removeEventListener: <E extends Events>(event: E, cb: (payload: EventPayload<E>) => void) => void;
}
