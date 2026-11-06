// まよなか屋 Midnight Restaurant — entry point.
// Every module loads first (declarations only); then each one's start-up runs here, in the order the game was written.
import './styles/main.css';
import './net/link';
import * as env from './core/env';
import * as content from './data/content';
import './audio/sfx';
import * as stage from './render/stage';
import * as shapes from './render/shapes';
import './render/scenery';
import './data/layout';
import './game/night-state';
import './net/messages';
import './game/kitchen';
import './game/counter';
import './game/door';
import './game/bot';
import './render/particles';
import './render/views';
import './game/teach';
import './ui/overlays';
import * as pointer from './input/pointer';
import './game/flow';
import './ui/menus';
import './net/online';
import * as buttons from './ui/buttons';
import * as loop from './main-loop';

for (const m of [env, content, stage, shapes, pointer, buttons, loop]) m.init();
