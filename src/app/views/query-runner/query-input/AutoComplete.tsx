import { getTheme, KeyCodes, Label, TextField } from 'office-ui-fabric-react';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { IAutoCompleteProps, IAutoCompleteState } from '../../../../types/auto-complete';
import * as autoCompleteActionCreators from '../../../services/actions/autocomplete-action-creators';
import { parseSampleUrl } from '../../../utils/sample-url-generation';
import { queryInputStyles } from './QueryInput.styles';
import { cleanUpSelectedSuggestion } from './util';

class AutoComplete extends Component<IAutoCompleteProps, IAutoCompleteState> {

  constructor(props: IAutoCompleteProps) {
    super(props);

    this.state = {
      activeSuggestion: 0,
      filteredSuggestions: [],
      suggestions: [],
      showSuggestions: false,
      userInput: this.props.sampleUrl,
      compare: ''
    };
  }

  public onChange = (e: any) => {
    const { suggestions, showSuggestions, userInput: previousUserInput, compare } = this.state;
    const userInput = e.target.value;

    if (showSuggestions && suggestions.length) {
      let compareString = userInput.replace(previousUserInput, '');
      if (compare) {
        compareString = compare + compareString;
      }
      // Filter our suggestions that don't contain the user's input
      const filteredSuggestions = suggestions.filter(
        (suggestion: any) => {
          return suggestion.toLowerCase().indexOf(compareString.toLowerCase()) > -1;
        }
      );

      this.setState({
        filteredSuggestions,
        compare: compareString
      });
    }

    this.setState({
      activeSuggestion: 0,
      showSuggestions: true,
      userInput
    });

    this.props.contentChanged(userInput);
    this.initialiseAutoComplete(userInput);
    this.filterParameters(userInput);
  };

  public onClick = (e: any) => {
    const selected = e.currentTarget.innerText;
    this.appendSuggestionToUrl(selected);
  };

  private initialiseAutoComplete = (url: string) => {
    const lastCharacter = url.substring(url.length - 1);
    if (lastCharacter === '?') {
      const { requestUrl } = parseSampleUrl(url);
      if (requestUrl) {
        if (`/${requestUrl}` !== this.props.autoCompleteOptions.url) {
          this.props.actions!.fetchAutoCompleteOptions(requestUrl);
        } else {
          this.generateSuggestions();
        }
      }
    }
  }

  public onKeyDown = (e: any) => {
    const { activeSuggestion, filteredSuggestions, userInput, showSuggestions } = this.state;

    switch (e.keyCode) {
      case KeyCodes.tab:
        if (showSuggestions) {
          const selected = filteredSuggestions[activeSuggestion];
          this.appendSuggestionToUrl(selected);
        }
        break;

      case KeyCodes.up:
        if (activeSuggestion === 0) {
          return;
        }
        this.setState({ activeSuggestion: activeSuggestion - 1 });
        break;

      case KeyCodes.down:
        if (activeSuggestion - 1 === filteredSuggestions.length) {
          return;
        }
        this.setState({ activeSuggestion: activeSuggestion + 1 });
        break;

      default:
        break;
    }

  };

  public generateSuggestions = () => {
    const { parameters } = this.props.autoCompleteOptions;
    const suggestions: string[] = [];
    if (parameters) {
      parameters.forEach((element: any) => {
        suggestions.push(element.name);
      });
    }

    this.setState({
      filteredSuggestions: suggestions,
      suggestions,
      showSuggestions: true
    });
  }

  public componentDidUpdate = (prevProps: IAutoCompleteProps) => {
    if (prevProps.autoCompleteOptions !== this.props.autoCompleteOptions) {
      this.generateSuggestions();
    }
  }

  private filterParameters = (url: string) => {
    const lastCharacter = url.substring(url.length - 1);
    if (lastCharacter === '=' || lastCharacter === ',') {
      const param = url.split('$').pop()!.split('=')[0];
      const { parameters } = this.props.autoCompleteOptions;
      const section = parameters.find(k => k.name === `$${param}`);
      const list: string[] = [];
      if (section.items) {
        section.items.forEach((element: string) => {
          list.push(element);
        });
        this.setState({
          filteredSuggestions: list,
          suggestions: list,
          showSuggestions: true
        });
      }
    }
  }

  private appendSuggestionToUrl(selected: string) {
    const { userInput, compare } = this.state;
    const selectedSuggestion = cleanUpSelectedSuggestion(compare, userInput, selected);
    this.setState({
      activeSuggestion: 0,
      filteredSuggestions: [],
      showSuggestions: false,
      userInput: selectedSuggestion,
      compare: ''
    });
    this.props.contentChanged(selectedSuggestion);
  }

  public render() {
    const {
      activeSuggestion,
      filteredSuggestions,
      showSuggestions,
      userInput
    } = this.state;

    const { fetchingSuggestions } = this.props;

    const currentTheme = getTheme();
    const suggestionClass: any = queryInputStyles(currentTheme).autoComplete.suggestions;
    const suggestionOption: any = queryInputStyles(currentTheme).autoComplete.suggestionOption;
    const activeSuggestionClass: any = queryInputStyles(currentTheme).autoComplete.suggestionActive;
    const autoInput: any = queryInputStyles(currentTheme).autoComplete.input;

    let suggestionsListComponent;

    if (showSuggestions && userInput) {
      if (filteredSuggestions.length) {
        suggestionsListComponent = (
          <ul style={suggestionClass} aria-haspopup='true'>
            {filteredSuggestions.map((suggestion: {} | null | undefined, index: any) => {
              return (
                <li
                  style={(index === activeSuggestion) ? activeSuggestionClass : suggestionOption}
                  key={index}
                  onClick={this.onClick}
                >
                  <Label>
                    {suggestion}
                  </Label>
                </li>
              );
            })}
          </ul>
        );
      }
    }

    return (
      <>
        <TextField
          className={autoInput}
          type='text'
          autoComplete='off'
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          defaultValue={userInput}
          value={userInput}
          suffix={(fetchingSuggestions) ? '...' : undefined}
        />
        {suggestionsListComponent}
      </>
    );
  }
}

function mapStateToProps(state: any) {
  return {
    sampleUrl: state.sampleQuery.sampleUrl,
    autoCompleteOptions: state.autoComplete.data,
    fetchingSuggestions: state.autoComplete.pending
  };
}

function mapDispatchToProps(dispatch: Dispatch): object {
  return {
    actions: bindActionCreators(
      {
        ...autoCompleteActionCreators,
      },
      dispatch
    )
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoComplete);