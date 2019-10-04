import {BoardSide, Player} from "./Game";

export type Events = string;
//todo turn AND endturn necessary?
export type TurnEvent = 'turn';
export type EndTurnEvent = 'endTurn';
export type PlayEvent = 'play';
export type PlayErrorEvent = 'playError';
export type LogEvent = 'log';

//@formatter:off
export type EventPayload<E> =
  E extends TurnEvent ? { player: Player } :
  E extends EndTurnEvent ? { player: Player, boardSide: BoardSide, otherBoardSide: BoardSide } :
  E extends PlayEvent ? { player: Player, boardSide: BoardSide, otherBoardSide: BoardSide, fieldIndex: number } :
  E extends PlayErrorEvent ? {reason: string} :
  E extends LogEvent ? {msg: string} :
  unknown;
//formatter:on

export type EventDispatcher = <E extends Events>(event: E, payload: EventPayload<E>) => void;

export type EventBus = {
  addEventListener: <E extends Events>(event: E, cb: (payload: EventPayload<E>) => void) => void;
  removeEventListener: <E extends Events>(event: E, cb: (payload: EventPayload<E>)=> void) => void;
}
