import { render } from 'preact';
import { LocationProvider, Router, Route } from 'preact-iso';
import { Box, Toolbar } from '@mui/material';

import { Header } from './components/Header.jsx';
import { Home } from './pages/Home/index.jsx';
import { Login } from './pages/Login/index.jsx';
import { Search } from './pages/Search/index.jsx';
import { Settings } from './pages/Settings/index.jsx';
import { Admin } from './pages/Admin/index.jsx';
import { NotFound } from './pages/_404.jsx';
import './style.css';

export function App() {
  return (
    <LocationProvider>
      <Box sx={{ display: 'flex' }}>
        <Header />
        <main>
          <Box component="main" sx={{ display: 'block', p: 2 }}>
            <Toolbar />
            <Router>
              <Route path="/" component={Home} />
              <Route path="/login" component={Login} />
              <Route path="/search" component={Search} />
              <Route path="/settings" component={Settings} />
              <Route path="/admin" component={Admin} />
              <Route default component={NotFound} />
            </Router>
          </Box>
        </main>
      </Box>
    </LocationProvider>
  );
}

render(<App />, document.getElementById('app'));
