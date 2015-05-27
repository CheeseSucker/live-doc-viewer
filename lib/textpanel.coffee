$ = require 'jquery'

module.exports =
class TextPanel
    constructor: (serializedState) ->
        # Create root element
        @element = document.createElement('div')
        @element.classList.add('live-doc-viewer')

        # Allow panel resizing
        @resizeHandle = document.createElement('div')
        @resizeHandle.classList.add('doc-view-resize-handle')
        @element.appendChild(@resizeHandle)
        $(@resizeHandle).on 'mousedown', (e) => @resizeStarted(e)

        # Create text container
        @text = document.createElement('pre')
        @text.classList.add('text-container')
        @element.appendChild(@text)

        height = serializedState?.height
        $(@element).height(height) if height?


    getElement: ->
        return @element

    # Returns an object that can be retrieved when package is activated
    serialize: ->
        height: $(@element).height()

    # Tear down any state and detach
    destroy: ->
        @element.remove()

    setText: (text) ->
        @text.innerHTML = text;

    showWelcomeText: (commands) ->
        message = "Type or select a word to lookup documentation.\n\n"
        message += "Configured programs:\n"
        for grammar, cmd of commands
            message += "  - #{grammar}: \"#{cmd.program}\" #{cmd.arguments}\n"
        message += "\nAdditional programs can be configured in the settings panel."
        @setText message

    # Resize code shamelessly stolen from atom-tree-view
    resizeStarted: =>
        $(document).on('mousemove', @resizeTreeView)
        $(document).on('mouseup', @resizeStopped)

    resizeStopped: =>
        $(document).off('mousemove', @resizeTreeView)
        $(document).off('mouseup', @resizeStopped)

    resizeTreeView: ({pageY, which}) =>
        return @resizeStopped() unless which is 1
        elem = $(@element)
        difference = pageY - elem.offset().top
        elem.height(elem.height() - difference)

