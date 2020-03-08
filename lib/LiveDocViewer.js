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
        this.textPanel.setStatusText("");
        clearTimeout(this.timer);
        this.timer = setTimeout(
            () => {
                this.timer = null;
                this.lookupSelectedWord().catch(e => {
                    atom.notifications.addError(e.message, { stack: e.stack });
                });
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
            includeNonWordCharacters: false
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

        if (word.includes("\n") || word.length > 50) {
            // Too long selections are unlikely to yield any useful results,
            // and they also cause the status text to cover the entire screen!
            this.textPanel.setStatusText("Selection is too long");
            return;
        }

        this.currentWord = word;

        // Run command and capture output
        this.textPanel.setStatusText("Looking up: " + word);
        const command = Command.getCommandForGrammar(editor.getGrammar().name, this.commands);
        try {
            this._process = new Process(command, word);
            this.textPanel.setText(await this._process.run());
            this.textPanel.setStatusText("");
        } catch (e) {
            if (e instanceof ProcessError) {
                if (e.errorCode === ProcessError.errorTypes.spawnProcessFailed) {
                    this.textPanel.setText(e.message);
                } else {
                    this.textPanel.setStatusText(`No result for '${word}' using '${command.getProgram()}'`);
                }
            } else {
                throw e;
            }
        } finally {
            this._process = undefined;
        }
    }
};
