import cn from 'classnames';
import { FC, useEffect } from 'react';
import { ROOT_FONT_SIZE_PX } from '~/platform/constants';
import { TooltipDescriptor } from './TooltipDescriptor';

import styles from './Tooltip.module.scss';

interface TooltipProps extends TooltipDescriptor {
  onDOMReady(): void;
}

export const Tooltip: FC<TooltipProps> = ({
  className,
  onDOMReady,
  position,
  style,
  title,
}) => {
  useEffect(onDOMReady, [onDOMReady]);

  if (position === undefined) {
    return null;
  }
  const { x, y } = position;

  return (
    <div
      className={cn(styles.tooltip, className)}
      style={{
        ...style,
        left: typeof x === 'string' ? x : `${x / ROOT_FONT_SIZE_PX}rem`,
        top: typeof y === 'string' ? y : `${y / ROOT_FONT_SIZE_PX}rem`,
      }}
    >
      {title}
    </div>
  );
};
