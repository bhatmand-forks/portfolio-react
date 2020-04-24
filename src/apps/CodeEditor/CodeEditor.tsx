import React, { useState } from 'react';
import { Window, WindowComponent } from '~/platform/components/Window';
import { CodeEditorDescriptor } from './CodeEditorDescriptor';
import { Console, Editor, StatusBar } from './components';

import styles from './CodeEditor.module.scss';

const CodeEditor: WindowComponent = ({
  active,
  windowRef,
  ...injectedWindowProps
}) => {
  const [code, setCode] = useState('');

  return (
    <Window
      active={active}
      {...injectedWindowProps}
      background="#45484a"
      minHeight={500}
      minWidth={800}
      ref={windowRef}
      title={CodeEditorDescriptor.appName}
      titleBackground="#f0f0f0"
      titleColor="#2f2f2f"
    >
      <div className={styles.codeEditor}>
        <Editor className={styles.editor} code={code} onChange={setCode} />
        <Console active={active} className={styles.console} codeToExec={code} />
        <StatusBar className={styles.statusBar} />
      </div>
    </Window>
  );
};

CodeEditor.appDescriptor = CodeEditorDescriptor;

export default CodeEditor;