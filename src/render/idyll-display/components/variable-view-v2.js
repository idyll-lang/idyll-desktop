import React from 'react';
import ReactDataGrid from 'react-data-grid';
import { DragSource } from 'react-dnd';
import copy from 'fast-copy';
import { withContext } from '../../context/with-context';
import Context from '../../context/context';
import {
  stringify,
  getRandomId,
  getNodeById,
  getTextContainerIndex,
} from '../utils';
import {
  formatInitialVariableValue,
  formatCurrentVariableValue,
  convertInputToIdyllValue,
} from '../utils/variable-viewer-utils';

const TYPE_OPTIONS = [
  { id: 'var', value: 'var' },
  { id: 'data', value: 'data' },
  { id: 'derived', value: 'derived' },
];

const ALLOWED_TYPES = TYPE_OPTIONS.map((type) => type.id);

const VariableViewV2 = withContext(
  class VariableView extends React.PureComponent {
    static contextType = Context;

    constructor(props) {
      super(props);

      this.state = {
        rows: [],
        error: null,
      };

      this.addVariable = this.addVariable.bind(this);
      this.getRows = this.getRows.bind(this);
      this.handleGridUpdate = this.handleGridUpdate.bind(this);
      this._isMounted = false;

      this._updateCB = () => {
        this.getRows();
      }
      props.context.onUpdate(this._updateCB);
    }

    componentDidMount() {
      this._isMounted = true;
      this.getRows();
    }

    componentWillUnmount() {
      this._isMounted = false;
      this.props.context && this.props.context.offUpdate && this.props.context.offUpdate(this._updateCB);
    }

    componentDidUpdate(prevProps) {
      if (this._isMounted) {
        const { context } = this.props;

        const prevVarNodes = prevProps.context.ast.children.filter((node) =>
          ALLOWED_TYPES.includes(node.type)
        );
        const currVarNodes = context.ast.children.filter((node) =>
          ALLOWED_TYPES.includes(node.type)
        );

        if (
          JSON.stringify(prevProps.context.context.data()) !==
            JSON.stringify(context.context.data()) ||
          JSON.stringify(prevVarNodes) !== JSON.stringify(currVarNodes)
        ) {
          // when a var/data node is added, context.data() has changed, or variable data is different
          this.getRows();
        }
      }
    }

    addVariable() {
      const nameId = this.props.context.ast.children.length + 2;
      const nameOfVar = `var${nameId}`;

      const nodeId = getRandomId();

      const newVarNode = {
        id: nodeId,
        type: 'var',
        properties: {
          name: {
            type: 'value',
            value: nameOfVar,
          },
          value: {
            type: 'value',
            value: 0,
          },
        },
      };

      const ast = copy(this.props.context.ast);

      const currentNodeIndex = getTextContainerIndex(ast);
      ast.children.splice(currentNodeIndex, 0, newVarNode);

      this.props.context.setAst(ast);
      this.props.context.context.update({ [nameOfVar]: 0 });
    }

    getRows() {
      if (this._isMounted) {
        const currentChildren = this.props.context.ast.children;
        const currentData = this.props.context.context.data();

        const rowsCopy = [];
        currentChildren.map((child) => {
          if (ALLOWED_TYPES.includes(child.type)) {
            const childData = this.handleChild(child, currentData);
            if (childData) {
              rowsCopy.push(childData);
            }
          }
        });

        this.setState({ rows: rowsCopy });
      }
    }

    handleChild(child, currentData) {
      const properties = child.properties;
      const name = properties.name.value;

      const initialValue = formatInitialVariableValue(
        child,
        this.state.rows.filter((row) => row.name === name)[0] || null,
        this.props.context.projectPath
      );
      let currentValue = formatCurrentVariableValue(currentData[name]);

      if (child.type === 'data') {
        if (initialValue && !currentValue) {
          currentValue =
            typeof initialValue === 'string'
              ? JSON.parse(initialValue)
              : initialValue;

          this.props.context.context.update({
            [name]: currentValue,
          });
        } else if (!initialValue) {
          // file unable to load
          return null;
        }
      }

      return {
        type: child.type,
        name: name,
        initialValue: stringify(initialValue),
        currentValue: stringify(currentValue),
        id: child.id,
      };
    }

    handleGridUpdate(update) {
      if (update.action === 'CELL_UPDATE') {
        Object.keys(update.updated).forEach((key) => {
          const { type, value } = convertInputToIdyllValue(update.updated[key]);

          switch (key) {
            case 'currentValue':
              this.handleCurrentValueUpdate(update, value);
              break;
            case 'name':
              this.handleNameUpdate(update, value);
              break;
            case 'initialValue':
              this.handleInitialValueUpdate(update, value, type);
              break;
            case 'type':
              this.handleTypeUpdate(update, value);
              break;
          }
        });
        this.getRows();
      }
    }

    handleCurrentValueUpdate(update, newValue) {
      try {
        newValue = newValue === 'undefined' ? undefined : JSON.parse(newValue);
      } catch (e) {
        newValue = newValue;
      }

      this.props.context.context.update({
        [update.fromRowData.name]: newValue,
      });
    }

    handleNameUpdate(update, newValue) {
      const ast = copy(this.props.context.ast);
      const node = getNodeById(ast, update.fromRowId);
      node.properties.name.value = newValue;

      this.props.context.setAst(ast);

      if (update.fromRowData.name !== newValue) {
        const contextDataCopy = this.props.context.context.data();
        contextDataCopy[newValue] = contextDataCopy[update.fromRowData.name];

        delete contextDataCopy[update.fromRowData.name];
        this.props.context.context.update(contextDataCopy);
      }
    }

    handleInitialValueUpdate(update, newValue, type) {
      const ast = copy(this.props.context.ast);
      const node = getNodeById(ast, update.fromRowId);
      node.properties.value.value = newValue;
      node.properties.value.type =
        type === 'expression' ? 'expression' : 'value';

      this.props.context.setAst(ast);
    }

    handleTypeUpdate(update, newValue) {
      if (
        (update.fromRowData.type === 'var' ||
          update.fromRowData.type === 'derived') &&
        newValue !== 'data'
      ) {
        const ast = copy(this.props.context.ast);
        const node = getNodeById(ast, update.fromRowId);
        const typeOfValue = newValue === 'var' ? 'value' : 'expression';

        if (ALLOWED_TYPES.includes(newValue)) {
          node.type = newValue;
          node.properties.value.type = typeOfValue;
          this.props.context.setAst(ast);
        }
      }
    }

    render() {
      const { error, rows } = this.state;
      const columns = [
        { key: 'type', name: 'Type', editable: (row) => row.type !== 'data' },
        {
          key: 'name',
          name: 'Name',
          editable: true,
          formatter: DraggableFormatter,
        },
        {
          key: 'initialValue',
          name: 'Initial',
          editable: (row) => row.type !== 'data',
        },
        { key: 'currentValue', name: 'Current', editable: true },
      ];

      return (
        <div className='variables-view'>
          <div className='variables-table-view'>
            <ReactDataGrid
              columns={columns}
              rowGetter={(i) => rows[i]}
              rowsCount={rows.length}
              enableCellSelect={true}
              onGridRowsUpdated={this.handleGridUpdate}
              minColumnWidth={10}
            />
          </div>
          <div className='add-variable-button'>
            <button onClick={this.addVariable}>Add variable</button>
          </div>
          {/* {error ? <div>{error}</div> : <></>} */}
        </div>
      );
    }
  }
);

class VariableFormatter extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { value, isDragging, dragSource } = this.props;
    return dragSource(
      <div style={{ opacity: isDragging ? 0.5 : 1 }}>{value}</div>
    );
  }
}

/**
 * Implement the drag source contract.
 */
const variableSource = {
  beginDrag: (props) => ({ name: props.value }),
};

function variableCollect(connect, monitor) {
  return {
    dragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
}

const DraggableFormatter = DragSource(
  'VARIABLE',
  variableSource,
  variableCollect
)(VariableFormatter);

export default VariableViewV2;
