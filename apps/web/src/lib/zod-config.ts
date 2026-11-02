import { z } from 'zod';

/*
 * Zod decides whether it may JIT-compile object schemas by probing `new Function`
 * the first time an object schema is built. Under this site's Content Security
 * Policy the probe throws, Zod catches it, and the browser still reports the
 * attempt as a violation. `jitless` skips the probe. Imported first by the router.
 */
z.config({ jitless: true });
