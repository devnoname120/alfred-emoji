'use strict'

const emojilib = require('emojilib')
const emojiNames = emojilib.ordered
const modifiers = emojilib.fitzpatrick_scale_modifiers

let skinTone
let modifier

const setSkinToneModifier = (tone) => {
  skinTone = tone
  modifier = skinTone ? modifiers[skinTone] : null
}

const addModifier = (emoji, modifier) => {
  if (!modifier || !emoji.fitzpatrick_scale) return emoji.char

  /*
  * There are some emojis categorized as a sequence of emojis
  * Emoji ZWJ Sequence is a combination of multiple emojis which display as a single emoji
  * on supported platforms. These sequences are joined with a Zero Width Joiner character.
  *
  * https://emojipedia.org/emoji-zwj-sequence/
  */

  const zwj = new RegExp('‍', 'g')
  return emoji.char.match(zwj) ? emoji.char.replace(zwj, modifier + '‍') : emoji.char + modifier
}

const getIconName = (emoji, name) => {
  if (emoji.fitzpatrick_scale && skinTone && skinTone >= 0 && skinTone < 5) {
    return `${name}_${skinTone}`
  }
  return name
}

  const getSubtitleStrings = (operationType) => {
    switch (operationType) {
      case 'snippet':
        return {verb: 'Paste', preposition: 'as snippet'}
      case 'autopaste':
        return {verb: 'Paste', preposition: 'into frontmost application'}
      case 'clipboard':
      default:
        return {verb: 'Copy', preposition: 'to clipboard'}
    }
  }
  
  const alfredItem = (emoji, name, operationType = 'clipboard') => {
  const modifiedEmoji = addModifier(emoji, modifier)
  const icon = getIconName(emoji, name)

  const {verb, preposition} = getSubtitleStrings(operationType)

  // No `uid` property otherwise Alfred ignores the ordering of the list and uses its own
  return {
    title: name,
    subtitle: `${verb} "${modifiedEmoji}" (${name}) ${preposition}`,
    arg: modifiedEmoji,
    autocomplete: name,
    icon: { path: `./icons/${icon}.png` },
    mods: {
      alt: {
        subtitle: `${verb} ":${name}:" (${emoji.char}) ${preposition}`,
        arg: `:${name}:`,
        icon: { path: `./icons/${name}.png` }
      },
      shift: {
        subtitle: `${verb} "${emoji.char}" (${name}) ${preposition}`,
        arg: emoji.char,
        icon: { path: `./icons/${name}.png` }
      }
    }
  }
}

const alfredItems = (names, operationType = 'clipboard') => {
  const items = []
  names.forEach((name) => {
    const emoji = emojilib.lib[name]
    if (!emoji) return
    items.push(alfredItem(emoji, name, operationType))
  })
  return { items }
}

const all = (operationType = 'clipboard') => alfredItems(emojiNames, operationType)

const libHasEmoji = (name, term) => {
  return emojilib.lib[name] &&
    emojilib.lib[name].keywords.some((keyword) => keyword.includes(term))
}
const matches = (terms) => {
  const emojiNameResults = [];
  const emojiKeywordResults = [];

  for (const emojiName of emojiNames) {
    let hasNameMatch = false;
    let hasMatch = true;

    for (const term of terms) {
      if (emojiName.includes(term)) {
        hasNameMatch = true;
        continue;
      } else if (!libHasEmoji(emojiName, term)) {
        hasMatch = false;
        break;
      }
    }

    if (!hasMatch) {
      continue;
    }

    if (hasNameMatch) {
      emojiNameResults.push(emojiName);
    } else {
      emojiKeywordResults.push(emojiName);
    }
  }

  // Prioritize emojis that were matched on the name rather than on keywords
  return [...emojiNameResults, ...emojiKeywordResults]
}

// :thumbs up: => ['thumbs', 'up']
const parse = query => query.replace(/[:]/g, '').split(/\s+/)

module.exports = function search (query, skinTone, operationType = 'clipboard') {
  setSkinToneModifier(skinTone)

  if (!query) return all(operationType)

  const terms = parse(query)

  return alfredItems(matches(terms), operationType)
}
