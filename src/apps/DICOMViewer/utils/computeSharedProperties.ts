import { SharedProperties } from '../interfaces';
import { Frame } from '../models';

export function computeSharedProperties(frames: Frame[]): SharedProperties {
  const { pixelSpacing, spacingBetweenSlices } = frames[0];
  const voxelSpacing = [...pixelSpacing, spacingBetweenSlices];
  return { voxelSpacing };
}