import React from 'react';
import BlastRequest from './components/BlastRequest';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

import './styles/App.scss';

const theme = createMuiTheme({
  typography: {
    fontFamily: 'Recursive'
  },
  palette: {
    primary: {
      main: '#43a047',
    },
    secondary: {
      main: '#ba68c8',
    },
    error: {
      main: '#d32f2f'
    }
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <BlastRequest/>
      </div>
    </ThemeProvider>
  );
}

export default App;
