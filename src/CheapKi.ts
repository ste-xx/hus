import {EventBus, EventDispatcher} from "./Events";
import {BoardSide, Player} from "./Game";

export class CheapKi {
  private player: Player;
  private eventBus: EventBus;
  private eventDispatcher: EventDispatcher;

  constructor(player: Player, eventDispatcher: EventDispatcher, eventBus: EventBus) {
    this.player = player;
    this.eventBus = eventBus;
    this.eventDispatcher = eventDispatcher;
    eventBus.addEventListener('startGame', this.startFn.bind(this));
    eventBus.addEventListener('endTurn', this.endTurn.bind(this));
    eventBus.addEventListener('finishGameWin', this.deregister.bind(this));
    eventBus.addEventListener('finishGameLose', this.deregister.bind(this));
  }

  private startFn({player, boardSide, otherBoardSide}: { player: Player; boardSide: BoardSide; otherBoardSide: BoardSide }) {
    if (this.player.name === player.name) {
      setTimeout(()=> {
        this.do(boardSide, otherBoardSide);
      },100);
    }
  }


  private endTurn({player, boardSide, otherBoardSide}: { player: Player; boardSide: BoardSide; otherBoardSide: BoardSide }) {
    if (this.player.name !== player.name) {
      setTimeout(()=> {
        this.do(otherBoardSide, boardSide);
      },100);
    }
  }

  private deregister() {
    this.eventBus.removeEventListener('startGame', this.startFn);
    this.eventBus.removeEventListener('endTurn', this.endTurn);
    this.eventBus.removeEventListener('finishGameWin', this.deregister);
    this.eventBus.removeEventListener('finishGameLose', this.deregister);
  }

  private do(boardSide: BoardSide, otherBoardSide: BoardSide) {
      const result = [...boardSide.field].reduce((acc, cur, i) =>
        acc.stones < cur.stones ? {i, stones: cur.stones} : acc, {i: 0, stones: 0})
      this.eventDispatcher('play', {
        boardSide,
        otherBoardSide,
        player: this.player,
        fieldIndex: result.i
      });
    // console.warn(boardSide.field.prettyPrint);
  }

};
