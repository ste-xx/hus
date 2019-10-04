export class Field {
  public readonly stones: number;

  constructor(stones: number) {
    this.stones = stones;
  }

  public isEmpty(): boolean {
    return this.stones === 0;
  }

  public isNotEmpty(): boolean {
    return !this.isEmpty();
  }
}
