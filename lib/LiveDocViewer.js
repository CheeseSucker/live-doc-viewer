const TextPanel = require('./TextPanel');
const Command = require('./Command');
const Process = require('./Process');
const ProcessError = require('./ProcessError');
const {CompositeDisposable} = require('atom');

module.exports = class LiveDocViewer {
    activate(state) {
        this.textPanel = new TextPanel(state.textPanel);
        this.modalPanel = atom.workspace.addBottomPanel({
            item: this.textPanel.getElement(),
            visible: state.visible,
        });
        this.currentWord = null;
        this.loadConfig();
        this.showWelcomeText(this.commands);

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', 'live-doc-viewer:toggle', () => this.toggle()));
        this.subscriptions.add(atom.workspace.observeTextEditors(
            (editor) => {
                editor.onDidChangeCursorPosition(() => this.cursorChanged());
                editor.onDidChangeSelectionRange(() => this.cursorChanged());
            }
        ));
        this.subscriptions.add(
            atom.config.observe("live-doc-viewer", () => this.loadConfig())
        );
    }

    deactivate() {
        if (this._process) this._process.kill();
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        this.textPanel.destroy();
    }

    serialize() {
        return {
            textPanel: this.textPanel.serialize(),
            visible: this.modalPanel.isVisible(),
        };
    }

    toggle() {
        if (this.modalPanel.isVisible()) {
            this.modalPanel.hide();
        } else {
            this.modalPanel.show();
        }
    }

    loadConfig() {
        this.updateDelay = atom.config.get("live-doc-viewer.delay");
        this.commands = Command.loadCommandsFromConfig();
    }


    cursorChanged() {
        if (!this.modalPanel.isVisible()) return;

        // Use a short delay before looking up documentation.
        // Prevents lag when selecting text, etc
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.timer = setTimeout(
            async () => {
                this.timer = null;
                await this.lookupSelectedWord();
            },
            this.updateDelay
        );
    }

    /**
     * @returns {string | null}
     */
    getSelectedWord(editor) {
        // Find the word to look up
        let word = editor.getSelectedText();
        if (word) return word;

        const wordOptions = {
            allowPrevious: false,
            wordRegex: /\w\._]+/g,
        };
        return editor.getWordUnderCursor(wordOptions);
    }


    /**
     * @param {Array<Command>} commands
     */
    showWelcomeText(commands) {
        let message = "live-doc-viewer\n\n";
        message += "Type or select a word to lookup documentation.\n\n";
        message += "Configured programs:\n";
        for (let command of commands) {
            message += `  - ${command.toString()}\n`;
        }
        message += "\nAdditional programs can be configured in the settings panel.";
        this.textPanel.setText(message);
    }

    /**
     * Launch program and send output to TextPanel.
     */
    async lookupSelectedWord() {
        if (this._process) {
            // A process is already running
            return;
        }

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        const word = this.getSelectedWord(editor);
        if (!word || word === this.currentWord) {
            // Nothing to look up
            return;
        }

        this.currentWord = word;

        // Run command and capture output
        const command = Command.getCommandForGrammar(editor.getGrammar().name, this.commands);
        try {
            this._process = new Process(command, word);
            this.textPanel.setText(await this._process.run());
        } catch (e) {
            if (e instanceof ProcessError) {
                console.debug(e.message);
                if (e.errorCode === ProcessError.errorTypes.spawnProcessFailed) {
                    this.textPanel.setText(e.message);
                }
            } else {
                throw e;
            }
        } finally {
            this._process = undefined;
        }
    }
};
