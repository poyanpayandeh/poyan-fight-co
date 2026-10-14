# Poyan Fight Co glove builder

![Poyan Fight Co glove builder](docs/hero.jpg)

A 3D configurator for Muay Thai gloves, built with Three.js and TypeScript. You can change the colours, finish and weight, add your name to the wrist patch, and share your build as a link.

Live demo: https://poyan-fight-co.vercel.app

Poyan Fight Co is a made-up brand for this portfolio project. Nothing is for sale.

## Screenshots

| Desktop | Name patch |
| --- | --- |
| ![Glove builder on desktop](docs/desktop.jpg) | ![Typing a name onto the wrist patch](docs/name-patch.jpg) |
| Opened from a shared link | Phone |
| ![A royal blue gloss build loaded from a shared link](docs/shared-build.jpg) | ![The builder on a phone](docs/phone.jpg) |

## Features

- Spin and zoom the glove
- 5 leather colours, matte or gloss finish, 3 seal colours and 4 lettering colours
- Weights from 10 to 16 oz, and the glove gets bigger as the weight goes up
- Add a name (up to 12 letters) and it gets stitched onto the wrist patch as you type
- Price updates as you change options
- Every choice is saved in the URL, so you can share your build
- Works on phones

## How it works

All the options live in one config object in `config.ts`. The panel, the price, the glove materials and the share link all read from it, so adding a new colour is one line.

The glove texture has red baked into it, so tinting it directly just gave muddy colours. On load I convert the texture to greyscale and let the material colour do the tinting.

The name is drawn on a hidden canvas and used as the patch texture, with a bump map so the letters look stitched. When you click into the name box, the camera moves to the patch so you can watch it update.

The logo, labels and name patch were added in Blender and projected onto the glove surface. After I moved the name patch lower down the strap, its top edge sank into the leather, so I re-projected it to sit flush.

Shared links are checked against the real options before they're used, so a broken or edited link just falls back to the defaults.

The model came out of Blender at 646 KB, and meshopt and WebP compression got it down to 148 KB. With default settings the optimiser deleted the UV map the name patch needs (and it would also merge the materials), so the `optimize-model` script turns those options off.

## Built with

Three.js, TypeScript, Vite, Blender, glTF Transform and Vercel.

## Running it

```bash
cd poyan-fight-co
npm install
npm run dev
```

After exporting a new model from Blender, run `npm run optimize-model` before committing.

```
src/config.ts       options, colours and prices
src/main.ts         scene, camera and loading the glove
src/panel.ts        the options panel
src/name-patch.ts   the name texture
src/share.ts        saving builds in the URL
src/fly.ts          camera moves
src/price.ts        the price
```

## Credits

Glove model: ["Boxing gloves"](https://sketchfab.com/3d-models/boxing-gloves-9d244a5bfaf84ea398cff99154e99eab) by [ayumi ikeda](https://sketchfab.com/rxf10240), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). I changed the branding and added the name patch and colour options.

Font: [Anton](https://fonts.google.com/specimen/Anton), SIL Open Font License.

Built by Poyan Payandeh, Auckland.