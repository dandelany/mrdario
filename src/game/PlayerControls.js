const key = require('keymaster');
const _ =  require('lodash');
const {EventEmitter} = require('events');


export default class PlayerControls extends EventEmitter {
    constructor(keyBindings) {
        super();
        this.registerKeys(keyBindings);
        this.callbacks = {};
    }

    registerKeys(keyBindings) {
        _.each(keyBindings, (bindings, scope) => {
            _.each(bindings, (keyType, inputType) => {
                key(keyType, scope, this.handleInput.bind(this, inputType));
            }, this)
        }, this)
    }

    handleInput(inputType, event) {
        //console.log('input ' + inputType);
        super.emit(inputType, event);
    }

    setMode(mode) {
        key.setScope(mode);
    }
}
