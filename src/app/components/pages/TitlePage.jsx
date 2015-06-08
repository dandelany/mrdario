import React from 'react';
import { Link } from 'react-router';

const TitlePage = React.createClass({
    render() {
        return <div className="page-title">
            <h3>Welcome to Mr. Dario!</h3>
            <h4>Start a new game:</h4>

            <div className="title-game-options">
                <Link to="single">
                    One Player
                </Link>
                <div>
                    Multiplayer coming soon
                </div>
            </div>

            <GameSettings speedLevels={SPEED_LEVELS} />
        </div>;
    }
});

export default TitlePage;