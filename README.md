# まよなか屋 Midnight Restaurant

A cozy two-player ramen stall on a rainy night. Complete beginners learn a little Japanese by running it together: one of you cooks, one of you runs the counter, and every order is a Japanese word you say to each other.

**Play:** https://lachende.github.io/midnight-restaurant/ (landscape phone or tablet; mouse works too).
It is also the second game in 夜ふかし Up All Night (https://lachende.github.io/midnight-rail-crew/), where one room code covers three co-op games.

## The two roles

| Cook (kitchen view) | Counter (counter view) |
|---|---|
| Drag noodles into the basket, the basket into the boiling pot. | Drag a guest in from the rain to a free seat (you decide when). |
| Watch the dial (a wide green window) and lift the basket onto a bowl. | Tap them when they raise a hand: they say their order once (picture, kana, romaji, meaning), then the card fades. **もう一度** brings it back, but the guest loses a little patience. |
| Hold the ladle over the bowl to pour the broth. | Say the order to the cook. Online there is no Send button: the cook can't see it any other way. |
| Drag on the toppings your partner names; drag a wrong one off to the plate. | Hold the teapot over their cup while they wait (a small, capped patience boost). |
| Slide the bowl to the pass. A bowl that comes back can be fixed and sent again. | Drag the bowl from the pass to the guest. A wrong bowl is refused: drag it back to the kitchen. Then tap the coins, clear the bowl into the dishes, and rub the counter clean. |

**伝言ラーメン (Telephone Ramen):** the cook's tickets stay blank ("?") all night, so every order has to be said out loud, and the end of the night shows what each guest asked for next to the wrong bowls that reached them. From Night 2, guests also ask for it a certain way, as real ramen shops do: **かため** (firm noodles: lift them early), **やわらかめ** (soft: leave them in until the orange), **スープおおめ** (extra broth: pour until it drips). The dial marks the かため and やわらかめ parts on nights that use them. Add `?easy=1` to the address to show the orders on the cook's tickets again (for anyone who can't talk while playing).

## The nights

1. **First night** (3 guests, gentle: nobody runs out of patience).
   - **Guest 1, learn together:** たまご (egg), and every step is shown with a mint arrow and a hand.
   - **Guest 2:** the same bowl, with hints only if you stop for a few seconds.
   - **Guest 3:** one new word, ねぎ (spring onion).
   - **Closing:** a summary of bowls served and the words you used, then play again, swap roles, or go on to the next night.
2. **A busier night** (6 guests, 2 seats).
   - Two-topping orders, and なると (fish-cake swirl) arrives.
   - Guests have patience now. Tea helps, and the counter still controls how many guests come in.

3. **At the door · 接客** (gentle): groups arrive, and the counter greets them, asks how many, and shows them in.
4. **Rush hour** (3 seats, 18 guests), Plants-vs-Zombies style: よーい… いらっしゃいませ！, then guests trickle in and come in **big waves**. Each wave is announced first (**お客さんの大群が来る！**), and a progress bar with lantern flags shows when. The stars are yen, and the best score is kept.
5. **The last train · 終電** (3 seats, 27 guests): shorter patience, three-topping orders, two big waves, and a final wave where everyone is in a hurry.

Night 2 ends with two かため orders; Night 4 adds スープおおめ (a quarter of orders ask for something); Night 5 adds やわらかめ (about a third).

**On every night with patience (2, 4, 5):**
- **Combo:** right bowls in a row raise the bonus multiplier, ×2 from 3 in a row and ×3 from 6 (いいね！ → すごい！ → さいこう！ on both phones). A guest who leaves angry or a refused bowl breaks it (あ〜…).
- **Speed:** the faster the bowl, the bigger the bonus. **いそぎ guests** (rush nights) wait half as long and pay a double bonus.
- **The cook feels it too:** tickets turn orange, then red, as their guest loses patience, and come down crossed out if the guest gives up.

**For the cook, every night:** the noodle dial has a gold **カンペキ** zone in the middle of "ready"; noodles lifted there are perfect (a callout and a better bowl).

**A window into your partner's station, every night:** the cook watches the counter (guests, their patience, bowls landing, coins); the counter watches the kitchen through the hatch (noodles in the pot, bowls filling up). Your partner's finger shows as a hand. The order words are not in it, so you still have to talk. Online, each phone sends its station a few times a second; in practice, しばBot's work and hand play in it.

Romaji and meanings step back once you've served a word three times (tap **?** to see them again). Earnings add up to the stall's savings and unlock small decorations: lanterns, a lucky cat, hydrangeas.

## Modes

- **Online co-op (two devices, anywhere):** **Play together** opens a room; send the invite link (or the 4-letter code) to your partner.
  - **Connection:** two-way over WebRTC through [PeerJS](https://peerjs.com). Orders, tickets, bowls on the shared pass, serving results, sent-back bowls and the shift's progress all travel as numbered messages that are resent after a dropped connection.
  - **Drops:** the game pauses while the link is down and counts back in when it returns.
  - **Reloads:** a reloaded page rejoins the room by itself (for 10 minutes).
- **Inside 夜ふかし:** the hub page holds the connection and the roles; this page runs in a frame and talks to it through `window.HUBAPI`.
- **Solo practice:** you take one role and しばBot takes the other. As the counter, tap **Send ▶** so the bot knows the order, because it can't hear you. As the cook, しばBot says each order out loud in Japanese (the phone's own speech voice, with the words shown for a few seconds); tap 🔊 on a ticket to hear it again, at a little of the guest's patience.
- There is no shared-device (one screen) mode.

## Running it

A TypeScript project built with [Vite](https://vitejs.dev):

```bash
npm install          # once
npm run dev          # play at http://localhost:5173, reloads as you edit
npm run build        # type-check, then build the game into dist/
```

Every push to `main` builds the game and publishes it to GitHub Pages (`.github/workflows/deploy.yml`).

**How the code is organised (`src/`):**

| Folder | What lives there |
|---|---|
| `core/` | helpers, the hub connection, storage, language (`T(en, zh)`) |
| `data/` | the words, guests, nights and the counter's 接客 lines; the stage layout |
| `game/` | the rules: kitchen, counter, the door, しばBot, teaching hints, the night's start and close; `G.ts` holds the shared state |
| `render/` | the stage, drawing, scenery, particles, the two views; `dims.ts` is the stage size |
| `ui/` | menus, buttons, the cards and tickets over the canvas |
| `input/` | drags, holds, pours, rubs and taps |
| `net/` | the online link (PeerJS) and the messages between the two phones |
| `audio/` | the synthesized sound |

The art is in `public/art/` and is copied into the build as it is.

**Hosting requirements:**
- Any static host works, served over HTTPS (or localhost), which WebRTC needs. GitHub Pages is free.
- Online play uses the free public PeerJS signalling server (`0.peerjs.com`) and its free TURN relays (`turn.peerjs.com`). Both come from the `peerjs` package (MIT).
- Some chat apps' built-in browsers (WeChat, LINE) block WebRTC, so open the link in Safari or Chrome. In mainland China a VPN is needed for the signalling server.
- To run your own signalling server instead, change `PFX`/`new Peer(…)` in `src/net/link.ts` to point at a self-hosted `peerjs-server`.

**Art and sound:**
- **Art:** every visual is drawn in code on a 2D canvas. The layers: the street (a far layer that drifts with your finger), the stall, the counter, and the objects with soft shadows.
- **Sound:** every sound is synthesized with the Web Audio API.
- **Files:** there are no image or audio files to load, and no Japanese voice yet. When recordings exist, they can be added per word.
- **Fonts:** M PLUS Rounded 1c from Google Fonts. Without it the page falls back to the system font.

**Tests** live in the Kotoba Shiba project:
- `tests/test39_restaurant.js` runs the whole first night with real drags in both roles: wrong-topping removal, a refused bowl sent back and fixed, repeated input, two devices online with a dropped link, and swapping roles.
- `tests/test37_hub.js` covers it inside 夜ふかし.
