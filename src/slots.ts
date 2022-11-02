import cuid from "cuid";
import { Application, Container, filters, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
// 1. add bounce
// 2. change speed
interface ReelSymbol {
    imageIndex: number;
    id: string;
    sprite: Sprite;
}
interface Reel {
    id: string;
    container: Container;
    symbolsById: {
        [key: ReelSymbolId]: ReelSymbol;
    };
    symbolIds: ReelSymbolId[];

    position: number;
    previousPosition: number;
    blur: any;
}

interface Tween {
    id: string;
    reelId: Reel["id"];
    position: number;
    target: number;
    time: number;
    start: number;
}

type ReelId = Reel["id"];
type ReelSymbolId = ReelSymbol["id"];
type ReelSymbolImageIndex = ReelSymbol["imageIndex"];
interface Combo {
    reelId: ReelId;
    symbolId: ReelSymbolId;
    imageIndex: ReelSymbolImageIndex;
}

export class Slots {
    private app: Application;

    // layout
    private REEL_WIDTH = 170;
    private SYMBOL_SIZE = 150;
    private MINIMUM_TIME = 2500;
    private SLOT_TEXTURES = [
        Texture.from("./assets/slot-1.png"),
        Texture.from("./assets/slot-2.png"),
        Texture.from("./assets/slot-3.png"),
        Texture.from("./assets/slot-4.png"),
    ];
    private ACTIVE_SLOT_TEXTURES = [
        Texture.from("./assets/slot-1-active.png"),
        Texture.from("./assets/slot-2-active.png"),
        Texture.from("./assets/slot-3-active.png"),
        Texture.from("./assets/slot-4-active.png"),
    ];

    // state
    private isRunning = false;

    private reelsById: { [key: ReelId]: Reel } = {};
    private reelsIds: ReelId[] = [];

    private historyById: { [key: ReelId]: ReelSymbol["id"][] } = {};
    private history: string[][] = [];

    private tweening: Tween[] = [];

    private finishCount = 0;

    constructor(app: Application) {
        this.app = app;
        this.render();
    }

    private startPlay = () => {
        if (this.isRunning) return;
        this.onTweenStart();

        this.reelsIds.forEach((id, index) => {
            const reel = this.reelsById[id];

            const extra = Math.floor(Math.random() * 3);

            const target = reel.position + 10 + index * 5 + extra;
            const time = this.MINIMUM_TIME + index * 600 + extra * 600;

            this.tweenTo({ target, time, reelId: id, position: reel.position });
        });
    };
    private onTweenStart = () => {
        this.historyById = {};

        this.isRunning = true;
        this.finishCount = 0;
    };

    private onTweenChange = (tween: Tween) => {};

    private onTweenComplete = () => {
        this.isRunning = false;

        this.reelsIds.forEach((reelId, i) => {
            const reel = this.historyById[reelId];
            this.historyById[reelId] = reel.slice(reel.length - 4, reel.length - 1);
        });

        this.checkForVerticalCombo();
        this.checkForHorizontalCombo();
    };

    private checkForVerticalCombo = () => {
        const dirty: Combo[][] = [];

        for (let y = 0; y < this.reelsIds.length; y++) {
            const reelId = this.reelsIds[y];
            const reel = this.reelsById[reelId];
            for (let x = 0; x < this.historyById[reelId].length; x++) {
                const symbolId = this.historyById[reelId][x];
                const symbol = reel.symbolsById[symbolId];
                if (!dirty[y]) dirty[y] = [];
                dirty[y][x] = { symbolId, reelId, imageIndex: symbol.imageIndex };
            }
        }

        this.hightlightCombos(this.checkCombos(dirty));
    };

    private checkForHorizontalCombo = () => {
        const dirty: Combo[][] = [];

        for (let y = 0; y < this.reelsIds.length; y++) {
            const reelId = this.reelsIds[y];
            const reel = this.reelsById[reelId];
            for (let x = 0; x < this.historyById[reelId].length; x++) {
                const symbolId = this.historyById[reelId][x];
                const symbol = reel.symbolsById[symbolId];
                if (!dirty[x]) dirty[x] = [];
                dirty[x][y] = { symbolId, reelId, imageIndex: symbol.imageIndex };
            }
        }

        this.hightlightCombos(this.checkCombos(dirty));
    };

    private checkCombos = (dirtyCombos: Combo[][]): Combo[] => {
        const combos: Combo[] = [];

        dirtyCombos.forEach((line) => {
            line.forEach((combo) => {
                if (line.every(({ imageIndex }) => line[0].imageIndex === imageIndex)) {
                    combos.push(combo);
                }
            });
        });

        return combos;
    };

    private hightlightCombos = (combos: Combo[]) => {
        combos.forEach(({ imageIndex, symbolId, reelId }) => {
            this.reelsById[reelId].symbolsById[symbolId].sprite.texture = this.ACTIVE_SLOT_TEXTURES[imageIndex];
        });
    };

    private render = () => {
        const reelContainer = new Container();

        for (let i = 0; i < 3; i++) {
            const rc = new Container();
            rc.x = i * this.REEL_WIDTH;
            reelContainer.addChild(rc);

            const reel: Reel = {
                id: cuid(),
                container: rc,
                symbolIds: [],
                symbolsById: {},
                position: 0,
                previousPosition: 0,
                blur: new filters.BlurFilter(),
            };
            reel.blur.blurX = 0;
            reel.blur.blurY = 0;
            rc.filters = [reel.blur];

            // Build the symbols
            for (let j = 0; j < 4; j++) {
                const imageIndex = Math.floor(Math.random() * this.SLOT_TEXTURES.length);

                const sprite = new Sprite(this.SLOT_TEXTURES[imageIndex]);

                sprite.y = j * this.SYMBOL_SIZE;
                sprite.scale.x = sprite.scale.y = Math.min(
                    this.SYMBOL_SIZE / sprite.width,
                    this.SYMBOL_SIZE / sprite.height,
                );
                // sprite.x = Math.round((this.SYMBOL_SIZE - sprite.width) / 2);
                sprite.x = 0;

                const symbol = {
                    imageIndex,
                    sprite,
                    id: cuid(),
                };

                reel.symbolIds.push(symbol.id);
                reel.symbolsById[symbol.id] = symbol;

                rc.addChild(sprite);
            }

            this.reelsById[reel.id] = reel;
            this.reelsIds.push(reel.id);
        }
        this.app.stage.addChild(reelContainer);

        // Build top & bottom covers and position reelContainer
        const positionY = (this.app.screen.height - this.SYMBOL_SIZE * 3) / 2;
        const positionX = (this.app.screen.width - reelContainer.width) / 2;
        reelContainer.y = positionY;
        reelContainer.x = positionX;

        // reelContainer.y = this.SYMBOL_SIZE + 60;
        // reelContainer.x = (this.app.screen.width - this.SYMBOL_SIZE * 3) / 2;
        // const top = new Graphics();
        // top.beginFill(0, 1);
        // top.drawRect(0, 0, this.app.screen.width, 10);
        const bottom = new Graphics();
        bottom.beginFill(0, 1);
        // bottom.arc(10, 10, 90);
        bottom.drawRect(0, 0, 100, 100);

        // Add play text
        const style = new TextStyle({
            fontFamily: "Arial",
            fontSize: 36,
            fontStyle: "italic",
            fontWeight: "bold",
            fill: ["#ffffff", "#00ff99"], // gradient
            stroke: "#4a1850",
            strokeThickness: 5,
            dropShadow: true,
            dropShadowColor: "#000000",
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
            wordWrap: true,
            wordWrapWidth: 440,
        });

        const playText = new Text("Spin the wheels!", style);

        playText.x = 0;
        playText.y = 0;
        // playText.x = Math.round((bottom.width - playText.width) / 2);
        // playText.y = this.app.screen.height - positionY + Math.round((positionY - playText.height) / 2);
        // const bottomIcon = Sprite.from("./assets/slot-1.png");

        // bottom.addChild(bottomIcon);
        // bottom.addChild(playText);

        // Add header text
        // const headerText = new Text("PIXI MONSTER SLOTS!", style);
        // headerText.x = Math.round((top.width - headerText.width) / 2);
        // headerText.y = Math.round((margin - headerText.height) / 2);
        // top.addChild(headerText);

        // const foreground = Sprite.from("./assets/top_background.png");
        // this.app.stage.addChild(foreground);

        // this.app.stage.addChild(top);
        this.app.stage.addChild(bottom);

        // Set the interactivity.
        bottom.interactive = true;
        bottom.buttonMode = true;
        bottom.zIndex = 3;
        bottom.addListener("pointerdown", () => {
            this.startPlay();
        });

        this.setupTickers();
    };

    private setupTickers = () => {
        this.app.ticker.add((delta: number) => {
            const now = Date.now();
            const remove: Tween[] = [];

            this.tweening.forEach((tween) => {
                const phase = Math.min(1, (now - tween.start) / tween.time);

                this.reelsById[tween.reelId].position = this.lerp(tween.position, tween.target, this.backout(phase));

                this.onTweenChange(tween);

                if (phase === 1) {
                    this.reelsById[tween.reelId].position = tween.target;
                    this.finishCount += 1;
                    if (this.finishCount === this.reelsIds.length) this.onTweenComplete();
                    remove.push(tween);
                }
            });

            for (let i = 0; i < remove.length; i++) {
                this.tweening.splice(this.tweening.indexOf(remove[i]), 1);
            }
        });

        this.app.ticker.add((delta: number) => {
            this.reelsIds.forEach((reelId) => {
                const reel = this.reelsById[reelId];

                reel.blur.blurY = (reel.position - reel.previousPosition) * 8;
                reel.previousPosition = reel.position;

                reel.symbolIds.forEach((symbolId, symbolIndex) => {
                    const prevY = reel.symbolsById[symbolId].sprite.y;
                    reel.symbolsById[symbolId].sprite.y =
                        ((reel.position + symbolIndex) % reel.symbolIds.length) * this.SYMBOL_SIZE - this.SYMBOL_SIZE;

                    if (reel.symbolsById[symbolId].sprite.y < 0 && prevY > this.SYMBOL_SIZE) {
                        const imageIndex = Math.floor(Math.random() * this.SLOT_TEXTURES.length);
                        const nextSymbol = this.SLOT_TEXTURES[imageIndex];

                        this.historyById[reelId] = [...(this.historyById[reelId] || []), symbolId];

                        reel.symbolsById[symbolId].imageIndex = imageIndex;
                        reel.symbolsById[symbolId].sprite.texture = nextSymbol;
                        // reel.symbolsById[symbolId].sprite.scale.x = reel.symbolsById[symbolId].sprite.scale.y =
                        //     Math.min(
                        //         this.SYMBOL_SIZE / reel.symbolsById[symbolId].sprite.texture.width,
                        //         this.SYMBOL_SIZE / reel.symbolsById[symbolId].sprite.texture.height,
                        //     );
                        // reel.symbolsById[symbolId].sprite.x = 0;
                        // reel.symbolsById[symbolId].sprite.x = Math.round(
                        //     (this.SYMBOL_SIZE - reel.symbolsById[symbolId].sprite.width) / 2,
                        // );
                    }
                });
            });
        });
    };

    private tweenTo = ({
        target,
        time,
        reelId,
        position,
    }: {
        target: number;
        time: number;
        reelId: ReelId;
        position: number;
    }) => {
        const tween: Tween = {
            id: cuid(),
            reelId,
            target,
            position,
            time,
            start: Date.now(),
        };

        this.tweening.push(tween);
    };

    private lerp = (a1: number, a2: number, time: number) => {
        return a1 * (1 - time) + a2 * time;
    };

    private backout = (time: number): number => {
        const AMOUNT = 0.5;
        return --time * time * ((AMOUNT + 1) * time + AMOUNT) + 1;
    };
}
