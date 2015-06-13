import _ from 'lodash';
import Reflux from 'reflux';
import actions from 'app/actions';
import SinglePlayerGameController from 'game/SinglePlayerGameController';

const listenables = _.pick(actions, ['startSinglePlayerGame']);
export default Reflux.createStore({
    listenables,
    init() {
        this.state = {};
    },
    onStartSinglePlayerGame() {
        this.setState({
            activeGame: new SinglePlayerGameController({render: (gameState) => {
                this.setState({gameState});
                this.trigger(this.state);
            }})
        })
    },
    setState(obj) {
        // synchronous, unlike react's setState
        _.assign(this.state, obj);
    }
});
