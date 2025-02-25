import { FC } from 'react';
import { TaskBar } from './components/TaskBar/TaskBar';
import { VisibleArea } from './components/VisibleArea/VisibleArea';

import styles from './Desktop.module.scss';

export const Desktop: FC = () => (
  <div className={styles.desktop}>
    <TaskBar className={styles.taskBar} />
    <VisibleArea />
  </div>
);
