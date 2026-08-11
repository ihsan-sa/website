# ihsan.cc

Single-page personal index. Built with [Create React App](https://github.com/facebook/create-react-app).

## Editing the content

**All the text on the site is in [`src/content.json`](src/content.json).** Name, bio,
about paragraphs, the link row, experience entries, project titles and captions — edit
that one file and you are done. You never need to touch `App.js`.

The file opens with a `_readme` block explaining the JSON rules (quotes, commas) and how
to add or remove an entry. Every `_note` and `_readme` key is documentation only; the site
ignores them.

Two exceptions, both in [`public/index.html`](public/index.html):

- the **browser-tab title**
- the **description shown when you paste the link** into Slack, LinkedIn, iMessage, etc.

Those have to be plain HTML because link-preview bots read the page without running it.

Images go in `public/images/`. A path of `/images/foo.jpg` in the JSON means
`public/images/foo.jpg`. Project thumbnails render at about 380×238, so export them
around 760×476 at 16:10 — other ratios get cropped from the centre.

To see your changes: `npm start`, then open http://localhost:3000. The page reloads as you
save. To publish them you still need `npm run build`.

## Where everything else lives

| File | What's in it |
|---|---|
| `src/content.json` | all copy and links |
| `src/App.js` | page structure and the theme toggle — rarely needs changing |
| `src/App.css` | layout and component styling |
| `src/index.css` | colours (light **and** dark), fonts, spacing — the design tokens |
| `public/index.html` | tab title, link-preview description, web fonts, analytics, theme pre-paint script |

## Dark mode

Light and dark, warm in both. Two rules:

1. An explicit click on the toggle wins and persists in `localStorage['ihsan-theme']`,
   applied as `data-theme` on `<html>`.
2. With no stored choice, the OS preference decides — handled purely in CSS, so it works
   before any JavaScript runs.

Both palettes are token blocks at the top of `src/index.css`; the dark values appear twice
(once for the explicit choice, once for the OS default) and **must be kept in sync**.

The small inline `<script>` in `public/index.html` applies the stored theme *before first
paint*. Without it, dark-mode visitors get a white flash on every load. Don't move it into
a component, and don't make it `defer`/`async`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
