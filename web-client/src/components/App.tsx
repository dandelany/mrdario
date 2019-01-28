import * as React from "react";

require("@/styles/main.scss");
require("@/styles/rc-slider.less");


import AppContainer from "./AppContainer";
import { HashRouter as Router } from "react-router-dom";

import routes from "@/routes";
// import AppContainer from './components/AppContainer';

export interface AppProps {}

export default class App extends React.Component<AppProps> {
  render() {
    return (
      <Router>
        <div>
          <AppContainer>{routes}</AppContainer>
        </div>
      </Router>
    );
  }
}
