import { faArrowDown } from '@fortawesome/free-solid-svg-icons/faArrowDown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { FC, PropsWithChildren } from 'react';

import styles from './Select.module.scss';

export const Select: FC<PropsWithChildren<Props>> = ({
  children,
  className,
  onChange,
  value,
}) => (
  <div className={cn(styles.container, className)}>
    <FontAwesomeIcon className={styles.icon} icon={faArrowDown} />
    <select
      className={styles.select}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  </div>
);

interface Props {
  className?: string;
  value: string;
  onChange(value: string): void;
}
