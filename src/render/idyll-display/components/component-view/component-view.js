import React from 'react';
import Context from '../../../context/context';
import {
  COMPONENTS_CATEGORY_MAP,
  INPUT,
  LAYOUT,
  LOGIC,
  PRESENTATION,
  MATH_CODE,
  TEXT,
  MEDIA,
  HELPERS,
  EXCLUDED_COMPONENTS,
  COMPONENT_NAME_MAP
} from '../../../../constants';
import ComponentAccordion from './component-accordion';
import { withContext } from '../../../context/with-context';
import Component from './component';
import { SearchBarInput } from './search-bar';
import { formatString } from '../../utils';

export const WrappedComponentView = withContext(
  class ComponentView extends React.PureComponent {
    static contextType = Context;
    constructor(props) {
      super(props);

      this.state = {
        searchValue: '',
        filteredComponents: [],
        componentMaps: this.buildComponentMaps()
      };


    }

    buildComponentMaps () {
      this.categoriesMap = {
        [TEXT]: [],
        [INPUT]: [],
        [MEDIA]: [],
        [PRESENTATION]: [],
        [MATH_CODE]: [],
        [LAYOUT]: [],
        [LOGIC]: [],
        // [HELPERS]: [],
        Custom: []
      };

      if (
        this.props.context.components &&
        this.props.context.components.length > 0
      ) {
        this.props.context.components.filter(component => {
          return !EXCLUDED_COMPONENTS.includes(component.name);
        }).map(component => {
          if (COMPONENTS_CATEGORY_MAP.has(component.name)) {
            this.categoriesMap[
              COMPONENTS_CATEGORY_MAP.get(component.name)
            ].push(component);
          } else {
            this.categoriesMap.Custom.push(component);
          }
        });
      }

      return this.categoriesMap;
    }

    searchComponents = e => {
      const value = e.target.value;

      const filteredResults = this.props.context.components.filter(
        component => {
          let name = formatString(component.name).toLowerCase();
          name = COMPONENT_NAME_MAP[name] || name;
          return name.toLowerCase().includes(value.toLowerCase());
        }
      );

      this.setState({
        searchValue: value,
        filteredComponents: filteredResults
      });
    };

    clearSearch = () => {
      this.setState({
        searchValue: '',
        filteredComponents: []
      });
    };

    renderAccordion = () =>
      Object.keys(this.categoriesMap).map((category, i) => {
        return (
          <ComponentAccordion
            category={category}
            isCustom={category === 'Custom'}
            key={'component_category:' + category}
            components={this.categoriesMap[category]}
          />
        );
      });

    renderFilteredResults = () => {
      if (this.state.filteredComponents.length === 0) {
        return <p style={{ margin: '0.25em 1.5em' }}>No results found</p>;
      } else {
        return this.state.filteredComponents.map((component, i) => {
          return (
            <div
              className='component-container'
              id='filtered-search-results'
              key={'component-container:' + i}>
              <Component
                key={component.name}
                component={component}
                isCustom={this.categoriesMap.Custom.includes(component)}
                searchValue={this.state.searchValue}
              />
            </div>
          );
        });
      }
    };

    componentDidUpdate (prevProps) {
      if (this.props.context.components.length !== prevProps.context.components.length) {
        this.setState({
          componentMaps: this.buildComponentMaps()
        })
      }
    }

    render() {
      return (
        <div className='component-view'>
          <div style={{color: '#999', fontSize: 11, fontWeight: 'bold', marginBottom: 18, lineHeight: 1.2}}>Drag-and-drop components onto the document.</div>
          <SearchBarInput
            placeholder='Search Components'
            onChange={this.searchComponents}
            value={this.state.searchValue}
            onClick={this.clearSearch}
          />
          <div className='component-container'>
            {this.state.searchValue.length > 0
              ? this.renderFilteredResults()
              : this.renderAccordion()}
          </div>
        </div>
      );
    }
  }
);

export default WrappedComponentView;
