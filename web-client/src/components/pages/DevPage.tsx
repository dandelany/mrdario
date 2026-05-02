import * as React from "react";
import { Link } from "react-router-dom";

export default class DevPage extends React.Component {
  render() {
    return (
      <div className="page-dev">
        <h2>dev modes</h2>

        <div className="dev-options">
          <Link to="/dev/local-multi/level/0/speed/15">
            <span className="btn-white">local multi</span>
          </Link>
          <Link to="/dev/local-multi/level/5/speed/15">
            <span className="btn-white">local multi lvl 5</span>
          </Link>
          <Link to="/settings">
            <span className="btn-white">single player</span>
          </Link>
          <Link to="/mirror/level/0/speed/15">
            <span className="btn-white">mirror</span>
          </Link>
          <Link to="/lobby">
            <span className="btn-white">lobby</span>
          </Link>
        </div>

        <Link to="/">
          <span className="btn-white">back</span>
        </Link>
      </div>
    );
  }
}
