class Field {
  public stones: number;

  constructor(stones: number) {
    this.stones = stones;
  }
}

class BoardSide {
  private board: Board;
  //linked list?
  private fields: Field[] = [];

  constructor(board: Board, fields: Field[]) {
    this.fields = fields;
    this.board = board;
  }

  getStonesFor(index: number){
    return this.fields[index];
  }
}

class Board {
  public side0: BoardSide;
  public side1: BoardSide;

  constructor() {
    this.side0 = new BoardSide(this, Array.from({length: 16}, (v, i) => new Field(i>3 && i<8 ? 0 : 2)));
    this.side1 = new BoardSide(this, Array.from({length: 16}, (v, i) => new Field(i>3 && i<8 ? 0 : 2)));
  }
}


//verketette liste -> kann man einfach immer weiter itererien

class Player {
  private side: BoardSide;

  constructor(side: BoardSide) {
    this.side = side;
  }

  public getStonesFor(fieldIndex: number): number{
    return this.side.getStonesFor(fieldIndex).stones;
  }

  public take(index: number) {
    // this.side.take(index);
  }
}

enum PlayerEnum {
  Player0 = "PLAYER0",
  Player1 = "PLAYER1"
}

class Game {
  public player0: Player;
  public player1: Player;
  public board: Board;
  public eventDispatcher: EventDispatcher;

  constructor(eventDispatcher: EventDispatcher) {
    this.board = new Board();
    this.player0 = new Player(this.board.side0);
    this.player1 = new Player(this.board.side1);
    this.eventDispatcher = eventDispatcher;
    this.eventDispatcher('turn', {player: 0});
  }

  getStonesFor(player: PlayerEnum, fieldIndex: number): number{
    if(player === PlayerEnum.Player0){
      return this.board.side0.getStonesFor(fieldIndex).stones;
    } else {
      return this.board.side1.getStonesFor(fieldIndex).stones;
    }
  }
}


type EventDispatcher = (event: string, payload:any) => void;
