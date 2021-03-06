import * as React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { withContext } from '../../context/with-context';

export const WrappedUndoRedo = withContext(
  class UndoRedo extends React.PureComponent {
    constructor(props) {
      super(props);
    }

    render() {
      const { canUndo, canRedo, undo, redo } = this.props.context;
      const buttonStyles = disabled => {
        return {
          background: `rgba(0, 0, 0, ${disabled ? '0.3' : '0.8'})`,
          color: '#ffffff',
          padding: '0 10px',
          lineHeight: 'unset',
          display: 'block',
          fontSize: 12,
          marginRight: '0.5em',
          border: 'none',
          cursor: 'pointer',
          height: 25
        };
      };

      return (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '1em',
            right: '1em'
          }}>
          <button
            onClick={() => {
              undo();
            }}
            disabled={!canUndo()}
            style={buttonStyles(!canUndo())}>
            Undo
          </button>
          <button
            onClick={() => {
              redo();
            }}
            disabled={!canRedo()}
            style={buttonStyles(!canRedo())}>
            Redo
          </button>
        </div>
      );
    }
  }
);
