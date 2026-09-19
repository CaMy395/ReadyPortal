# Frontend tooling migration plan

The current frontend uses `react-scripts` 5 and `config-overrides.js`. The production build succeeds, but its toolchain reports that the Create React App preset is unmaintained. Keep the current deployment working while migrating in a separate branch.

1. Capture a baseline: record build output, route smoke checks for public pages, login, admin tasks, scheduling, student sign-in, and the checkout return flow. Preserve the existing production environment values.
2. Create a Vite build entry from `src/index.js` and `public/index.html`. Keep React 18, React Router, and the current routes. Replace `process.env.REACT_APP_*` references with a single configuration module backed by the new build environment convention; include the API, WebSocket, and auth-token variables. Check whether the auth token should be shipped to browsers before carrying it forward.
3. Port the `assert`, `url`, `process`, and `Buffer` browser fallbacks from `config-overrides.js` only where dependencies actually require them. Avoid a blanket polyfill until a clean build identifies the consumers.
4. Verify asset paths, public files, CSS imports, redirects for deep links, and the Render build and publish settings. Keep the existing API origin and backend routing unchanged.
5. Compare the new build with the baseline, exercise the routes above in a staging deployment, and switch production only after the sign-in and payment return flows pass. Retain the previous build configuration for rollback until the new deployment is verified.

Separately, resolve the build's `react-hooks/exhaustive-deps` warnings by stabilizing callbacks and derived values in the affected components. Do not silence the rule globally: several effects fetch data and adding an unstable function as a dependency could create repeated requests.
