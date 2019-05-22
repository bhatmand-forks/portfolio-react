import React, { FC } from 'react';
import styles from './Logo.module.scss';

export const Logo: FC = () => (
  <figure className={styles.logo}>
    <i className="fab fa-reddit-alien" />
  </figure>
);
