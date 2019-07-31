import {EventBus, TakeErrorEvent, TakeEvent, TurnEvent} from "./Event";

abstract class ActionLog {
  constructor(eventBus: EventBus) {
    eventBus.addEventListener<TurnEvent>('turn', ({player}) => this.log(`${player.name} turn.`));

    eventBus.addEventListener<TakeEvent>('take', ({player, fieldIndex}) =>
      this.log(`${player.name} take index ${fieldIndex}`));

    eventBus.addEventListener<TakeErrorEvent>('takeError', ({player, fieldIndex, reason}) =>
      this.log(`${player.name} take index ${fieldIndex} failed: ${reason}`));
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
