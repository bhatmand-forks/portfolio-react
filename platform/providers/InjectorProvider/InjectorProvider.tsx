import { FC, PropsWithChildren, useState } from 'react';
import { InjectorContext } from './InjectorContext';

export const InjectorProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const [injectionMap] = useState({});

  return (
    <InjectorContext.Provider value={injectionMap}>
      {children}
    </InjectorContext.Provider>
  );
};
