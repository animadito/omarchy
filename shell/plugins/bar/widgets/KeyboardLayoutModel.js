// Label math for the keyboard layout widget, kept Qt-free so it can be unit
// tested under node (test/shell.d/keyboard-layout-test.sh).

// xkbcli list prints YAML, and every layout and variant block pairs a brief with
// the description hyprctl reports as the active keymap:
//
//   - layout: 'us'
//     variant: ''
//     brief: 'en'
//     description: English (US)
//
// The models and option groups it also prints carry no brief of their own, and
// a brief never carries past the block it was printed in, so neither reaches
// the table.
//
// The table is read once into both directions: the description hyprctl reports
// as the active keymap, and the layout and variant a position in the layout
// list carries. The second is what tells two positions holding the same
// layout apart.
function layoutBriefsWithTable(text) {
  var briefs = {}
  var layoutToBrief = {}
  var brief = ""
  var layout = ""
  var variant = ""

  String(text || "").split("\n").forEach(function (line) {
    if (/^\s*- /.test(line)) {
      brief = ""
      layout = ""
      variant = ""
    }

    // The layout names its own item, so it carries the dash, while the
    // variant, the brief and the description are indented under it.
    var named = line.match(/^(?:- |  )layout: (.*)$/)
    if (named) {
      layout = named[1].replace(/^'|'$/g, "")
      return
    }

    var field = line.match(/^  (variant|brief|description): (.*)$/)
    if (!field) return

    if (field[1] === "variant") {
      variant = field[2].replace(/^'|'$/g, "")
    } else if (field[1] === "brief") {
      brief = field[2].replace(/^'|'$/g, "")
    } else if (brief) {
      briefs[field[2]] = brief
      // The layout and variant of the block make the key a position in the
      // layout list carries: "us" reads "us," and "us,intl" reads "us,intl".
      layoutToBrief[layout + "," + variant] = brief
      brief = ""
    }
  })

  return { briefs: briefs, layoutToBrief: layoutToBrief }
}

function layoutBriefs(text) {
  return layoutBriefsWithTable(text).briefs
}

// The brief is a short language code rather than a country one, which keeps the
// label sensible for the layouts named after a language: Esperanto reads EO and
// Arabic reads AR. It is the same code GNOME shows in its own indicator.
//
// Layouts missing from the table fall back to the first word of the description,
// which reads as ENG/POR but at least says something.
//
// Nearly every brief is a bare two-letter code, but a few tack a script onto it
// (Burmese (Zawgyi) is my-zwg) and the custom layout's is a word, so drop the
// script and cap the result at the same three characters the fallback gets.
// The widget sits between fixed neighbours on the bar and has no room to grow.
function shortLabel(description, briefs) {
  if (!description) return ""

  // A description like "constructor" reaches an inherited member rather than a
  // brief, so take the lookup only when it hands back the string it promises.
  var brief = (briefs || {})[description]
  var label = typeof brief === "string" && brief ? brief.split("-")[0] : description.split(/\s+/)[0]
  return label.substring(0, 3).toUpperCase()
}

// Hyprland's activelayout event pairs the keyboard that switched with the layout
// it moved to. Quickshell cuts the event into that many fields, so a description
// carrying a comma of its own stays in one piece; a binding old enough to hand
// back only the raw string gets split by hand. The virtual keyboard fcitx5 binds
// to inject announces switches too, and names a keyboard nobody types on.
function eventKeyboardName(event) {
  var parts

  try {
    if (event && event.parse) parts = event.parse(2)
  } catch (error) {
  }

  if (!parts) parts = String(event && event.data ? event.data : "").split(",")

  var name = String(parts[0] || "")
  return isTypedKeyboard(name) ? name : ""
}

// Hyprland reports more than keyboards as keyboards. fcitx5 binds a virtual one
// to inject through, which keeps the us layout the input method gave it, and the
// ACPI power button, lid switch and sleep key each arrive carrying the seat's
// layout list without anyone ever typing on them. Both answer to switchxkblayout
// and both can hold the main flag, so a widget that reads or switches whatever
// the seat hands it ends up describing a button. Leave them out and what remains
// is keyboards, which is what the rest of this file can then assume.
//
// Missing a name here costs the accuracy the seat had before, never a keyboard:
// anything unrecognised stays in the list.
var UNTYPED_KEYBOARDS = /^(hl-virtual-keyboard|power-button|sleep-button|lid-switch|video-bus)|(-wmi-hotkeys|-wireless-radio-control)(-\d+)?$/

function isTypedKeyboard(name) {
  return !UNTYPED_KEYBOARDS.test(String(name || ""))
}

// Every keyboard on the seat carries the same layout list unless one was given
// its own, but only the one being typed on advances through it. So the
// furthest-advanced is the one worth reading, and a switch names the keyboard it
// moved, which settles a seat holding two real keyboards outright.
//
// The name is taken whenever a keyboard still answers to it, wherever that
// keyboard sits in the list. Comparing positions instead would read the wrong
// keyboard the moment one wrapped from the last layout back to the first, which
// is the ordinary way round a pair of them. Applying a layout to the whole seat
// names a keyboard too, but leaves every one of them on the same layout, so the
// label reads the same whichever of them the name settles on.
function selectKeyboard(typed, namedByEvent) {
  var keyboards = typed || []

  return keyboards.find(function (keyboard) {
    return keyboard.name === namedByEvent
  }) || keyboards.reduce(function (furthest, keyboard) {
    return layoutIndex(keyboard) > layoutIndex(furthest) ? keyboard : furthest
  }, keyboards[0])
}

function inputLabel(state, fallback) {
  if (!state || !state.current || state.current.indexOf("keyboard-") === 0) return fallback
  if (state.label) return String(state.label).substring(0, 3)
  var labels = { mozc: "あ", hangul: "한", pinyin: "拼", chewing: "注", cangjie5: "倉" }
  return labels[state.current] || shortLabel(state.language || state.name, {})
}

function inputTooltip(state, layout, multipleLayouts) {
  if (!state || !state.methods || state.methods.length < 2)
    return layout + (multipleLayouts ? " · Super + I" : "")
  var name = state.current && state.current.indexOf("keyboard-") === 0 ? layout : (state.name || layout)
  return name.replace(/^Keyboard - /, "") + " · Super + I"
}

function showIndicator(layoutLabel, multipleLayouts, multipleInputs) {
  return multipleInputs || (layoutLabel !== "" && multipleLayouts)
}

function layoutIndex(keyboard) {
  return (keyboard && keyboard.active_layout_index) || 0
}

// Given a layout string like "us,us" and variant ",intl" (same length, comma
// separated to match), return an array of labels like ["EN", "EN2"].
// When two layouts produce the same label, the second gets a digit suffix.
function labelsForLayouts(layoutStr, variantStr, layoutToBrief) {
  var layouts = String(layoutStr || "").split(",")
  var variants = variantStr ? String(variantStr).split(",") : []
  var rawLabels = []

  for (var i = 0; i < layouts.length; i++) {
    // Trim: hyprctl pads the variant with a leading space (" ,intl") while
    // xkbcli returns it without ("us,intl"), so normalise before the lookup.
    var lv = (layouts[i] || "").trim() + "," + ((variants[i] || "").trim())
    var brief = (layoutToBrief || {})[lv]
    // The brief reads like every other label: the language code, without the
    // script a few carry on top of it, uppercase and no longer than three
    // characters. A layout the table does not know falls back to its own name.
    rawLabels.push(brief
      ? brief.split("-")[0].substring(0, 3).toUpperCase()
      : (layouts[i] || "").substring(0, 3).toUpperCase())
  }

  // Count occurrences to find collisions
  var counts = {}
  for (var j = 0; j < rawLabels.length; j++) {
    var l = rawLabels[j]
    counts[l] = (counts[l] || 0) + 1
  }

  // Add digit suffixes for collisions: first gets plain, subsequent get 2, 3...
  var seen = {}
  var adjusted = []
  for (var k = 0; k < rawLabels.length; k++) {
    var label = rawLabels[k]
    if (counts[label] > 1) {
      seen[label] = (seen[label] || 0) + 1
      adjusted.push(seen[label] > 1 ? label + seen[label] : label)
    } else {
      adjusted.push(label)
    }
  }

  return adjusted
}

if (typeof module !== "undefined") {
  module.exports = {
    eventKeyboardName: eventKeyboardName,
    isTypedKeyboard: isTypedKeyboard,
    labelsForLayouts: labelsForLayouts,
    layoutBriefs: layoutBriefs,
    layoutBriefsWithTable: layoutBriefsWithTable,
    layoutIndex: layoutIndex,
    selectKeyboard: selectKeyboard,
    shortLabel: shortLabel,
    inputLabel: inputLabel,
    inputTooltip: inputTooltip,
    showIndicator: showIndicator
  }
}
