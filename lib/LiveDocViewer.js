const TextPanel = require('./TextPanel');
const {CompositeDisposable} = require('atom');
const child_process = require('child_process');

module.exports = class LiveDocViewer {
    activate(state) {
        this.textPanel = new TextPanel(state.textPanel);
        this.modalPanel = atom.workspace.addBottomPanel({
            item: this.textPanel.getElement(),
            visible: state.visible,
        });
        this.currentWord = null;
        this.content = "";
        this.loadConfig();

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
        this.loadCommands();
        this.textPanel.showWelcomeText(this.commands);
    }

    loadCommands() {
        this.commands = {};
        for (let num = 5; num > 0; num--) {
            const command = atom.config.get(`live-doc-viewer.command${num}`);
            if (!command) continue;
            if (!command.grammar) continue;
            if (!command.program) continue;
            if (!command.program_arguments) continue;

            this.commands[command.grammar] = {
                "program": command.program,
                "arguments": command.program_arguments,
            }
        }
    }

    createArgs(args, word) {
        return args
            .split(" ")
            .map(x => x.replace("{WORD}", word));
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
            () => {
                this.timer = null;
                this.updateMessage();
            },
            this.updateDelay
        );
    }

    /**
     * Get command to run based on selected word and grammar.
     */
    getCommand() {
        const editor = atom.workspace.getActiveTextEditor();
        if (!editor)
            return [null, null, null];

        const grammar = editor.getGrammar();

        // Find the word to look up
        let word = editor.getSelectedText();
        if (!word) {
            const wordOptions = {
                allowPrevious: false,
                wordRegex: /\w\._]+/g,
            };
            word = editor.getWordUnderCursor(wordOptions);
        }

        // Select command from configuration
        let cmd;
        let args;
        if (this.commands[grammar.name]) {
            cmd = this.commands[grammar.name].program;
            args = this.commands[grammar.name].arguments;
        } else if (this.commands["Any"]) {
            cmd = this.commands["Any"].program;
            args = this.commands["Any"].arguments;
        } else {
            // Use default
            cmd = "man";
            args = "--pager=cat --sections=3,2,1,8 {WORD}";
        }

        return [cmd, this.createArgs(args, word), word];
    }


    /**
     * Launch program and send output to TextPanel.
     */
    updateMessage() {
        const [cmd, args, word] = this.getCommand();
        if (this._process || !word || word === this.currentWord) {
            return;
        }

        this.currentWord = word;
        this.content = "";

        // Run command and capture output
        this._process = child_process.spawn(cmd, args).on('error', () =>
            this.textPanel.setText(`Failed to launch '${cmd}'. Make sure it is installed and in your path.`)
        );
        this._process.stdout.on('data', (buffer) =>
            this.content += buffer.toString()
        );
        this._process.stderr.on('data', (buffer) =>
            this.content += buffer.toString()
        );

        // Update panel text if documentation was found
        this._process.on('close', (exitCode) => {
            if (exitCode === 0) {
                this.textPanel.setText(this.content);
            } else {
                console.log("Process", `${cmd} ${args.join(" ")}`, "failed with exit code", exitCode);
            }

            this._process = null;
        });
    }
}
