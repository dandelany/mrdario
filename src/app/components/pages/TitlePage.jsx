import _ from 'lodash';
import React from 'react';
import { Link } from 'react-router';

import aztecCalendar from 'app/img/aztec_small.svg';

const oranges = ["#BE1E2D", "#F05A28", "#F6921E"];
const greens = ["#009345", "#006838", "#8BC53F", "#37B34A"];
const purples = ["#5251A1", "#A376CD",  "#744B9D", "#7A6ED4"];
const colorGroups = [oranges, greens, purples];

const TitlePage = React.createClass({
    getDefaultProps() {
        return {
            windowSize: {
                width: 800,
                height: 600
            }
        }
    },

    render() {
        return <div className="page-title">
            <div className="title-head">
                <h1>Mr. Dario</h1>
            </div>

            <div className="title-game-options">
                <div className="title-game-option">
                    <Link to="settings">
                        <span>
                            One Player
                        </span>
                    </Link>
                </div>

                <div className="title-game-option disabled">
                    <span>
                        Multiplayer soon
                    </span>
                </div>
            </div>
        </div>;
    }
});

function createMarkup(html) { return {__html: html}; }

export default TitlePage;