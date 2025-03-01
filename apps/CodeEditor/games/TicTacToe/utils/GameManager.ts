import { Subject } from '@josselinbuils/utils/Subject';
import { Position } from '~/platform/interfaces/Position';

type Element = 'x' | 'o' | '';

export type Elements = [
  [Element, Element, Element],
  [Element, Element, Element],
  [Element, Element, Element]
];

const getInitialElements = (): Elements => [
  ['', '', ''],
  ['', '', ''],
  ['', '', ''],
];

const DELAY_MS = 1000;

export interface Winner {
  element: Element;
  cases: Position[];
}

export class GameManager {
  readonly subject: Subject<Elements>;
  private elements: Elements;
  private endCallback?: (winner: Winner | undefined) => unknown;
  private startCallback?: () => unknown;
  private turnCallback?: (elements: Elements) => unknown;
  private timer?: number;
  private turn?: Element;

  constructor() {
    this.elements = getInitialElements();
    this.subject = new Subject(this.elements);
  }

  onEnd = (callback: (winner: Winner | undefined) => unknown): void => {
    this.endCallback = callback;
  };

  onMyTurn = (callback: (elements: Elements) => unknown): void => {
    this.turnCallback = callback;
  };

  onStart = (callback: () => unknown): void => {
    this.startCallback = callback;
  };

  setElement = (x: number, y: number) => {
    if (this.turn !== 'o') {
      console.error(new Error('This is not your turn!'));
      this.clean();
    } else {
      this.play('o', y, x);
    }
  };

  clean = () => window.clearTimeout(this.timer);

  start = (): void => {
    this.clean();
    this.elements = getInitialElements();
    this.subject.next(this.elements);
    this.startCallback?.();
    this.next();
  };

  private checkWinner(noWinnerCallback: () => unknown): void {
    const winner = this.getWinner();

    if (!winner && !this.isFinished()) {
      noWinnerCallback();
    } else {
      this.endCallback?.(winner);
    }
  }

  private next = (): void => {
    if (this.turn === undefined) {
      this.turn = Math.random() < 0.5 ? 'o' : 'x';
    } else {
      this.turn = this.turn === 'o' ? 'x' : 'o';
    }

    this.timer = window.setTimeout(() => {
      if (this.turn === 'o') {
        this.turnCallback?.(this.elements);
      } else {
        this.playComputerTurn();
      }
    }, DELAY_MS);
  };

  private play(element: Element, y: number, x: number) {
    if (this.elements[y][x] !== '') {
      console.error(
        new Error(
          `There is already an element in position { x: ${x}, y: ${y} }.`
        )
      );
      this.clean();
      return;
    }

    this.elements[y][x] = element;
    this.subject.next([...this.elements]);

    this.checkWinner(this.next);
  }

  private playComputerTurn(): void {
    const checkElement = (element: Element): boolean => {
      for (const line of this.elements) {
        const sortedLine = [...line].sort();

        if (
          sortedLine[0] === '' &&
          sortedLine[1] === element &&
          sortedLine[1] === sortedLine[2]
        ) {
          this.play('x', this.elements.indexOf(line), line.indexOf(''));
          return true;
        }
      }

      for (let x = 0; x < 3; x++) {
        const column = [
          this.elements[0][x],
          this.elements[1][x],
          this.elements[2][x],
        ];
        const sortedColumn = [...column].sort();

        if (
          sortedColumn[0] === '' &&
          sortedColumn[1] === element &&
          sortedColumn[1] === sortedColumn[2]
        ) {
          this.play('x', column.indexOf(''), x);
          return true;
        }
      }

      const firstDiagonal = [
        this.elements[0][0],
        this.elements[1][1],
        this.elements[2][2],
      ];
      const sortedFirstDiagonal = [...firstDiagonal].sort();

      if (
        sortedFirstDiagonal[0] === '' &&
        sortedFirstDiagonal[1] === element &&
        sortedFirstDiagonal[1] === sortedFirstDiagonal[2]
      ) {
        this.play('x', firstDiagonal.indexOf(''), firstDiagonal.indexOf(''));
        return true;
      }

      const secondDiagonal = [
        this.elements[0][2],
        this.elements[1][1],
        this.elements[2][0],
      ];
      const sortedSecondDiagonal = [...secondDiagonal].sort();

      if (
        sortedSecondDiagonal[0] === '' &&
        sortedSecondDiagonal[1] === element &&
        sortedSecondDiagonal[1] === sortedSecondDiagonal[2]
      ) {
        this.play(
          'x',
          secondDiagonal.indexOf(''),
          2 - secondDiagonal.indexOf('')
        );
        return true;
      }

      return false;
    };

    // We try to finish our lines first
    if (checkElement('x')) {
      return;
    }

    // Then we prevent the enemy to finish
    if (checkElement('o')) {
      return;
    }

    // Then we put our element at a random position

    let x: number;
    let y: number;

    do {
      x = Math.floor(Math.random() * 3);
      y = Math.floor(Math.random() * 3);
    } while (this.elements[y][x] !== '');

    this.play('x', y, x);
  }

  private isFinished(): boolean {
    return this.elements.flat().every((element) => element !== '');
  }

  private getWinner(): Winner | undefined {
    for (const line of this.elements) {
      if (isRowFilledWithSameMark(line)) {
        const y = this.elements.indexOf(line);

        return {
          element: line[0],
          cases: line.map((_, x) => ({ x, y })),
        };
      }
    }

    const columns: Elements = getInitialElements();

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        columns[y][x] = this.elements[x][y];
      }
    }

    for (const column of columns) {
      if (isRowFilledWithSameMark(column)) {
        const x = columns.indexOf(column);

        return {
          element: column[0],
          cases: column.map((_, y) => ({ x, y })),
        };
      }
    }

    const firstDiagonal: Element[] = ['', '', ''];
    const secondDiagonal: Element[] = ['', '', ''];

    for (let i = 0; i < 3; i++) {
      firstDiagonal[i] = this.elements[i][i];
      secondDiagonal[i] = this.elements[i][2 - i];
    }

    if (isRowFilledWithSameMark(firstDiagonal)) {
      return {
        element: firstDiagonal[0],
        cases: firstDiagonal.map((_, i) => ({ x: i, y: i })),
      };
    }

    if (isRowFilledWithSameMark(secondDiagonal)) {
      return {
        element: secondDiagonal[0],
        cases: secondDiagonal.map((_, i) => ({ x: 2 - i, y: i })),
      };
    }
  }
}

function isRowFilledWithSameMark(row: Element[]): boolean {
  return new Set(row).size === 1 && row[0] !== '';
}
