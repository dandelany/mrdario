const MrDario = React.createClass({
    onKeyPress() { console.log('help') },
    render() {
        return <div>
            <h2>Mr Dario</h2>

            <div className="playfield" onKeyPress={this.onKeyPress}>
                {_.range(PLAYFIELD_WIDTH).map(rowIndex => {
                    return <div className="playfield-row">
                        {_.range(PLAYFIELD_HEIGHT).map(colIndex => {
                            return <div className="playfield-cell">..</div>
                        })}
                    </div>
                })}
            </div>

        </div>
    }
});

export default class App {
    constructor(el) {
        this.el = el;
    }
    render(gameState) {
        React.render(<MrDario />, this.el);
    }
}