import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Homepage from './pages/Homepage/Homepage'
import Account from './pages/Account/Account'
import Strategies from './pages/Strategies/Strategies.js'
import './App.css';
import Topbar from './components/TopBar/Topbar.js'
import UserProvider from './providers/UserProvider'

class App extends React.Component {

  state = {
    page: "homepage"
  }

  render() {

    return (
      <UserProvider>
        <Router>
          <div className="App">
            <Topbar />
          </div>

          <Switch>
            <Route path='/account'>
              <Account/>
            </Route>
            <Route path='/strategies'>
              <Strategies/>
            </Route>
            <Route path='/'>
              <Homepage/>
            </Route>
          </Switch>
        </Router>
      </UserProvider>
    );
  }

}

export default App;
