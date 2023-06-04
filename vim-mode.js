// ==UserScript==
// @name Vim Mode
// @match *
// @exclude https://www.youtube.com
// @run-at document-start
// ==/UserScript==

const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
let command = "";
let isInMotion = false;
const KEY_TIMEOUT = 1000;

const blockKeybindings = document.createElement("input");
blockKeybindings.style = "position: fixed; top: 0; left: -9999px;"; // display: none; doesn't work
document.body.appendChild(blockKeybindings);

function createLinkItem(_link, rect, key) {
  const item = document.createElement("span");
  item.setAttribute(
    "style",
    "position: absolute; padding: 1px 3px 0px 3px; background-color: yellow; color: black; z-index: 9999; font-family: Helvetica, Arial, sans-serif;font-weight: bold;font-size: 12px; background: linear-gradient(to bottom, #FFF785 0%,#FFC542 100%); border: solid 1px #C38A22; border-radius: 3px; box-shadow: 0px 3px 7px 0px rgba(0, 0, 0, 0.3);"
  );

  item.textContent = key;

  item.style.top = window.scrollY + rect.top + "px";
  item.style.left = window.scrollX + rect.left + "px";

  return item;
}

function isVisible(rect) {
  return (
    rect.top > 0 &&
    rect.top < window.innerHeight &&
    rect.left > 0 &&
    rect.left < window.innerWidth
  );
}

function getNextKeyCombination(index) {
  // use 1st half of alphabet for single letter, and 2nd half for double letter, so that no collisions can occur
  let halfIndex = Math.floor(alphabet.length / 2);
  if (index < halfIndex) {
    return alphabet[index];
  } else {
    // Subtract half-index from index such that lettering starts at first index for second letter, e.g.
    // na nb nc nd ...
    index -= halfIndex;
    // two-letter combination
    return (
      alphabet[Math.floor(index / alphabet.length) + halfIndex] +
      alphabet[index % alphabet.length]
    );
  }
}

let allLinksOnPage = null;
let currentLinkItems = [];
let isLinkKeyMode = false;
let linkAction = null;
let typedText = "";

// This ensures blockKeybindings doesn't get blurred because of
// unintentional clicks of the user
document.body.addEventListener("click", () => {
  if (isLinkKeyMode) {
    blockKeybindings.select();
  }
});

function showLinkKeys() {
  isLinkKeyMode = true;
  typedText = "";

  const links = [];
  const linkRects = [];

  if (allLinksOnPage === null) {
    allLinksOnPage = document.querySelectorAll(
      "a, button, input, textarea, select"
    );
  }

  allLinksOnPage.forEach((link) => {
    const rect = link.getBoundingClientRect();
    if (isVisible(rect)) {
      links.push(link);
      linkRects.push(rect);
    }
  });

  links.forEach((link, i) => {
    const key = getNextKeyCombination(currentLinkItems.length);
    const item = createLinkItem(link, linkRects[i], key);
    currentLinkItems.push({
      link: link,
      element: item,
      key: key,
    });
    document.body.appendChild(item);
  });
}

function hideLinkKeys() {
  isLinkKeyMode = false;

  currentLinkItems.forEach((i) => i.element.remove());
  currentLinkItems = [];
}

function onTextTyped(key) {
  typedText += key;

  let viableElementRemaining = false;
  currentLinkItems.forEach((link) => {
    if (link.key === typedText) {
      viableElementRemaining = true;
      if (link.link.tagName === "A") {
        if (linkAction === "copyToClipboard") {
          copyToClipboard(link.link.href);
        } else if (linkAction === "openInNewTab") {
          window.open(link.link.href);
        } else {
          window.open(link.link.href, "_top");
        }
      } else if (link.link.tagName === "BUTTON") {
        link.link.click();
        link.link.focus();
      } else if (isFocusable(link.link)) {
        link.link.focus();
        if (
          ["checkbox", "radio"].indexOf(
            link.link.getAttribute("type").toLowerCase()
          ) >= 0
        ) {
          link.link.click();
          document.activeElement.blur();
        } else if (link.link.tagName === "SELECT") {
          link.link.click();
        }
      }
      hideLinkKeys();
      // It is critical that we do NOT blur blockKeybindings here
      // else the keypress is passed on to the window
      // This is actually only a problem with opening in a new tab
      // but we can manage it through visibilitychange below
    } else if (!link.key.startsWith(typedText)) {
      link.element.hidden = true;
    } else {
      viableElementRemaining = true;
    }
  });

  // This is meant to run if the user types a non-valid combination
  if (!viableElementRemaining) {
    hideLinkKeys(); // we call this to remove all links, also sets linkKeyMode to false
    blockKeybindings.blur();
  }
}

document.addEventListener(
  "visibilitychange",
  () => {
    if (document.visibilityState !== "hidden" && isLinkKeyMode) {
      blockKeybindings.select();
    } else if (document.visibilityState !== "hidden" && !isLinkKeyMode) {
      // This is important after a linkKeyMode with opening in new tab
      // We need to blur it here after returning to this original tab
      // so that normal keybindings work again
      blockKeybindings.blur();
    }
  },
  false
);

function isCurrentlyInInput() {
  return (
    document.activeElement.tagName === "INPUT" ||
    document.activeElement.tagName === "TEXTAREA" ||
    document.activeElement.isContentEditable
  );
}

function isFocusable(element) {
  return (
    ["INPUT", "TEXTAREA", "SELECT"].indexOf(element.tagName) >= 0 ||
    element.isContentEditable
  );
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}
// (maybe) Future TODO:
// We should provide means to disable the keybings for a blacklist of websites
// github.com for example has a lot of vim-like bindings of its own.

// We put scrolling here in keydown, so that we can continously press it.
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "j" || e.key === "k") &&
    !isLinkKeyMode &&
    !isCurrentlyInInput() &&
    !isInMotion &&
    !e.altKey
  ) {
    if (e.key === "j") {
      window.scrollBy(0, 60);
    } else if (e.key === "k") {
      window.scrollBy(0, -60);
    }
  }
});

const commandChars = new Set(["f", "F", "j", "k", "y", "g", "G", "c"]);
const linkChars = new Set(alphabet);
document.addEventListener("keyup", (e) => {
  const isNumber = Number.isInteger(parseInt(e.key));
  if (isNumber) isInMotion = true;

  if (e.key === "Escape" && isLinkKeyMode) {
    hideLinkKeys();
    blockKeybindings.blur();
  } else if (e.key === "Escape" && isCurrentlyInInput()) {
    e.target.blur();
  } else if (
    !isCurrentlyInInput() &&
    !isLinkKeyMode &&
    (commandChars.has(e.key) || isNumber) &&
    (!e.ctrlKey || !e.altKey) &&
    !e.metaKey
  ) {
    command += e.key;
    let match = true;
    switch (command) {
      case "f":
        showLinkKeys();
        blockKeybindings.select();
        linkAction = "open";
        break;
      case "F":
        showLinkKeys();
        blockKeybindings.select();
        linkAction = "openInNewTab";
        break;
      // use c to copy a link to the clipboard
      case "c":
        showLinkKeys();
        blockKeybindings.select();
        linkAction = "copyToClipboard";
        break;
      case /\d+j/.test(command) && command:
        window.scrollBy(0, parseInt(command) * 60);
        isInMotion = false;
        break;
      case /\d+k/.test(command) && command:
        window.scrollBy(0, parseInt(command) * -60);
        isInMotion = false;
        break;
      case "yy":
        copyToClipboard(window.location.href);
        break;
      case "gg":
        window.scrollTo(0, 0);
        break;
      case "G":
        window.scrollTo(0, document.body.scrollHeight);
        break;
      default:
        match = false;
        break;
    }
    if (!match && command.length === 1) {
      // TODO: Check if timeout has been set
      // Reset typed command after KEY_TIMEOUT milliseconds
      // This is the time the user has to type the full command
      setTimeout(() => {
        command = "";
      }, KEY_TIMEOUT);
    } else if (match || !isInMotion) {
      command = "";
      // We could also add it to a buffer here for repeating the action via '.' as in Vim
    }
    e.preventDefault();
  } else if (isLinkKeyMode && linkChars.has(e.key)) {
    onTextTyped(e.key);
  }
});
