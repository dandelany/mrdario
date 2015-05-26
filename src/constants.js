const keyMirror = require('keymirror');

export default {
    PLAYFIELD_WIDTH: 8,
    PLAYFIELD_HEIGHT: 12,

    MODES: keyMirror({
        LOADING: null,
        TITLE: null,
        PLAYING: null,
        PAUSED: null,
        WON: null,
        LOST: null
    }),

    INPUTS: keyMirror({
        PLAY: null,
        LEFT: null,
        RIGHT: null,
        UP: null,
        DOWN: null,
        ROTATE_LEFT: null,
        ROTATE_RIGHT: null,
        PAUSE: null,
        RESUME: null,
        RESET: null
    }),

    GRID_OBJECTS: keyMirror({
        EMPTY: null,
        VIRUS: null,
        PILL_TOP: null,
        PILL_BOTTOM: null,
        PILL_LEFT: null,
        PILL_RIGHT: null,
        PILL_SEGMENT: null
    }),

    COLORS: keyMirror({
        RED: null,
        BLUE: null,
        YELLOW: null
    })
};
