import React from 'react';
import { Link } from 'react-router';

import virusRaw from 'raw!app/svg/virus_orange.svg'

const TitlePage = React.createClass({
    render() {
        return <div className="page-title">
            <h3>Welcome to Mr. Dario!</h3>

            <div className="title-game-options">
                <Link to="settings">
                    One Player
                </Link>
                <div>
                    Multiplayer coming soon
                </div>
            </div>

            <h4>Press spacebar to play</h4>

            <div dangerouslySetInnerHTML={createMarkup(virusRaw)}></div>
        </div>;
    }
});

function createMarkup(html) { return {__html: html}; }

export default TitlePage;