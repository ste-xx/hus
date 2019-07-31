import {Player} from "./Game";

export type Event = string;
export type TurnEvent = 'turn';
export type TakeEvent = 'take';
export type TakeErrorEvent = 'takeError';

//@formatter:off
export type EventPayload<E> =
  E extends TurnEvent ? { player: Player } :
  E extends TakeEvent ? { player: Player, fieldIndex: number } :
  E extends TakeErrorEvent ? { player: Player, fieldIndex: number, reason: string } :
  unknown;
//formattor:on


export type EventDispatcher = <E extends Event>(event: E, payload: EventPayload<E>) => void;

export type EventBus = {
  addEventListener: <E extends Event>(event: E, cb: (payload: EventPayload<E>) => void) => void;
}
