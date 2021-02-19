import React from 'react';
import { DragSource } from 'react-dnd';
import { formatString } from '../../utils';
const { ipcRenderer } = require('electron');

const nameMap = {
  'text container': 'Paragraph',
  'display': 'Show Value',
  'desmos': 'Graphing Calculator',
  'gist': 'GitHub Gist'
}

class Component extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  handleEditClick() {
    const { component } = this.props;
    ipcRenderer.send('client:editComponent', component);
  }
  handleDuplicateClick() {
    const { component } = this.props;
    ipcRenderer.send('client:duplicateComponent', component);
  }

  render() {
    const { component, isDragging, dragSource, searchValue, isCustom } = this.props;
    let name = formatString(component.name);

    if (searchValue && searchValue.length > 0) {
      let boldIndex =
        name.toLowerCase().indexOf(searchValue.toLowerCase()) +
        searchValue.length;
      name = (
        <>
          <strong>{name.substring(0, boldIndex)}</strong>
          {name.substring(boldIndex)}
        </>
      );
    }

    return dragSource(
      <div
        style={{
          opacity: isDragging ? 0.5 : 1
        }}
        className='component'>
          <div className='component-name'>
            {name.toLowerCase ? (nameMap[name.toLowerCase()] || name) : name}
          </div>
          {
            isDragging ? null : (
              <div>
                { isCustom ? <div className="component-edit" onClick={this.handleEditClick.bind(this)}>
                  Edit
                </div> : null}
                <div className="component-duplicate" onClick={this.handleDuplicateClick.bind(this)}>
                  Duplicate
                </div>
              </div>
            )
          }
      </div>
    );
  }
}

/**
 * Implement the drag source contract.
 */
const cardSource = {
  beginDrag: props => ({ component: props.component.name })
};

function collect(connect, monitor) {
  return {
    dragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  };
}

export default DragSource('COMPONENT', cardSource, collect)(Component);
