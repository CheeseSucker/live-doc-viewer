## 1.1.0
 - Command arguments are now properly tokenized (using string-argv module).
   This means that it is now possible to use commands such as `man --pager=cat "this argument has spaces: {WORD}"`
 - Status messages are shown in the panel, including progress, errors and other results.
 - Text in panel can now be selected and copied using Ctrl+C.
 - Rewritten in modern JavaScript
 - Removed dependency on jQuery

## 1.0.7
 - Fixed issue where text was displayed as HTML (PR #2, thanks to @Cyxo)
 - Removed buggy resize handle in bottom right of panel
 - Updated jQuery to 3.4.1

## 1.0.6
 - Removed a call to console.log

## 1.0.5
 - Fixed config type definition for 'delay'
 - Fixed cursor on windows

## 1.0.4
 - Show a better welcome message in the text panel
 - Added a workaround for https://github.com/atom/settings-view/issues/518

## 0.1.3
 - Added ruby (albeit without parsing the ouput correctly)

## 0.1.2
 - Programs can now be configured from atom's settings panel

## 0.1.1 - Published to atom.io

## 0.1.0 - First Release
 - Support for man pages and pydoc
