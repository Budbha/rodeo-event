/** App entrypoint. Separate modules for content, booking and motion. */
import {createI18n} from './i18n.js';
import {setupBooking} from './booking.js';
import {setupMotion} from './motion.js';

const i18n = createI18n();
const booking = setupBooking(i18n);
setupMotion();
await i18n.initialize();
booking.updateEstimate();
