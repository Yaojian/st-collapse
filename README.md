# Continuity Collapse

A SillyTavern extension that automatically collapses `<continuity>` tagged content in LLM responses into a foldable UI element, keeping your chat clean while preserving story context.

## How it works

When an LLM response contains `<continuity>...</continuity>`, the extension:
1. Extracts the content inside the tags
2. Removes the raw tags from the displayed message
3. Inserts a collapsible "Continuity" block after the message text

The continuity block is **collapsed by default** — click the header to expand and view the content.

## Usage

1. Enable the extension in SillyTavern's extension manager
2. Add instructions to your system prompt or character card to output continuity information inside `<continuity>` tags

**Example system prompt instruction:**
```
At the end of each response, include a <continuity> block with story state:
<continuity>
location, time, player status, key events
</continuity>
```

**LLM output example:**
```
The innkeeper nods and hands you the key to room 3.

<continuity>
Location: The Rusty Anchor Inn, Night
Player: 18/20 HP, have the quest item
Events: Learned about the cultist hideout in the sewers
</continuity>
```

This will display as:

> The innkeeper nods and hands you the key to room 3.
>
> ▼ **Continuity** *(click to expand)*

## Compatibility

- Works alongside the built-in `<think>` reasoning/collapse system — no conflicts
- Supports streaming, swipes, and editing
- Works with existing chat history (processes on load)

## Files

- `manifest.json` — extension metadata
- `index.js` — main logic (event-driven, hooks into `MESSAGE_RECEIVED`, `CHARACTER_MESSAGE_RENDERED`, etc.)
- `style.css` — styling for the collapsible continuity block
