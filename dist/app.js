define("fn", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function applyWhenNot(predicate, f) {
        return () => {
            if (!predicate()) {
                f();
                return false;
            }
            return true;
        };
    }
    exports.applyWhenNot = applyWhenNot;
    function when(predicate, f) {
        return (x) => predicate(x) ? f(x) : x;
    }
    exports.when = when;
    exports.when2 = (predicate, f) => {
        return (x) => predicate(x) ? f(x) : x;
    };
    function wtfWrap(f) {
        return (x) => {
            f(x);
            return x;
        };
    }
    exports.wtfWrap = wtfWrap;
    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    exports.uuidv4 = uuidv4;
});
define("Field", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Field {
        constructor(stones) {
            this.stones = stones;
        }
        isEmpty() {
            return this.stones === 0;
        }
        isNotEmpty() {
            return !this.isEmpty();
        }
    }
    exports.Field = Field;
});
define("FieldArray", ["require", "exports", "Field"], function (require, exports, Field_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isNotAllowedToTake = (v) => {
        return !v.isAllowed;
    };
    function createAllowedToTake() {
        const self = {
            isAllowed: true,
            map: (f) => f(self),
            combine: (f) => f(),
            reason: ''
        };
        return self;
    }
    function createNotAllowedBecause(reason) {
        const self = {
            isAllowed: false,
            map: (f) => f(self),
            combine: () => self,
            reason: `notAllowedBecause${reason}`
        };
        return self;
    }
    function createIsPossibleToSteal() {
        const self = {
            isPossible: true,
            map: (f) => f(self),
            combine: (f) => f(),
            reason: ''
        };
        return self;
    }
    exports.isNotPossibleToSteal = (v) => {
        return !v.isPossible;
    };
    function createIsNotPossibleToStealBecause(reason) {
        const self = {
            isPossible: false,
            map: (f) => f(self),
            combine: () => self,
            reason: `notPossibleBecause${reason}`
        };
        return self;
    }
    function createIsLoosedCondition(reason) {
        const self = {
            isLoosed: true,
            map: (f) => f(self),
            combine: () => self,
            reason: ''
        };
        return self;
    }
    function createNotLoosedCondition() {
        const self = {
            isLoosed: false,
            map: (f) => f(self),
            combine: (f) => f(),
            reason: ''
        };
        return self;
    }
    exports.whenOtherwise = (predicate, trueFn, falseFn) => {
        return () => predicate() ? trueFn() : falseFn();
    };
    function* arrGen(length, fn) {
        for (let i = 0; i < length; i++) {
            yield fn(i);
        }
    }
    class FieldArray {
        constructor(fields) {
            fields.forEach((value, index) => this[index] = value);
            this.length = fields.length;
            this.prettyPrint = this.toString();
        }
        static createFrom(fields) {
            if (fields.length < 2) {
                throw new Error('At least 2 fields are required');
            }
            if (fields.length % 2 !== 0) {
                throw new Error('fields must be dividable by 2');
            }
            return new FieldArray(fields.map(v => new Field_1.Field(v)));
        }
        static createNewInitialized() {
            return FieldArray.createFrom([...arrGen(16, (i) => i > 3 && i < 8 ? 0 : 2)]);
        }
        static createFullFrom({ length }) {
            return FieldArray.createFrom([...arrGen(length, () => 2)]);
        }
        *[Symbol.iterator]() {
            for (let i = 0; i < this.length; i++) {
                yield this[i];
            }
        }
        topRow() {
            return [...this].slice(0, this.length / 2);
        }
        isTopRow(index) {
            return index < this.length / 2;
        }
        isBottomRow(index) {
            return !this.isTopRow(index);
        }
        bottomRow() {
            return [...this].slice(this.length / 2, this.length);
        }
        otherSideIndex(index) {
            return Math.abs(this.length / 2 - index) - 1;
        }
        toString() {
            return [
                ...this.topRow()
                    .map(({ stones }, i) => `A${i + 1}:${stones}`),
                ...this.bottomRow()
                    .reverse()
                    .map(({ stones }, i) => `B${i + 1}:${stones}`)
            ].reduce((acc, cur, idx) => `${acc}${idx === this.length / 2 ? '\n ' : ' '}${cur}`, '');
        }
        isAllowedToTake(index) {
            const inIndexRange = exports.whenOtherwise(() => index >= 0 && index < this.length, createAllowedToTake, () => createNotAllowedBecause('IndexOutOfBound'));
            const existsStone = exports.whenOtherwise(() => this[index].stones > 0, createAllowedToTake, () => createNotAllowedBecause('NoStoneExists'));
            const enoughStones = exports.whenOtherwise(() => this[index].stones > 1, createAllowedToTake, () => createNotAllowedBecause('NotEnoughStones'));
            // if one rule returns false -> not allowed
            const rules = [
                inIndexRange,
                existsStone,
                enoughStones
            ];
            return rules.reduce((result, rule) => result.combine(rule), createAllowedToTake());
        }
        take(index) {
            const steps = this[index].stones % this.length;
            const ifTakenField = (f) => (v, i) => i === index ? f(v) : v;
            const isNextField = (from) => (v, i) => {
                const nextField = from === this.length - 1 ? 0 : from + 1;
                return i === nextField;
            };
            const ifInStepRange = (f) => (v, i) => {
                const steps = this[index].stones % this.length;
                const nextFns = [...arrGen(steps, (i) => isNextField((index + i) % this.length))];
                const isInRange = nextFns.reduce((acc, cur) => cur(v, i) || acc, false);
                return isInRange ? f(v) : v;
            };
            const createZeroField = () => new Field_1.Field(0);
            const createFieldPlus = (stones) => (v) => new Field_1.Field(v.stones + stones);
            const fullRoundTrips = () => Math.trunc(this[index].stones / this.length);
            return {
                updated: new FieldArray([...this]
                    .map(ifTakenField(createZeroField))
                    .map(createFieldPlus(fullRoundTrips()))
                    .map(ifInStepRange(createFieldPlus(1)))),
                lastSeatedIndex: (index + steps) % this.length
            };
        }
        isPossibleToSteal(index, other) {
            const inCorrectRow = exports.whenOtherwise(() => this.isTopRow(index), createIsPossibleToSteal, () => createIsNotPossibleToStealBecause('SecondRow'));
            const enoughStones = exports.whenOtherwise(() => this[index].stones > 1, createIsPossibleToSteal, () => createIsNotPossibleToStealBecause('NotEnoughStones'));
            const otherSideHasStones = exports.whenOtherwise(() => other[this.otherSideIndex(index)].stones > 0, createIsPossibleToSteal, () => createIsNotPossibleToStealBecause('OtherSideHasNoStones'));
            // if one rule returns false -> not possible
            const rules = [
                inCorrectRow,
                enoughStones,
                otherSideHasStones
            ];
            return rules.reduce((result, rule) => result.combine(rule), createIsPossibleToSteal());
        }
        steal(index, other) {
            if (!this.isPossibleToSteal(index, other).isPossible) {
                return {
                    updated: this,
                    otherAfterStolenFrom: other
                };
            }
            const ifSeatedField = (f) => (v, i) => i === index ? f(v, i) : v;
            const stealFrom = (other) => (v, i) => new Field_1.Field(v.stones + other[this.otherSideIndex(i)].stones);
            const ifStolenField = (f) => (v, i) => i === (this.otherSideIndex(index)) ? f(v, i) : v;
            const createZeroField = () => new Field_1.Field(0);
            return {
                updated: new FieldArray([...this].map(ifSeatedField(stealFrom(other)))),
                otherAfterStolenFrom: new FieldArray([...other].map(ifStolenField(createZeroField)))
            };
        }
        isInLoseCondition() {
            const topRowIsEmpty = exports.whenOtherwise(() => !this.topRow().reduce((acc, cur) => acc || cur.isNotEmpty(), false), () => createIsLoosedCondition('toprow empty'), createNotLoosedCondition);
            const noMoreThan1StoneEverywhere = exports.whenOtherwise(() => ![...this].reduce((acc, cur) => acc || cur.stones > 1, false), () => createIsLoosedCondition('no more than 1 stone everywhere'), createNotLoosedCondition);
            const rules = [
                topRowIsEmpty,
                noMoreThan1StoneEverywhere
            ];
            return rules.reduce((result, rule) => result.combine(rule), createNotLoosedCondition());
        }
    }
    exports.FieldArray = FieldArray;
});
define("Game", ["require", "exports", "fn", "FieldArray"], function (require, exports, fn_1, FieldArray_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class BoardSide {
        constructor(id, field, isBottom, iteration, eventDispatcher, eventBus) {
            this.field = field;
            this.isBottom = isBottom;
            this.eventDispatcher = eventDispatcher;
            this.id = id;
            this.iteration = iteration;
            this.eventBus = eventBus;
            this.playFn = fn_1.when(this.isThisBoard.bind(this), this.play.bind(this));
            this.eventBus.addEventListener('play', this.playFn);
        }
        static createNew(isBottom, eventDispatcher, eventBus) {
            return new BoardSide(fn_1.uuidv4(), FieldArray_1.FieldArray.createNewInitialized(), isBottom, 0, eventDispatcher, eventBus);
        }
        static createNewVersionFrom(boardSide, field) {
            boardSide.shutdown();
            return new BoardSide(boardSide.id, field, boardSide.isBottom, boardSide.iteration + 1, boardSide.eventDispatcher, boardSide.eventBus);
        }
        isThisBoard({ boardSide }) {
            return boardSide.id === this.id;
        }
        getStoneCountFor(fieldIndex) {
            return this.field[fieldIndex].stones;
        }
        log(msg) {
            this.eventDispatcher('log', { msg });
        }
        play(payload) {
            const { player, fieldIndex, otherBoardSide } = payload;
            const logWithPrefix = (msg) => this.log(`${player.name} ${msg}`);
            logWithPrefix(`tries to take ${this.indexToName(fieldIndex)}`);
            const isAllowedToTakeResult = this.field.isAllowedToTake(fieldIndex);
            if (FieldArray_1.isNotAllowedToTake(isAllowedToTakeResult)) {
                this.eventDispatcher('playError', { reason: isAllowedToTakeResult.reason });
                logWithPrefix(`take ${this.indexToName(fieldIndex)} failed: ${isAllowedToTakeResult.map(BoardSide.notAllowedToTakeToLogMessage)}`);
                return payload;
            }
            const { updated, otherUpdated } = this.take(fieldIndex, this.field, otherBoardSide.field, logWithPrefix, true);
            const eventPayload = {
                player,
                boardSide: BoardSide.createNewVersionFrom(this, updated),
                otherBoardSide: BoardSide.createNewVersionFrom(otherBoardSide, otherUpdated)
            };
            if (otherUpdated.isInLoseCondition().isLoosed) {
                logWithPrefix(`wins`);
                this.eventDispatcher('finishGameWin', eventPayload);
            }
            else if (updated.isInLoseCondition().isLoosed) {
                logWithPrefix(`lose`);
                this.eventDispatcher('finishGameLose', eventPayload);
            }
            else {
                this.eventDispatcher('endTurn', eventPayload);
                this.log('\n');
            }
            return payload;
        }
        take(index, arr, otherArr, log, first) {
            if (otherArr.isInLoseCondition().isLoosed || arr.isInLoseCondition().isLoosed) {
                return { updated: arr, otherUpdated: otherArr };
            }
            const logIfNotFirst = (msg) => {
                if (!first) {
                    log(msg);
                }
            };
            logIfNotFirst(`tries to retake ${this.indexToName(index)}`);
            const isAllowedToTakeResult = arr.isAllowedToTake(index);
            if (!isAllowedToTakeResult.isAllowed) {
                logIfNotFirst(`can not retake`);
                return { updated: arr, otherUpdated: otherArr };
            }
            const printStones = (arr, index) => `${arr[index].stones} ${arr[index].stones === 1 ? 'stone' : 'stones'}`;
            log(`${first ? 'take' : 'retake'} ${this.indexToName(index)} with ${printStones(arr, index)}`);
            const { updated: afterTake, lastSeatedIndex } = arr.take(index);
            log(`tries to steal on position ${this.indexToName(lastSeatedIndex)}`);
            const isPossibleToStealResult = afterTake.isPossibleToSteal(lastSeatedIndex, otherArr);
            log(`${(FieldArray_1.isNotPossibleToSteal(isPossibleToStealResult) ? `can not steal because: ${isPossibleToStealResult.map(BoardSide.notPossibleToStealToLogMessage)}` : `steals on position ${this.indexToName(lastSeatedIndex)} with ${printStones(afterTake, lastSeatedIndex)}`)}`);
            const { updated: afterSteal, otherAfterStolenFrom } = afterTake.steal(lastSeatedIndex, otherArr);
            log(`new stone count on position ${this.indexToName(lastSeatedIndex)}: ${printStones(afterSteal, lastSeatedIndex)}`);
            return this.take(lastSeatedIndex, afterSteal, otherAfterStolenFrom, log, false);
        }
        shutdown() {
            this.eventBus.removeEventListener('play', this.playFn);
        }
        indexToName(fieldIndex) {
            if (this.isBottom) {
                return `${fieldIndex < 8 ? `B${(fieldIndex % (this.field.length / 2)) + 1}` : `A${8 - (fieldIndex % (this.field.length / 2))}`}`;
            }
            return `${fieldIndex < 8 ? `C${8 - (fieldIndex % (this.field.length / 2))}` : `D${(fieldIndex % (this.field.length / 2)) + 1}`}`;
        }
        static notAllowedToTakeToLogMessage(error) {
            switch (error.reason) {
                case "notAllowedBecauseNoStoneExists":
                    return 'There are no stones';
                case "notAllowedBecauseNotEnoughStones":
                    return 'At least two stones are required';
                case 'notAllowedBecauseIndexOutOfBound':
                    return 'Index out of bound';
                default:
                    return 'unknown';
            }
        }
        static notPossibleToStealToLogMessage(error) {
            switch (error.reason) {
                case "notPossibleBecauseSecondRow":
                    return 'It is in the second row';
                case "notPossibleBecauseNotEnoughStones":
                    return 'At least two stones are required';
                case 'notPossibleBecauseOtherSideHasNoStones':
                    return 'Other side has no stones';
                default:
                    return 'unknown';
            }
        }
    }
    exports.BoardSide = BoardSide;
    class Board {
        constructor(player0, player1, eventDispatcher, eventBus) {
            this.player0 = player0;
            this.player1 = player1;
            this.side0 = BoardSide.createNew(true, eventDispatcher, eventBus);
            this.side1 = BoardSide.createNew(false, eventDispatcher, eventBus);
            eventBus.addEventListener('endTurn', ({ boardSide, otherBoardSide }) => {
                this.side0 = boardSide.id === this.side0.id ? boardSide : otherBoardSide;
                this.side1 = boardSide.id === this.side1.id ? boardSide : otherBoardSide;
            });
        }
        getBoardSidesFor(player) {
            return {
                own: player.name === this.player0.name ? this.side0 : this.side1,
                other: player.name === this.player0.name ? this.side1 : this.side0
            };
        }
    }
    class Player {
        constructor(name) {
            this.name = name;
        }
    }
    exports.Player = Player;
    class Game {
        constructor(eventDispatcher, eventBus) {
            this.player0 = new Player('Player 1');
            this.player1 = new Player('Player 2');
            this.board = new Board(this.player0, this.player1, eventDispatcher, eventBus);
            this.eventDispatcher = eventDispatcher;
            this.eventBus = eventBus;
        }
        go() {
            this.eventDispatcher('startGame', {
                player: this.player0,
                boardSide: this.board.side0,
                otherBoardSide: this.board.side1
            });
            this.eventDispatcher('log', { msg: `${this.player0.name} turn.` });
        }
        reset() {
            this.eventDispatcher('reset', {});
            this.eventDispatcher('log', { msg: `****RESET***` });
            this.board = new Board(this.player0, this.player1, this.eventDispatcher, this.eventBus);
        }
    }
    exports.Game = Game;
});
define("Events", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("ActionLog", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ActionLog {
        constructor(eventBus) {
            eventBus.addEventListener('log', ({ msg }) => this.log(msg));
        }
    }
    class HTMLActionLog extends ActionLog {
        constructor(eventBus, target) {
            super(eventBus);
            this.target = target;
            this.log('Logger created');
        }
        log(msg) {
            this.target.innerHTML += `${msg} <br>`;
            this.target.scrollTop = this.target.scrollHeight;
        }
    }
    exports.HTMLActionLog = HTMLActionLog;
    class ConsoleActionLog extends ActionLog {
        constructor(eventBus) {
            super(eventBus);
            this.log('Logger created');
        }
        log(msg) {
            console.warn(msg);
        }
    }
    exports.ConsoleActionLog = ConsoleActionLog;
});
define("CheapKi", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CheapKi {
        constructor(player, eventDispatcher, eventBus) {
            this.player = player;
            this.eventBus = eventBus;
            this.eventDispatcher = eventDispatcher;
            eventBus.addEventListener('startGame', this.startFn.bind(this));
            eventBus.addEventListener('endTurn', this.endTurn.bind(this));
            eventBus.addEventListener('finishGameWin', this.deregister.bind(this));
            eventBus.addEventListener('finishGameLose', this.deregister.bind(this));
        }
        startFn({ player, boardSide, otherBoardSide }) {
            if (this.player.name === player.name) {
                setTimeout(() => {
                    this.do(boardSide, otherBoardSide);
                }, 100);
            }
        }
        endTurn({ player, boardSide, otherBoardSide }) {
            if (this.player.name !== player.name) {
                setTimeout(() => {
                    this.do(otherBoardSide, boardSide);
                }, 100);
            }
        }
        deregister() {
            this.eventBus.removeEventListener('startGame', this.startFn);
            this.eventBus.removeEventListener('endTurn', this.endTurn);
            this.eventBus.removeEventListener('finishGameWin', this.deregister);
            this.eventBus.removeEventListener('finishGameLose', this.deregister);
        }
        do(boardSide, otherBoardSide) {
            const result = [...boardSide.field].reduce((acc, cur, i) => acc.stones < cur.stones ? { i, stones: cur.stones } : acc, { i: 0, stones: 0 });
            this.eventDispatcher('play', {
                boardSide,
                otherBoardSide,
                player: this.player,
                fieldIndex: result.i
            });
            // console.warn(boardSide.field.prettyPrint);
        }
    }
    exports.CheapKi = CheapKi;
    ;
});
//# sourceMappingURL=app.js.map