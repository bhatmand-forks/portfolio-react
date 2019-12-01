import { faChartBar, faFireAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { FC } from 'react';
import { RedditFilter } from '../../interfaces';
import { ButtonLink } from '../ButtonLink';
import styles from './FilterButton.module.scss';

const filters: RedditFilter[] = ['hot', 'top'];

const labelMap = {
  hot: <FontAwesomeIcon icon={faFireAlt} />,
  top: <FontAwesomeIcon icon={faChartBar} />
};

export const FilterButton: FC<Props> = ({ filter, onClick }) => {
  const otherFilter = filters.find(f => f !== filter) as RedditFilter;

  return (
    <ButtonLink
      className={styles.filterButton}
      onClick={() => onClick(otherFilter)}
    >
      {labelMap[otherFilter]}
    </ButtonLink>
  );
};

interface Props {
  filter: RedditFilter;
  onClick(filter: RedditFilter): void;
}
