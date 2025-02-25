import { NextPage } from 'next';
import Terminal from '~/apps/Terminal/Terminal';
import { TerminalDescriptor } from '~/apps/Terminal/TerminalDescriptor';
import { DefaultApp, Home } from '~/platform/components/Home';
import { InjectorProvider } from '~/platform/providers/InjectorProvider/InjectorProvider';

const defaultApp: DefaultApp = {
  appDescriptor: TerminalDescriptor,
  windowComponent: Terminal,
};

const Index: NextPage = () => (
  <InjectorProvider>
    <Home defaultApp={defaultApp} />
  </InjectorProvider>
);

export default Index;
