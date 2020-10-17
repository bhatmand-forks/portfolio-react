import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import {
  ButtonHTMLAttributes,
  FC,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useKeyMap } from '~/platform/hooks/useKeyMap';
import { AppDescriptor } from '~/platform/interfaces/AppDescriptor';
import { useInjector } from '~/platform/providers/InjectorProvider/useInjector';
import { WindowManager } from '~/platform/services/WindowManager/WindowManager';
import { WindowInstance } from '~/platform/services/WindowManager/WindowInstance';
import { noop } from '~/platform/utils/noop';
import { useTaskContextMenu } from './hooks/useTaskContextMenu';
import { useTaskRunner } from './hooks/useTaskRunner';

import styles from './Task.module.scss';
import { useContextMenu } from '~/platform/providers/ContextMenuProvider/useContextMenu';

const LOADER_APPARITION_DELAY_MS = 200;

export const Task: FC<Props> = ({
  appDescriptor,
  onClick = noop,
  taskBarRef,
  taskButtonActive,
  windowInstance,
  ...forwardedProps
}) => {
  const taskRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const {
    hideContextMenu,
    isContextMenuDisplayed,
    showContextMenu,
  } = useContextMenu();
  const getTaskContextMenuDescriptor = useTaskContextMenu(
    appDescriptor,
    taskBarRef,
    taskRef,
    windowInstance
  );
  const run = useTaskRunner(appDescriptor, windowInstance);
  const windowManager = useInjector(WindowManager);
  const windowInstanceActive = windowInstance && windowInstance.active;
  const running = !!windowInstance || loading;
  const { icon, iconScale = 1 } = appDescriptor;

  useEffect(() => {
    if (
      taskBarRef.current !== null &&
      taskRef.current !== null &&
      windowInstance !== undefined
    ) {
      const taskClientRect = taskRef.current.getBoundingClientRect();
      const y = Math.round(taskClientRect.top + taskClientRect.height / 3);
      windowManager.setMinimizedTopPosition(windowInstance.id, y);
    }
  }, [taskBarRef, windowInstance, windowManager]);

  useKeyMap(
    {
      ArrowRight: () =>
        showContextMenu({
          ...getTaskContextMenuDescriptor(),
          makeFirstItemActive: true,
        }),
      Enter: runTask,
      ' ': runTask,
    },
    taskButtonActive
  );

  useKeyMap(
    { ArrowLeft: hideContextMenu },
    taskButtonActive && isContextMenuDisplayed,
    2
  );

  async function runTask(): Promise<void> {
    // Delay loader apparition to avoid displaying it when app already loaded
    const displayLoaderTimeout = setTimeout(
      () => setLoading(true),
      LOADER_APPARITION_DELAY_MS
    );
    await run();
    clearTimeout(displayLoaderTimeout);
    setLoading(false);
  }

  return (
    <button
      className={cn(styles.task, {
        [styles.taskButtonActive]: taskButtonActive,
        [styles.windowInstanceActive]: windowInstanceActive,
      })}
      onClick={(event) => {
        runTask();
        onClick(event);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        showContextMenu(getTaskContextMenuDescriptor());
      }}
      ref={taskRef}
      tabIndex={-1}
      type="button"
      {...forwardedProps}
    >
      <FontAwesomeIcon
        className={cn({ [styles.loading]: loading })}
        icon={icon}
        style={{ fontSize: `${iconScale}em` }}
      />
      {running && <div className={styles.runIndicator} />}
    </button>
  );
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  appDescriptor: AppDescriptor;
  taskBarRef: RefObject<HTMLDivElement>;
  taskButtonActive: boolean;
  windowInstance?: WindowInstance;
}
