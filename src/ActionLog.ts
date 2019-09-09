import {EndTurnEvent, EventBus, TakeErrorEvent, TakeEvent, TryStealEvent, TryTakeEvent, TurnEvent} from "./Event";


export function indexToName(fieldIndex: number){
  return `${fieldIndex < 8 ? 'A' : 'B'}${fieldIndex % 8 + 1}`;
}

abstract class ActionLog {
  constructor(eventBus: EventBus) {
    eventBus.addEventListener<TurnEvent>('turn', ({player}) => this.log(`${player.name} turn.`));
    eventBus.addEventListener<EndTurnEvent>('endTurn', ({player}) => this.log(`${player.name} ends the turn.`));

    eventBus.addEventListener<TryTakeEvent>('tryTake', ({player, fieldIndex}) =>
      this.log(`${player.name} tries to take ${indexToName(fieldIndex)}`));

    eventBus.addEventListener<TakeEvent>('take', ({player, fieldIndex, stoneCount}) =>
      this.log(`${player.name} take ${indexToName(fieldIndex)} with ${stoneCount} ${stoneCount === 1 ? 'stone' : 'stones'}`));

    eventBus.addEventListener<TakeErrorEvent>('takeError', ({player, fieldIndex, reason}) =>
      this.log(`${player.name} take ${indexToName(fieldIndex)} failed: ${reason}`));

    eventBus.addEventListener<TryStealEvent>('trySteal', ({player, fieldIndex}) =>
      this.log(`${player.name} tries to steal on position ${indexToName(fieldIndex)}`));
  }

  public abstract log(msg: string): void;
}

export class HTMLActionLog extends ActionLog {
  private target: Element;

  constructor(eventBus: EventBus, target: Element) {
    super(eventBus);
    this.target = target;
    this.log('Logger created');
  }

  log(msg: string): void {
    this.target.innerHTML += `${msg} <br>`;
  }
}

export class ConsoleActionLog extends ActionLog {
  constructor(eventBus: EventBus) {
    super(eventBus);
    this.log('Logger created');
  }

  log(msg: string): void {
    console.warn(msg);
  }
}
