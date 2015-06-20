import {EventEmitter} from 'events';
import _ from 'lodash';
import Mousetrap from 'mousetrap';

export default class PlayerControls extends EventEmitter {
    constructor(keyBindings) {
        super();
        this.registerKeys(keyBindings);
    }

    registerKeys(keyBindings, initialMode) {
        this.keyBindings = keyBindings;
        if(this.mode) this.unbindModeKeys(this.mode);
        if(initialMode || this.mode) this.bindModeKeys(initialMode || this.mode);
    }
    unbindModeKeys(mode) {
        const modeBindings = this.keyBindings[mode] || {};
        _.each(modeBindings, (keyStr, inputType) => Mousetrap.unbind(keyStr))
    }
    bindModeKeys(mode) {
        const modeBindings = this.keyBindings[mode] || {};
        _.each(modeBindings, (keyStr, inputType) => {
            Mousetrap.bind(keyStr, this.handleInput.bind(this, inputType, 'keydown'), 'keydown');
            Mousetrap.bind(keyStr, this.handleInput.bind(this, inputType, 'keyup'), 'keyup');
        })
    }

    handleInput(inputType, keyType, event) {
        super.emit(inputType, keyType, event);
    }

    setMode(mode) {
        if(this.mode) this.unbindModeKeys(this.mode);
        this.bindModeKeys(mode);
        this.mode = mode;
    }
}
