import {EventBus, LogEvent} from "./Events";

abstract class ActionLog {
  protected constructor(eventBus: EventBus) {
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
    this.target.scrollTop = this.target.scrollHeight;
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
