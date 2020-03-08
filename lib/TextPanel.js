const $ = require('jquery');

module.exports = class TextPanel {
    constructor(serializedState) {
        // Bind event handlers
        this.resizeStarted = this.resizeStarted.bind(this);
        this.resizeStopped = this.resizeStopped.bind(this);
        this.resizeTreeView = this.resizeTreeView.bind(this);

        // Create root element
        this.element = document.createElement('div');
        this.element.classList.add('live-doc-viewer');

        // Allow panel resizing
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.classList.add('doc-view-resize-handle');
        this.element.appendChild(this.resizeHandle);
        $(this.resizeHandle).on('mousedown', this.resizeStarted);

        // Create text container
        this.text = document.createElement('pre');
        this.text.classList.add('text-container');
        this.element.appendChild(this.text);

        const height = (serializedState || {}).height;
        if (height > 0) {
            $(this.element).height(height)
        }
    }

    getElement() {
        return this.element;
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {
        return {
            height: $(this.element).height()
        };
    }

    // Tear down any state and detach
    destroy() {
        this.element.remove();
    }

    setText(text) {
        this.text.innerText = text;
    }

    /**
     * @param {Record<string, Object>} commands
     */
    showWelcomeText(commands) {
        let message = "live-doc-viewer\n\n";
        message += "Type or select a word to lookup documentation.\n\n";
        message += "Configured programs:\n";
        for (let [grammar, cmd] of Object.entries(commands)) {
            message += `  - ${grammar}: \"${cmd.program}\" ${cmd.arguments}\n`;
        }
        message += "\nAdditional programs can be configured in the settings panel.";
        this.setText(message);
    }

    // Resize code shamelessly stolen from atom-tree-view
    resizeStarted() {
        $(document).on('mousemove', this.resizeTreeView);
        $(document).on('mouseup', this.resizeStopped);
    };

    resizeStopped() {
        $(document).off('mousemove', this.resizeTreeView);
        $(document).off('mouseup', this.resizeStopped);
    };

    resizeTreeView({pageY, which}) {
        if (which !== 1) {
            return this.resizeStopped();
        }

        const elem = $(this.element);
        const difference = pageY - elem.offset().top;
        return elem.height(elem.height() - difference);
    };
}
