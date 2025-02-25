import { Subject } from '@josselinbuils/utils/Subject';
import { createRef } from 'react';
import { WindowProps } from '~/platform/components/Window/Window';
import { WindowComponent } from '~/platform/components/Window/WindowComponent';
import { AppDescriptor } from '~/platform/interfaces/AppDescriptor';
import { WindowInstance } from './WindowInstance';

export class WindowManager {
  static injectionId = 'WindowManager';

  windowInstancesSubject = new Subject<WindowInstance[]>([]);

  private readonly windowInstances: WindowInstance[] = [];
  private id = -1;

  closeWindow = (id: number): void => {
    const index = this.windowInstances.findIndex(
      (windowInstance) => windowInstance.id === id
    );

    if (index === -1) {
      throw new Error('Unable to close window: not found');
    }
    this.windowInstances.splice(index, 1);
    this.publishWindowInstances();
  };

  hideWindow = (id: number): void => {
    const componentInstance = this.getWindowInstance(id).windowRef.current;

    if (componentInstance !== null) {
      componentInstance.hide();
      this.unselectWindow(id);
    }
  };

  getWindowInstances = (): WindowInstance[] => this.windowInstances;

  isWindowSelected = (id: number): boolean => this.getWindowInstance(id).active;

  isWindowVisible = (id: number): boolean => {
    const componentInstance = this.getWindowInstance(id).windowRef.current;
    return componentInstance !== null ? componentInstance.visible : false;
  };

  async openApp<T extends Partial<WindowProps>>(
    appDescriptor: AppDescriptor,
    windowProps: Partial<T> = {},
    windowComponent?: WindowComponent
  ): Promise<void> {
    if (windowComponent === undefined) {
      windowComponent = (await appDescriptor.factory()).default;
    }

    const windowInstance: WindowInstance = {
      ...windowProps,
      active: false,
      appDescriptor,
      id: ++this.id,
      windowComponent,
      windowRef: createRef(),
      zIndex: 0,
    };

    this.windowInstances.push(windowInstance);
    this.selectWindow(windowInstance.id);
  }

  setMinimizedTopPosition = (id: number, topPosition: number): void => {
    this.getWindowInstance(id).minimizedTopPosition = topPosition;
    this.publishWindowInstances();
  };

  showWindow = (id: number): void => {
    const componentInstance = this.getWindowInstance(id).windowRef.current;

    if (componentInstance !== null) {
      componentInstance.show();
      this.selectWindow(id);
    }
  };

  selectWindow = (id: number): void => {
    const windowInstance = this.getWindowInstance(id);

    if (!windowInstance.active) {
      let i = 0;

      this.windowInstances
        .filter((instance) => instance.id !== id)
        .sort((a, b) => (a.zIndex < b.zIndex ? -1 : 1))
        .forEach((instance) => {
          instance.active = false;
          instance.zIndex = ++i;
        });

      windowInstance.active = true;
      windowInstance.zIndex = ++i;
      windowInstance.windowRef.current?.focus();

      this.publishWindowInstances();
    }
  };

  unselectAllWindows = (): void => {
    const isThereWindowSelected = this.windowInstances.some(
      ({ active }) => active
    );

    if (isThereWindowSelected) {
      this.windowInstances.forEach((windowInstance) => {
        windowInstance.active = false;
      });
      this.publishWindowInstances();
    }
  };

  unselectWindow = (id: number): void => {
    const windowInstance = this.getWindowInstance(id);

    if (windowInstance.active) {
      windowInstance.active = false;
      this.publishWindowInstances();
    }
  };

  private getWindowInstance(id: number): WindowInstance {
    const windowInstance = this.windowInstances.find(
      (instance) => instance.id === id
    );

    if (windowInstance === undefined) {
      throw new Error(`Unable to find a window instance with id ${id}`);
    }
    return windowInstance;
  }

  private publishWindowInstances(): void {
    this.windowInstancesSubject.next([...this.windowInstances]);
  }
}
