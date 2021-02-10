import React from 'react';
import IdyllDocument from 'idyll-document';
import AuthorToolButtons from './components/author-tool-buttons';
import InlineAuthorToolButtons from './components/inline-author-tool-buttons';
import TextEdit from './components/text-edit.js';
import Context from '../context/context';
import DropTarget from './components/drop-target';
import { withContext } from '../context/with-context';

const Renderer = withContext(
  class Renderer extends React.PureComponent {
    static contextType = Context;
    constructor(props) {
      super(props);
      this.state = {};
    }

    componentDidCatch(e) {
      this.setState({
        error: e
      });
    }

    componentDidUpdate(prevProps) {
      if (
        this.state.error &&
        JSON.stringify(prevProps.context.ast) !==
          JSON.stringify(this.props.context.ast)
      ) {
        console.log('hi');
        this.setState({ error: null });
      }
    }

    injectDropTargets(ast) {
      // deep copy
      const astCopy = JSON.parse(JSON.stringify(ast));
      astCopy.children = (astCopy.children || []).map(node => {
        if (node.type !== 'component') {
          return node;
        }

        if (node.name === 'TextContainer') {
          if (node.children.length === 1 && node.children[0].type === 'meta') {
            return node;
          }
          node.children = node.children.reduce((memo, child, i, arr) => {
            if (i === 0) {
              return [
                {
                  id: -1,
                  type: 'component',
                  name: 'IdyllEditorDropTarget',
                  properties: {
                    insertBefore: {
                      type: 'value',
                      value: child.id
                    }
                  }
                },
                child,
                {
                  id: -2,
                  type: 'component',
                  name: 'IdyllEditorDropTarget',
                  properties: {
                    insertAfter: {
                      type: 'value',
                      value: child.id
                    }
                  }
                }
              ];
            }
            return [
              ...memo,
              child,
              {
                id: -(i + 2),
                type: 'component',
                name: 'IdyllEditorDropTarget',
                properties: {
                  insertAfter: {
                    type: 'value',
                    value: child.id
                  }
                }
              }
            ];
          }, []);
        }
        return node;
      });
      // return ast;
      return astCopy;
    }

    render() {
      if (this.state.error) {
        return (
          <div>
            <pre>{this.state.error.toString()}</pre>
          </div>
        );
      }

      const { ast, components } = this.context;
      if (!this.loadedComponents) {
        this.loadedComponents = {};
      }
      components.forEach(({ name, path }) => {
        if (!this.loadedComponents[name]) {
          try {
            this.loadedComponents[name] = require(path);
          } catch (e) {
            console.log('Error loading component', name);
          }
        }
      });

      return (
        <div className='renderer'>
          <div className='renderer-container' contentEditable={false}>
            <IdyllDocument
              key={!this.context.showPreview}
              ast={this.injectDropTargets(ast)}
              components={{
                IdyllEditorDropTarget: DropTarget,
                ...this.loadedComponents
              }}
              layout={this.context.layout}
              theme={this.context.theme}
              context={context => {
                this.context.setContext(context);
              }}
              datasets={{}}
              injectThemeCSS={true}
              injectLayoutCSS={true}
              userViewComponent={AuthorToolButtons}
              userInlineViewComponent={InlineAuthorToolButtons}
              textEditComponent={this.context.showPreview ? null : TextEdit}
              authorView={!this.context.showPreview}
            />
          </div>
        </div>
      );
    }
  }
);

export default Renderer;
