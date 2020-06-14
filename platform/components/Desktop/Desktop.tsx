import cn from 'classnames';
import React, { FC } from 'react';
import { TaskBar } from './components/TaskBar';
import { VisibleArea } from './components/VisibleArea';

import styles from './Desktop.module.scss';

export const Desktop: FC<Props> = ({ className }) => (
  <div className={cn(styles.desktop, className)}>
    <TaskBar />
    <VisibleArea />
  </div>
);

interface Props {
  className?: string;
}