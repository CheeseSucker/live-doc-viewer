module.exports = class TextPanel {
    constructor(serializedState) {
        // Bind event handlers
        this.resizeStarted = this.resizeStarted.bind(this);
        this.resizeStopped = this.resizeStopped.bind(this);
        this.resizePanel = this.resizePanel.bind(this);

        // Create root element
        this.element = document.createElement('div');
        this.element.classList.add('live-doc-viewer');

        // Allow panel resizing
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.classList.add('doc-view-resize-handle');
        this.element.appendChild(this.resizeHandle);
        this.resizeHandle.addEventListener('mousedown', this.resizeStarted);

        // Create text container
        this.text = document.createElement('pre');
        this.text.classList.add('text-container');
        this.element.appendChild(this.text);

        const height = (serializedState || {}).height;
        if (height > 0) {
            this.setHeight(height);
        }
    }

    /**
     * @public
     * @returns {HTMLDivElement}
     */
    getElement() {
        return this.element;
    }

    /**
     * @private
     * @returns {number}
     */
    getHeight() {
        return parseFloat(getComputedStyle(this.getElement(), null).height.replace("px", ""))
    }

    /**
     * @private
     *
     * @param {number} height
     */
    setHeight(height) {
        this.element.style.height = height + "px";
    }

    /**
     * Serialize state
     *
     * @returns {{height: number}}
     */
    serialize() {
        return {
            height: this.getHeight()
        };
    }

    // Tear down any state and detach
    destroy() {
        this.element.remove();
    }

    setText(text) {
        this.text.innerText = text;
    }

    //--- Resize code shamelessly stolen from atom-tree-view
    /**
     * @private
     */
    resizeStarted() {
        document.addEventListener('mousemove', this.resizePanel);
        document.addEventListener('mouseup', this.resizeStopped);
    };

    /**
     * @private
     */
    resizeStopped() {
        document.removeEventListener('mousemove', this.resizePanel);
        document.removeEventListener('mouseup', this.resizeStopped);
    };

    /**
     * @private
     */
    resizePanel({pageY, which}) {
        if (which !== 1) {
            return this.resizeStopped();
        }

        const rect = this.getElement().getBoundingClientRect();
        const difference = pageY - rect.top - document.body.scrollTop;
        return this.setHeight(this.getHeight() - difference);
    };
};
