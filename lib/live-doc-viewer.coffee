TextPanel = require './textpanel'
{CompositeDisposable} = require 'atom'
child_process = require('child_process');

module.exports = LiveDocViewer =
    textPanel: null
    modalPanel: null
    subscriptions: null

    activate: (state) ->
        @textPanel = new TextPanel(state.textPanel)
        @modalPanel = atom.workspace.addBottomPanel(item: @textPanel.getElement(), visible: state.visible)
        @currentWord = null
        @content = ""

        # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        @subscriptions = new CompositeDisposable

        # Register command that toggles this view
        @subscriptions.add atom.commands.add 'atom-workspace', 'live-doc-viewer:toggle': => @toggle()
        @subscriptions.add atom.workspace.observeTextEditors (editor) =>
            editor.onDidChangeCursorPosition((event) =>
                @cursorChanged())
            editor.onDidChangeSelectionRange((event) =>
                @cursorChanged())

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
            ), 100)

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

        if grammar.name == "Python"
            word = editor.getSelectedText()
            if not word
                nonWordCharacters = atom.config.get('editor.nonWordCharacters', scope: grammar.scope)
                wordOptions = {allowPrevious: false, wordRegex: new RegExp("[\\w\\.\\_]+", "g")}
                word = editor.getWordUnderCursor(wordOptions)
            cmd = "pydocc"
            args = [word]
        else
            wordOptions = {allowPrevious: false, includeNonWordCharacters: false}
            word = editor?.getWordUnderCursor(wordOptions)
            cmd = "man"
            args = ["--pager=cat", "--sections=3,2,1,8", word]

        return [cmd, args, word]


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
