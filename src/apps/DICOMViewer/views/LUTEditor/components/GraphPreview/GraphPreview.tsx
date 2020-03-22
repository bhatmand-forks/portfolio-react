import cn from 'classnames';
import React, { FC, useLayoutEffect, useRef, useState } from 'react';
import { LUTComponent } from '~/apps/DICOMViewer/interfaces';
import { scaleLUTComponents } from '~/apps/DICOMViewer/utils';
import { applyPolynomialInterpolation } from '~/apps/DICOMViewer/utils/math';
import { useElementSize } from '~/platform/hooks';
import styles from './GraphPreview.module.scss';

const BOTTOM_OFFSET = 5;
const LEFT_OFFSET = 5;
const RIGHT_OFFSET = 5;
const TOP_OFFSET = 5;
const GRAPH_LINE_OFFSET = 10;

export const GraphPreview: FC<Props> = ({
  activeLUTComponentID,
  className,
  lutComponents,
  onLUTComponentDrag
}) => {
  const [hoveredLUTComponentID, setHoveredLUTComponentID] = useState<string>();
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, canvasHeight] = useElementSize(canvasElementRef);
  const previewWidth =
    canvasWidth - LEFT_OFFSET - GRAPH_LINE_OFFSET - RIGHT_OFFSET;
  const previewHeight =
    canvasHeight - TOP_OFFSET - GRAPH_LINE_OFFSET - BOTTOM_OFFSET;

  useLayoutEffect(() => {
    const canvasElement = canvasElementRef.current as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');

    function getX(x: number): number {
      return x + LEFT_OFFSET;
    }

    function getY(y: number): number {
      return y + GRAPH_LINE_OFFSET + TOP_OFFSET;
    }

    function drawLine(
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      color: string = 'lightgrey',
      active: boolean = false
    ): void {
      if (context === null) {
        return;
      }
      context.beginPath();
      context.moveTo(getX(x0), getY(y0));
      context.lineTo(getX(x1), getY(y1));
      context.lineWidth = active ? 3 : 2;
      context.strokeStyle = color;
      context.stroke();
    }

    if (context !== null) {
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      scaleLUTComponents(lutComponents, previewWidth).forEach(
        ({ color, end, id, start }) => {
          let lastY = 0;

          for (let x = start; x <= end; x++) {
            const y =
              previewHeight -
              applyPolynomialInterpolation(start, end, previewHeight, x);

            if (x > start) {
              drawLine(
                x - 1,
                lastY,
                x,
                y,
                `rgb(${color})`,
                id === hoveredLUTComponentID || id === activeLUTComponentID
              );
            }
            lastY = y;
          }
        }
      );

      drawLine(-1, -GRAPH_LINE_OFFSET, -1, previewHeight + 1);

      context.beginPath();
      context.moveTo(getX(-1), getY(-GRAPH_LINE_OFFSET - 3));
      context.lineTo(getX(-4), getY(-GRAPH_LINE_OFFSET + 1));
      context.lineTo(getX(2), getY(-GRAPH_LINE_OFFSET + 1));
      context.closePath();
      context.fillStyle = 'lightgrey';
      context.fill();

      drawLine(
        -1,
        previewHeight + 1,
        previewWidth + GRAPH_LINE_OFFSET,
        previewHeight + 1
      );

      context.beginPath();
      context.moveTo(
        getX(previewWidth + GRAPH_LINE_OFFSET + 3),
        getY(previewHeight + 1)
      );
      context.lineTo(
        getX(previewWidth + GRAPH_LINE_OFFSET - 1),
        getY(previewHeight - 2)
      );
      context.lineTo(
        getX(previewWidth + GRAPH_LINE_OFFSET - 1),
        getY(previewHeight + 4)
      );
      context.closePath();
      context.fillStyle = 'lightgrey';
      context.fill();
    }
  }, [
    activeLUTComponentID,
    canvasHeight,
    canvasWidth,
    hoveredLUTComponentID,
    lutComponents,
    previewHeight,
    previewWidth
  ]);

  function getCloseLUTComponent(
    offsetX: number,
    offsetY: number
  ): LUTComponent | undefined {
    const downX = offsetX - LEFT_OFFSET - 1;
    const downY = canvasHeight - offsetY - BOTTOM_OFFSET;

    return scaleLUTComponents(lutComponents, previewWidth)
      .filter(({ end, start }) => downX >= start && downX <= end)
      .find(({ end, start }) => {
        const y = applyPolynomialInterpolation(
          start,
          end,
          previewHeight,
          downX
        );
        return Math.abs(downY - y) < 10;
      });
  }

  function handleMouseDown(downEvent: React.MouseEvent): void {
    if (hoveredLUTComponentID !== undefined) {
      onLUTComponentDrag(
        downEvent.nativeEvent,
        previewWidth,
        hoveredLUTComponentID
      );
    }
  }

  function handleMouseMove(moveEvent: React.MouseEvent): void {
    const { offsetX, offsetY } = moveEvent.nativeEvent;
    const closeLUTComponent = getCloseLUTComponent(offsetX, offsetY);

    if (closeLUTComponent !== undefined) {
      setHoveredLUTComponentID(closeLUTComponent.id);
    } else if (hoveredLUTComponentID !== undefined) {
      setHoveredLUTComponentID(undefined);
    }
  }

  return (
    <div className={cn(styles.preview, className)}>
      <canvas
        className={cn({
          [styles.withActiveComponent]:
            hoveredLUTComponentID || activeLUTComponentID
        })}
        height={canvasHeight}
        onMouseDown={handleMouseDown}
        onMouseLeave={() => setHoveredLUTComponentID(undefined)}
        onMouseMove={handleMouseMove}
        ref={canvasElementRef}
        width={canvasWidth}
      />
    </div>
  );
};

interface Props {
  activeLUTComponentID: string | undefined;
  className: string;
  lutComponents: LUTComponent[];
  onLUTComponentDrag(
    downEvent: MouseEvent,
    previewWidth: number,
    componentId: string
  ): void;
}
