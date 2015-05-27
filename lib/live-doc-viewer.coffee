TextPanel = require './textpanel'
{CompositeDisposable} = require 'atom'
child_process = require('child_process');

module.exports = LiveDocViewer =
    textPanel: null
    modalPanel: null
    subscriptions: null

    # TODO: Create a custom dialog to set program options.
    # Atom does not have a good way to edit arrays of objects in the settings
    # panel, so I've been forced to use several separate objects instead.
    config:
        delay:
            type: 'integer'
            description: 'Number of milliseconds to wait before updating text.'
            default: 200
            minimum: 0
        command1:
            type: 'object'
            properties:
                grammar:
                    type: 'string'
                    default: 'Any'
                program:
                    type: 'string'
                    default: 'man'
                program_arguments:
                    type: 'string'
                    default: '--pager=cat --sections=3,2,1,8 {WORD}'
        command2:
            type: 'object'
            properties:
                grammar:
                    type: 'string'
                    default: 'Python'
                program:
                    type: 'string'
                    default: 'pydoc'
                program_arguments:
                    type: 'string'
                    default: '{WORD}'
        command3:
            type: 'object'
            properties:
                grammar:
                    type: 'string'
                    default: 'Ruby'
                program:
                    type: 'string'
                    default: 'ri'
                program_arguments:
                    type: 'string'
                    default: '-T --format=bs {WORD}'
        command4:
            type: 'object'
            properties:
                grammar:
                    type: 'string'
                    default: ''
                program:
                    type: 'string'
                    default: ''
                program_arguments:
                    type: 'string'
                    default: ''
        command5:
            type: 'object'
            properties:
                grammar:
                    type: 'string'
                    default: ''
                program:
                    type: 'string'
                    default: ''
                program_arguments:
                    type: 'string'
                    default: ''

    activate: (state) ->
        @textPanel = new TextPanel(state.textPanel)
        @modalPanel = atom.workspace.addBottomPanel(item: @textPanel.getElement(), visible: state.visible)
        @currentWord = null
        @content = ""
        @loadConfig()

        # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        @subscriptions = new CompositeDisposable

        # Register command that toggles this view
        @subscriptions.add atom.commands.add 'atom-workspace', 'live-doc-viewer:toggle': => @toggle()
        @subscriptions.add atom.workspace.observeTextEditors (editor) =>
            editor.onDidChangeCursorPosition((event) =>
                @cursorChanged())
            editor.onDidChangeSelectionRange((event) =>
                @cursorChanged())
        @subscriptions.add atom.config.observe("live-doc-viewer", (config) =>
                @loadConfig())

    deactivate: ->
        @modalPanel.destroy()
        @subscriptions.dispose()
        @textPanel.destroy()

    serialize: ->
        textPanel: @textPanel.serialize()
        visible: @modalPanel.isVisible()

    toggle: ->
        if @modalPanel.isVisible()
            @modalPanel.hide()
        else
            @modalPanel.show()

    loadConfig: ->
        # Workaround for atom/settings-view/issues/518
        return if @loadingConfig
        @fixCommands()

        @updateDelay = atom.config.get("live-doc-viewer.delay")
        @loadCommands()
        @textPanel.showWelcomeText(@commands)

    # Remove this when the relevant issue is fixed and published.
    fixCommands: ->
        @loadingConfig = true
        for num in [5..1]
            command = atom.config.get("live-doc-viewer.command#{num}")
            if not command.grammar
                command.grammar = ""
            if not command.program
                command.program = ""
            if not command.program_arguments
                command.program_arguments = ""
            atom.config.set("live-doc-viewer.command#{num}", command)
        @loadingConfig = false


    loadCommands: ->
        @commands = {}
        for num in [5..1]
            command = atom.config.get("live-doc-viewer.command#{num}")
            if not command.grammar or not command.program or not command.program_arguments
                continue
            @commands[command.grammar] = {
                "program": command.program
                "arguments": command.program_arguments
            }

    # FIXME: Respect quotes and escapes
    createArgs: (args, word) ->
        args = args.split(" ")
        for arg, i in args
            args[i] = arg.replace("{WORD}", word)
        return args


    cursorChanged: (event) ->
        if @modalPanel.isVisible()
            # Use a short delay before looking up documentation.
            # Prevents lag when selecting text, etc
            if @timer
                clearTimeout(@timer)
                @timer = null
            @timer = setTimeout((() =>
                @timer = null
                @updateMessage()
            ), @updateDelay)

    # Escape input for regular expressions.
    # See http://stackoverflow.com/a/6969486
    escapeRegExp: (str) ->
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

    ###
    Get command to run based on selected word and grammar.
    ###
    getCommand: ->
        editor = atom.workspace.getActiveTextEditor()
        if not editor
            return [null, null, null]
        grammar = editor.getGrammar()

        # Find the word to look up
        word = editor.getSelectedText()
        if not word
            nonWordCharacters = atom.config.get('editor.nonWordCharacters', scope: grammar.scope)
            wordOptions = {allowPrevious: false, wordRegex: new RegExp("[\\w\\.\\_]+", "g")}
            word = editor.getWordUnderCursor(wordOptions)

        # Select command from configuration
        if grammar.name of @commands
            cmd = @commands[grammar.name].program
            args = @commands[grammar.name].arguments
        else if "Any" of @commands
            cmd = @commands["Any"].program
            args = @commands["Any"].arguments
        else
            # Use default
            cmd = "man"
            args = "--pager=cat --sections=3,2,1,8 {WORD}"

        return [cmd, @createArgs(args, word), word]


    ###
    Launch program and send output to TextPanel.
    ###
    updateMessage: ->
        [cmd, args, word] = @getCommand()
        if @child or not word or word == @currentWord
            return
        @currentWord = word
        @content = ""

        # Run command and capture output
        @child = child_process.spawn(cmd, args).on('error', (error) =>
            @textPanel.setText "Failed to launch '" + cmd + "'. Make sure it is installed and in your path."
        )

        @child.stdout.on('data', (buffer) =>
            @content += buffer.toString()
        )
        @child.stderr.on('data', (buffer) =>
            @content += buffer.toString()
        )

        # Update panel text if documentation was found
        @child.on('close', (exitCode) =>
            if exitCode == 0
                @textPanel.setText @content
            @child = null
        )
