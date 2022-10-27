import { Application, Loader, Sprite } from "pixi.js";
import { Slots } from "./slots";
import "./style.css";

declare const VERSION: string;

const gameWidth = 800;
const gameHeight = 540;

const app = new Application({
    backgroundColor: 0xc71585,
    width: gameWidth,
    height: gameHeight,
});

window.onload = async (): Promise<void> => {
    await loadGameAssets();
    const background = Sprite.from("./assets/background.png");
    const foreground = Sprite.from("./assets/top_background.png");
    app.stage.sortableChildren = true;
    app.stage.addChild(background);
    app.stage.addChild(foreground);
    foreground.zIndex = 2;
    background.width = foreground.width = app.screen.width;
    background.height = foreground.height = app.screen.height;
    // background.width = app.screen.width;
    // background.height = app.screen.height;
    console.log("bg", background.width, background.height);
    console.log("fg", foreground.width, foreground.height);

    document.body.appendChild(app.view);

    resizeCanvas();

    new Slots(app);

    app.stage.interactive = true;
};

async function loadGameAssets(): Promise<void> {
    return new Promise((res, rej) => {
        const loader = Loader.shared;

        loader.add("slot-1", "./assets/slot-1.png");
        loader.add("slot-2", "./assets/slot-2.png");
        loader.add("slot-3", "./assets/slot-3.png");
        loader.add("slot-4", "./assets/slot-4.png");
        loader.add("background", "./assets/background.png");
        loader.add("top_background", "./assets/top_background.png");

        loader.onComplete.once(() => {
            res();
        });

        loader.onError.once(() => {
            rej();
        });

        loader.load();
    });
}

function resizeCanvas(): void {
    const resize = () => {
        // app.renderer.resize(window.innerWidth, window.innerHeight);
        // app.stage.scale.x = window.innerWidth / gameWidth;
        // app.stage.scale.y = window.innerHeight / gameHeight;
    };

    resize();

    window.addEventListener("resize", resize);
}
