import { faCamera } from '@fortawesome/free-solid-svg-icons/faCamera';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons/faFolderOpen';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faStream } from '@fortawesome/free-solid-svg-icons/faStream';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useKeyMap } from '@josselinbuils/hooks/useKeyMap';
import { useList } from '@josselinbuils/hooks/useList';
import cn from 'classnames';
import {
  ChangeEvent,
  DragEvent,
  FC,
  SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useMemState } from '~/platform/hooks/useMemState';
import { highlightCode } from '~/platform/utils/highlightCode/highlightCode';
import { ClientCursor } from '../../interfaces/ClientCursor';
import { ClientState } from '../../interfaces/ClientState';
import { CursorPosition } from '../../interfaces/CursorPosition';
import { EditableState } from '../../interfaces/EditableState';
import { Selection } from '../../interfaces/Selection';
import { createSelection } from '../../utils/createSelection';
import { spliceString } from '../../utils/spliceString';
import { Shortcut } from '../Shortcut/Shortcut';
import { Toolbar } from '../Toolbar/Toolbar';
import { ToolButton } from '../ToolButton/ToolButton';
import { Cursor } from './components/Cursor/Cursor';
import { LineHighlight } from './components/LineHighlight/LineHighlight';
import { LineNumbers } from './components/LineNumbers/LineNumbers';
import { Tab } from './components/Tab/Tab';
import { Tabs } from './components/Tabs/Tabs';
import {
  Completion,
  useAutoCompletion,
} from './hooks/useAutoCompletion/useAutoCompletion';
import { useHistory } from './hooks/useHistory';
import { useSharedFile } from './hooks/useSharedFile/useSharedFile';
import { EditorFile } from './interfaces/EditorFile';
import { autoEditChange } from './utils/autoEditChange/autoEditChange';
import { comment } from './utils/comment';
import { duplicate } from './utils/duplicate';
import { fileSaver, SHARED_FILENAME } from './utils/fileSaver';
import { canFormat, formatCode } from './utils/formatCode';
import { getLineBeforeCursor } from './utils/getLineBeforeCursor';
import { getLineIndent } from './utils/getLineIndent';
import { getLineNumber } from './utils/getLineNumber';
import { indent } from './utils/indent';
import { isCodePortionEnd } from './utils/isCodePortionEnd';
import { moveLines } from './utils/moveLines';
import { showShortcuts } from './utils/showShortcuts';
import { unindent } from './utils/unindent';

import styles from './Editor.module.scss';

export const Editor: FC<Props> = ({
  className,
  code,
  onChange,
  onCursorPositionUpdate,
}) => {
  const [active, setActive] = useState(false);
  const [autoCompleteActive, setAutoCompleteActive] = useState(false);
  const [cursorColor, setCursorColor] = useState('#f0f0f0');
  const [cursors, setCursors] = useState<ClientCursor[]>([]);
  const [displayDragOverlay, setDisplayDragOverlay] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState('');
  const [selection, setSelection] = useState<Selection>(() =>
    createSelection(0)
  );
  const [files, fileManager] = useList<EditorFile>(fileSaver.loadFiles);
  const [activeFileName, previouslyActiveFileName, setActiveFileName] =
    useMemState<string>(files[0].name);
  const [lineCount, setLineCount] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const codeElementRef = useRef<HTMLDivElement>(null);
  const textAreaElementRef = useRef<HTMLTextAreaElement>(null);
  const cursorOffset = selection[0];
  const { complete, hasCompletionItems } = useAutoCompletion({
    active: autoCompleteActive,
    code,
    cursorOffset,
    lineIndent: getLineIndent(code, cursorOffset),
    menuClassName: styles.autoCompletionMenu,
    onCompletion: applyAutoCompletion,
    textAreaElement: textAreaElementRef.current as HTMLTextAreaElement,
  });
  const applyState = useCallback(
    (state: EditableState): void => {
      onChange(state.code);
      setSelection(state.selection);
    },
    [onChange]
  );
  const isSharedFileActive = activeFileName === SHARED_FILENAME;
  const { pushState } = useHistory({
    active: !isSharedFileActive,
    code,
    fileName: activeFileName,
    selection,
    applyState,
  });
  const { updateClientState, updateSelection } = useSharedFile({
    active: isSharedFileActive,
    applyClientState,
    code,
    selection,
  });
  const activeFile = files.find(
    ({ name }) => name === activeFileName
  ) as EditorFile;

  useKeyMap(
    {
      'Alt+Shift+ArrowDown': () => updateState(moveLines(code, selection, 1)),
      'Alt+Shift+ArrowUp': () => updateState(moveLines(code, selection, -1)),
      'Control+:,Control+/,Meta+:,Meta+/': () =>
        updateState(comment(code, selection)),
      'Control+D,Meta+D': () => updateState(duplicate(code, selection)),
      'Control+N,Meta+N': createFile,
      'Control+O,Meta+O': () => open(undefined),
      'Control+S,Meta+S': format,
      Escape: () => {
        if (autoCompleteActive) {
          setAutoCompleteActive(false);
        }
      },
      'Shift+Tab': () => updateState(unindent(code, selection)),
      Tab: () => {
        if (hasCompletionItems) {
          complete();
        } else {
          updateState(indent(code, selection));
        }
      },
    },
    active
  );

  useEffect(() => {
    activeFile.content = code;
    fileSaver.saveFiles(files);
  }, [activeFile, code, files, isSharedFileActive]);

  useLayoutEffect(() => {
    applyState({
      code: activeFile.content,
      selection: createSelection(0),
    });
    if (textAreaElementRef.current !== null) {
      textAreaElementRef.current.focus();
    }
  }, [activeFile, applyState]);

  useLayoutEffect(() => {
    setHighlightedCode(
      highlightCode(
        code,
        activeFile.language,
        selection[1] === selection[0] ? selection[0] : undefined
      )
    );
  }, [activeFile.language, code, selection]);

  useEffect(() => {
    const x = getLineBeforeCursor(code, cursorOffset).length + 1;
    const y = getLineNumber(code, cursorOffset) + 1;
    onCursorPositionUpdate({ offset: cursorOffset, x, y });
  }, [code, cursorOffset, onCursorPositionUpdate]);

  useLayoutEffect(() => {
    const newLineCount = (code.match(/\n/g)?.length || 0) + 1;

    if (newLineCount !== lineCount) {
      setLineCount(newLineCount);
    }
  }, [code, lineCount]);

  useLayoutEffect(() => {
    const textAreaElement = textAreaElementRef.current;

    if (textAreaElement !== null) {
      const { selectionEnd, selectionStart } = textAreaElement;

      if (selectionStart !== selection[0] || selectionEnd !== selection[1]) {
        textAreaElement.setSelectionRange(selection[0], selection[1]);
      }
    }
  }, [code, selection, textAreaElementRef]);

  useLayoutEffect(() => {
    if (codeElementRef.current !== null) {
      codeElementRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  function applyAutoCompletion({
    completion,
    newCursorOffset,
  }: Completion): void {
    insertText(completion, newCursorOffset);
  }

  function applyClientState(state: ClientState): void {
    if (code !== state.code) {
      onChange(state.code);
    }
    if (cursorColor !== state.cursorColor) {
      setCursorColor(state.cursorColor);
    }
    if (
      selection[0] !== state.selection[0] ||
      selection[1] !== state.selection[1]
    ) {
      setSelection(state.selection);
    }
    if (cursors !== state.cursors) {
      setCursors(state.cursors);
    }
  }

  function closeFile(name: string): void {
    const fileToClose = files.find((file) => file.name === name) as EditorFile;

    if (activeFileName === name) {
      const isPreviouslyActiveFileStillOpen = files.some(
        (file) => file.name === previouslyActiveFileName
      );
      const newActiveFileName = isPreviouslyActiveFileStillOpen
        ? (previouslyActiveFileName as string)
        : (files.find((file) => file !== fileToClose) as EditorFile).name;

      setActiveFileName(newActiveFileName);
    }

    const updatedFiles = [...files];
    updatedFiles.splice(files.indexOf(fileToClose), 1);
    fileManager.set(updatedFiles);
  }

  function createFile(): void {
    const maxIndex = Math.max(
      ...files.map((file) =>
        parseInt(
          file.name.startsWith('local') ? file.name.slice(5, -3) || '0' : '-1',
          10
        )
      )
    );
    const name = `local${maxIndex > -1 ? maxIndex + 1 : ''}.js`;
    fileManager.push({ content: '', language: 'javascript', name });
    setActiveFileName(name);
  }

  function disableAutoCompletion(): void {
    if (autoCompleteActive) {
      setAutoCompleteActive(false);
    }
  }

  async function exportCodeSnippet(): Promise<void> {
    const { exportAsImage } = await import(
      './utils/exportAsImage/exportAsImage'
    );
    await exportAsImage(code, highlightedCode);
  }

  async function format(): Promise<void> {
    try {
      const { language } = activeFile;
      const formatted = await formatCode(code, cursorOffset, language);

      if (formatted.code !== code) {
        if (isSharedFileActive) {
          updateClientState(formatted);
        } else {
          updateState(formatted);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    const newCode = event.target.value;
    const newCursorOffset = event.target.selectionStart;

    if (newCode.length > code.length) {
      const allowAutoComplete = isCodePortionEnd(code, cursorOffset);

      if (allowAutoComplete && !autoCompleteActive) {
        setAutoCompleteActive(true);
      }
    } else {
      disableAutoCompletion();
    }

    const currentState = { code, selection };
    const newState = autoEditChange(currentState, {
      code: newCode,
      selection: createSelection(newCursorOffset),
    });

    if (newState !== undefined) {
      updateState(newState);

      if (isSharedFileActive) {
        // Mitigates that React issue https://github.com/facebook/react/issues/12762
        onChange(`${code} `);
      }
    }
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    setDisplayDragOverlay(false);

    const file = event.dataTransfer?.files?.[0];

    if (file !== undefined) {
      return open(file);
    }
  }

  function handleSelect({ nativeEvent, target }: SyntheticEvent): void {
    const isKeyboardEvent = nativeEvent instanceof KeyboardEvent;
    const isMouseEvent = nativeEvent instanceof MouseEvent;

    if (!isKeyboardEvent && !isMouseEvent) {
      return;
    }

    const { selectionEnd, selectionStart } = target as HTMLTextAreaElement;

    if (
      selectionEnd !== selectionStart ||
      !isCodePortionEnd(code, selectionStart)
    ) {
      setAutoCompleteActive(false);
    }

    if (selectionStart === selection[0] && selectionEnd === selection[1]) {
      return;
    }

    const newSelection = createSelection(selectionStart, selectionEnd);

    if (isSharedFileActive) {
      updateSelection(newSelection);
    } else {
      setSelection(newSelection);
    }
  }

  function insertText(
    text: string,
    newCursorOffset: number = cursorOffset + text.length
  ): void {
    updateState({
      code: spliceString(code, cursorOffset, 0, text),
      selection: createSelection(newCursorOffset),
    });
  }

  async function open(file?: File): Promise<void> {
    try {
      const { openFile } = await import('./utils/openFile');
      const editorFile = await openFile(file);

      if (editorFile !== undefined) {
        if (files.some(({ name }) => name === editorFile.name)) {
          closeFile(editorFile.name);
        }
        fileManager.push(editorFile);
        setActiveFileName(editorFile.name);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function updateState(newState: EditableState | undefined): void {
    if (newState === undefined) {
      return;
    }
    if (isSharedFileActive) {
      updateClientState(newState);
    } else {
      pushState(newState);
      applyState(newState);
    }
  }

  return (
    <div className={cn(styles.editor, className)}>
      <Toolbar className={styles.toolbar}>
        <ToolButton
          icon={faPlus}
          onClick={createFile}
          title={
            <>
              New&nbsp;
              <Shortcut keys={['Ctrl', 'N']} />
            </>
          }
        />
        <ToolButton
          icon={faFolderOpen}
          onClick={() => open()}
          title={
            <>
              Open&nbsp;
              <Shortcut keys={['Ctrl', 'O']} />
            </>
          }
        />
        <ToolButton
          disabled={code.length === 0 || !canFormat(activeFile.language)}
          icon={faStream}
          onClick={format}
          title={
            <>
              Format&nbsp;
              <Shortcut keys={['Ctrl', 'S']} />
            </>
          }
        />
        <ToolButton
          disabled={code.length === 0}
          icon={faCamera}
          onClick={exportCodeSnippet}
          title="Export as image"
        />
        <ToolButton
          icon={faCircleInfo}
          onClick={showShortcuts}
          title="Show shortcuts"
        />
      </Toolbar>
      <Tabs className={styles.tabs} label="Files">
        {files.map(({ name }, index) => (
          <Tab
            key={name}
            onClick={() => setActiveFileName(name)}
            selected={name === activeFileName}
          >
            {name}
            {index >= fileSaver.defaultFiles.length && (
              <FontAwesomeIcon
                className={styles.close}
                icon={faTimes}
                onClick={(event) => {
                  event.stopPropagation();
                  closeFile(name);
                }}
              />
            )}
          </Tab>
        ))}
      </Tabs>
      <div className={styles.container}>
        {activeFile.SideComponent ? <activeFile.SideComponent /> : null}
        <LineNumbers
          className={styles.lineNumbers}
          code={code}
          lineCount={lineCount}
          scrollTop={scrollTop}
          selection={selection}
        />
        <div className={styles.code}>
          <div className={styles.graphicalObjects} ref={codeElementRef}>
            <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
            {textAreaElementRef.current && (
              <>
                {isSharedFileActive &&
                  cursors.map((cursor) => (
                    <Cursor
                      code={code}
                      color={cursor.color}
                      key={cursor.clientID}
                      selection={cursor.selection}
                      parent={textAreaElementRef.current as HTMLTextAreaElement}
                    />
                  ))}
                <LineHighlight
                  parent={textAreaElementRef.current as HTMLTextAreaElement}
                  selection={selection}
                />
              </>
            )}
          </div>
          <textarea
            className={styles.textarea}
            onBlur={() => setActive(false)}
            onChange={handleChange}
            onDragEnd={() => setDisplayDragOverlay(false)}
            onDragEnter={() => {
              setDisplayDragOverlay(true);
              return false;
            }}
            onDragLeave={() => setDisplayDragOverlay(false)}
            onDragOver={() => false}
            onDrop={handleDrop as (event: DragEvent) => void}
            onKeyDown={(event) => {
              // Waits for selectionEnd and selectionStart to be updated
              setTimeout(() => handleSelect(event), 0);
            }}
            onMouseDown={(event) => {
              disableAutoCompletion();
              // Waits for selectionEnd and selectionStart to be updated
              setTimeout(() => handleSelect(event), 0);
            }}
            onFocus={() => setActive(true)}
            onSelect={handleSelect}
            onScroll={({ target }) =>
              setScrollTop((target as HTMLTextAreaElement).scrollTop)
            }
            ref={textAreaElementRef}
            spellCheck={false}
            style={isSharedFileActive ? { caretColor: cursorColor } : undefined}
            value={code}
          />
          {displayDragOverlay && (
            <div className={styles.dragAndDropOverlay}>Drop to open</div>
          )}
        </div>
      </div>
    </div>
  );
};

interface Props {
  className?: string;
  code: string;
  onChange(code: string): void;
  onCursorPositionUpdate(cursorPosition: CursorPosition): void;
}
