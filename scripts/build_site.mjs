import { cp, mkdir, rm } from "node:fs/promises";

/**
 * Assemble the published site: the landing page at the root, each episode in its
 * own folder beneath it. Episodes build with `base: "./"`, so their asset and
 * favicon references stay relative and work under a GitHub Pages sub-path.
 *
 * This lives in a script rather than in the workflow so that `npm run build:site`
 * exercises the same code locally and in CI. The assembly used to be six lines of
 * shell inside a manual-only workflow, which meant it had never once run.
 */
const EPISODES = ["height-check", "carbon-road"];

await rm("site", { recursive: true, force: true });
await mkdir("site", { recursive: true });
await cp("web/index.html", "site/index.html");
for (const name of EPISODES) {
  await cp(`episodes/${name}/dist`, `site/${name}`, { recursive: true });
  console.log(`site/${name}/`);
}
console.log("site/index.html");
