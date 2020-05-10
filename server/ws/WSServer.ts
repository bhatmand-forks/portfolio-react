import fs from 'fs';
import WebSocket, { OPEN, Server } from 'ws';
import { Logger } from '../Logger';
import {
  Action,
  ACTION_REDO,
  ACTION_UNDO,
  ACTION_UPDATE_CODE,
  ACTION_UPDATE_CURSOR_OFFSET,
  createAction,
} from './actions';
import { STATE_PATH } from './constants';
import { ClientCursor } from './interfaces/ClientCursor';
import { computeHash } from './utils/computeHash';
import { applyDiff } from './utils/diffs';
import { ExecQueue } from './utils/ExecQueue';
import { History } from './utils/History';

const CURSOR_COLORS = ['red', 'fuchsia', 'yellow', 'orange', 'aqua', 'green'];

export class WSServer {
  private clientID = 0;
  private readonly clients = [] as Client[];
  private code = fs.existsSync(STATE_PATH)
    ? fs.readFileSync(STATE_PATH, 'utf8')
    : '';
  private codeHash = computeHash(this.code);
  private readonly codeUpdateQueue = new ExecQueue();
  private readonly history = new History();
  private readonly requestQueue = new ExecQueue();
  private readonly server: Server;

  static create(port: number, listeningCallback: () => any): WSServer {
    return new WSServer(port, listeningCallback);
  }

  private static dispatch(wsClient: WebSocket, action: Action): void {
    wsClient.send(JSON.stringify(action));
  }

  private constructor(port: number, listeningCallback: () => any) {
    this.server = new Server({ port }, listeningCallback);
    this.server.on('connection', this.handleConnection.bind(this));
  }

  private dispatchAll(
    action: Action | ((client: Client) => Action | undefined)
  ): void {
    const actionCreator = typeof action === 'function' ? action : () => action;

    this.server.clients.forEach((wsClient) => {
      if (wsClient.readyState === OPEN) {
        const client = this.getClientFromWS(wsClient);
        const clientAction = actionCreator(client);

        if (clientAction !== undefined) {
          WSServer.dispatch(wsClient, actionCreator(client));
        }
      }
    });
  }

  private fixCursorOffsets(): void {
    const codeLength = this.code.length;

    for (const client of this.clients) {
      if (client.cursorOffset > codeLength) {
        this.updateClientCursorOffset(client, codeLength);
      }
    }
  }

  private getClientFromWS(wsClient: WebSocket): Client {
    return this.clients.find((client) => client.ws === wsClient);
  }

  private getCursors(): ClientCursor[] {
    return this.clients.map(({ cursorColor, cursorOffset, id }) => ({
      clientID: id,
      color: cursorColor,
      offset: cursorOffset,
    }));
  }

  private handleConnection(wsClient: WebSocket): void {
    this.requestQueue.enqueue(() => {
      const id = ++this.clientID;
      const colorsUsed = this.clients.map((c) => c.cursorColor);
      const cursorColor =
        CURSOR_COLORS.find((color) => !colorsUsed.includes(color)) || 'white';

      const client = {
        cursorColor,
        cursorOffset: 0,
        id,
        ws: wsClient,
      };
      this.clients.push(client);

      const state = {
        code: this.code,
        cursorColor,
        id,
      };
      WSServer.dispatch(wsClient, createAction.updateClientState(state));
      this.sendCursors();
    });

    wsClient.on('close', () => {
      const client = this.getClientFromWS(wsClient);
      const clientIndex = this.clients.indexOf(client);
      this.clients.splice(clientIndex, 1);
      this.sendCursors();
    });

    wsClient.on('message', (message: string) => {
      this.requestQueue.enqueue(() => {
        try {
          const action = JSON.parse(message) as Action;
          this.reduce(wsClient, action);
        } catch (error) {
          Logger.error(error.stack);
        }
      });
    });
  }

  private reduce(wsClient: WebSocket, action: Action): void {
    const client = this.getClientFromWS(wsClient);

    switch (action.type) {
      case ACTION_REDO:
      case ACTION_UNDO: {
        const historyFunction = action.type === ACTION_UNDO ? 'undo' : 'redo';

        this.history[historyFunction](({ code, cursorOffset }) => {
          this.dispatchAll(createAction.updateClientState({ code }));
          this.updateClientCursorOffset(client, cursorOffset);
          this.updateCode(code);
        });
        break;
      }

      case ACTION_UPDATE_CURSOR_OFFSET:
        this.updateClientCursorOffset(client, action.payload.cursorOffset);
        break;

      case ACTION_UPDATE_CODE: {
        const { cursorOffset, diff, safetyHash } = action.payload;
        let { code } = action.payload;

        if (code === undefined) {
          code = applyDiff(this.code, diff);
        }

        if (safetyHash !== this.codeHash) {
          // Requested update is obsolete so we reset client code
          WSServer.dispatch(
            wsClient,
            createAction.updateClientState({ code: this.code })
          );
          return;
        }
        this.dispatchAll(({ id }) =>
          id === client.id
            ? createAction.updateCode(diff || code, cursorOffset)
            : createAction.updateCode(diff || code)
        );
        this.updateClientCursorOffset(client, cursorOffset, true);
        this.updateCode(code);
        this.history.pushState({ code, cursorOffset });
      }
    }
  }

  private sendCursors(): void {
    const cursors = this.getCursors();
    this.dispatchAll((client) =>
      createAction.updateCursors(
        cursors.filter(({ clientID }) => clientID !== client.id)
      )
    );
  }

  private updateCode(code: string): void {
    this.code = code;
    this.codeHash = computeHash(code);
    this.fixCursorOffsets();

    // Avoids race conditions
    this.codeUpdateQueue.enqueue(
      async () =>
        new Promise<void>((resolve) => {
          fs.writeFile(STATE_PATH, code, resolve as () => void);
        })
    );
  }

  private updateClientCursorOffset(
    client: Client,
    cursorOffset: number,
    excludeClient: boolean = false
  ): void {
    client.cursorOffset = cursorOffset;
    this.dispatchAll(({ id }) => {
      if (!excludeClient || id !== client.id) {
        return createAction.updateCursorOffset(client.id, cursorOffset);
      }
    });
  }
}

export interface Client {
  cursorColor: string;
  cursorOffset: number;
  id: number;
  ws: WebSocket;
}
