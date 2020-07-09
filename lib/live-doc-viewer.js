const LiveDocViewer = require('./LiveDocViewer');

let instance = new LiveDocViewer();

module.exports = {
    activate: () => instance.activate(...arguments),
    deactivate: () => instance.deactivate(...arguments),
    serialize: () => instance.serialize(...arguments),

    // TODO: Create a custom dialog to set program options.
    // Atom does not have a good way to edit arrays of objects in the settings
    // panel, so I've been forced to use several separate objects instead.
    config: {
        delay: {
            type: 'integer',
            description: 'Number of milliseconds to wait before updating text.',
            default: 500,
            minimum: 0,
        },
        command1: {
            type: 'object',
            properties: {
                grammar: {
                    type: 'string',
                    default: 'Any',
                },
                program: {
                    type: 'string',
                    default: 'man',
                },
                program_arguments: {
                    type: 'string',
                    default: '--pager=cat --sections=3,2,1,8 {WORD}',
                }
            },
        },
        command2: {
            type: 'object',
            properties: {
                grammar: {
                    type: 'string',
                    default: 'Python',
                },
                program: {
                    type: 'string',
                    default: 'pydoc3',
                },
                program_arguments: {
                    type: 'string',
                    default: '{WORD}',
                },
            },
        },
        command3: {
            type: 'object',
            properties: {
                grammar: {
                    type: 'string',
                    default: 'Ruby',
                },
                program: {
                    type: 'string',
                    default: 'ri',
                },
                program_arguments: {
                    type: 'string',
                    default: '-T --format=bs {WORD}',
                },
            },
        },
        command4: {
            type: 'object',
            properties: {
                grammar: {
                    type: 'string',
                    default: '',
                },
                program: {
                    type: 'string',
                    default: '',
                },
                program_arguments: {
                    type: 'string',
                    default: '',
                }
            },
        },
        command5: {
            type: 'object',
            properties: {
                grammar: {
                    type: 'string',
                    default: '',
                },
                program: {
                    type: 'string',
                    default: '',
                },
                program_arguments: {
                    type: 'string',
                    default: '',
                },
            },
        },
    },
};
