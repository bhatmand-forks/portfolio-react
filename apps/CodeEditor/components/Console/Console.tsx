import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { useKeyMap } from '@josselinbuils/hooks/useKeyMap';
import { useList } from '@josselinbuils/hooks/useList';
import cn from 'classnames';
import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { Toolbar } from '../Toolbar/Toolbar';
import { ToolButton } from '../ToolButton/ToolButton';
import { Shortcut } from '../Shortcut/Shortcut';
import { Logs } from './components/Logs/Logs';
import { Log } from './Log';
import { decorateConsole } from './utils/decorateConsole';
import { execCode } from './utils/execCode';
import { observeMutations } from './utils/observeMutations';

import styles from './Console.module.scss';

interface Props {
  active: boolean;
  className?: string;
  codeToExec: string | undefined;
  height: string;
}

export const Console = forwardRef<HTMLDivElement, Props>(
  ({ active, className, codeToExec = '', height }, ref) => {
    const [logs, logManager] = useList<Log>([]);
    const logsElementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (active) {
        return decorateConsole(logManager);
      }
    }, [active, logManager]);

    useLayoutEffect(() => {
      const logsElement = logsElementRef.current as HTMLElement;

      return observeMutations(logsElement, () => {
        logsElement.scrollTop = logsElement.scrollHeight;
      });
    }, []);

    useKeyMap(
      {
        'Control+E,Meta+E': () => execCode(codeToExec),
      },
      active
    );

    return (
      <div
        className={cn(styles.console, className)}
        style={{ flexBasis: height }}
        ref={ref}
      >
        <Toolbar className={styles.toolbar}>
          <ToolButton
            disabled={!codeToExec}
            icon={faPlay}
            onClick={() => execCode(codeToExec)}
            title={
              <>
                Execute
                <Shortcut keys={['Ctrl', 'E']} />
              </>
            }
          />
          <ToolButton
            disabled={logs.length === 0}
            icon={faTrash}
            onClick={() => logManager.clear()}
            title="Clear"
          />
        </Toolbar>
        <Logs className={styles.logs} logs={logs} ref={logsElementRef} />
      </div>
    );
  }
);
