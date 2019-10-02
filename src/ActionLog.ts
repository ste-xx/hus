import {EventBus, LogEvent} from "./Events";

export function indexToName(fieldIndex: number) {
  return `${fieldIndex < 8 ? `A${fieldIndex + 1}` : `B${16 - fieldIndex}`}`;
}

abstract class ActionLog {
  constructor(eventBus: EventBus) {
    eventBus.addEventListener<LogEvent>('log', ({msg}) => this.log(msg));
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
