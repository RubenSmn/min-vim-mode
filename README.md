# Vim mode for Min browser

My version of [min-vim-mode by PalmerAL](https://github.com/PalmerAL/min-vim-mode).

Adds Vim-style shortcuts to [Min](https://github.com/minbrowser/min):

- Press f to search for links (or F to open the link in a new tab)
- Press c to copy a link to the clipboard
- Press j to scroll down, supports motion: 11j
- Press k to scroll up, supports motion: 7k
- Press gg to scroll to the top
- Press G to scroll to the bottom
- Press yy to copy the current url

## Installation

- Enable userscripts in Min and create a `userscripts` folder following [these instructions](https://github.com/minbrowser/min/wiki/userscripts), and save `vim-mode.js` inside it.
- Restart Min.
