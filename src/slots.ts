import { Application, Container, filters, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
// 1. add bounce
// 2. change speed
interface ReelSymbol {
    sprite: Sprite;
    id: string;
}
interface Reel {
    id: number;
    container: Container;
    symbols: ReelSymbol[];
    // symbolsIds: any[];
    position: number;
    previousPosition: number;
    blur: any;
}

interface Tween {
    reel: Reel;
    property: keyof Reel;
    propertyBeginValue: number;
    target: number;
    easing: (time: number) => number;
    time: number;
    change?: (tween: Tween) => void;
    start: number;
}

export class Slots {
    private app: Application;

    // layout
    private history = [];
    private REEL_WIDTH = 170;
    private SYMBOL_SIZE = 150;
    private MINIMUM_TIME = 2500;
    private finishCount = 0;
    private slotTextures = [
        {
            id: "slot_1",
            sprite: Texture.from("./assets/slot-1.png"),
        },
        {
            id: "slot_2",
            sprite: Texture.from("./assets/slot-2.png"),
        },
        {
            id: "slot_3",
            sprite: Texture.from("./assets/slot-3.png"),
        },
        {
            id: "slot_4",
            sprite: Texture.from("./assets/slot-4.png"),
        },
    ];
    private slotTexturesActive = [
        {
            id: "slot_1_active",
            sprite: Texture.from("./assets/slot-1-active.png"),
        },
        {
            id: "slot_2_active",
            sprite: Texture.from("./assets/slot-2-active.png"),
        },
        {
            id: "slot_3_active",
            sprite: Texture.from("./assets/slot-3-active.png"),
        },
        {
            id: "slot_4_active",
            sprite: Texture.from("./assets/slot-4-active.png"),
        },
    ];

    // state
    private isRunning = false;
    private reels: Reel[] = [];
    private tweening: Tween[] = [];

    constructor(app: Application) {
        this.app = app;
        this.render();
    }

    startPlay = () => {
        if (this.isRunning) return;
        this.onTweenStart();
        for (let i = 0; i < this.reels.length; i++) {
            const reel = this.reels[i];
            const extra = Math.floor(Math.random() * 3);
            const target = reel.position + 10 + i * 5 + extra;
            const time = this.MINIMUM_TIME + i * 600 + extra * 600;
            this.tweenTo({
                reel,
                property: "position",
                target,
                time,
                easing: this.backout(0.5),
                onChange: this.onTweenChange,
            });
        }
    };
    onTweenStart = () => {
        console.log("START", this.reels);
        this.history.forEach((line, i) => {
            this.history[i] = [];
        });

        this.isRunning = true;
        this.finishCount = 0;
    };

    onTweenChange = (tween: Tween) => {
        // console.log(tween.reel);
        // tween.reel.id === 2 && console.log(tween.reel);
        // console.log(tween);
    };

    onTweenComplete = () => {
        this.isRunning = false;

        console.log(this.reels);

        this.history.forEach((line, i) => {
            this.history[i] = line.slice(line.length - 4, line.length - 1);
        });

        this.checkForVerticalCombo();
        // this.checkForHorizontalCombo();
        // this.checkForCrossCombo();

        // [horizontal, vertical]
        // const hoverSymbolList; // [[0,1], [0,2], [0,3], [0, 3], [0, 3]]
    };

    checkForCrossCombo = () => {
        const crossHistory = [];
    };

    checkForVerticalCombo = () => {
        const combos = [];
        // const combos = this.getCombos(this.history);
        for (let y = 0; y < this.history.length; y++) {
            const line = this.history[y];
            for (let x = 0; x < line.length; x++) {
                if (line.every((next) => line[0] === next)) {
                    combos.push({ i: line[x], x, y });
                }
            }
        }

        console.log("VERTICAL COMBOS", combos);

        this.hightlightCombos(combos);
    };

    checkForHorizontalCombo = () => {
        const combos = [];

        // const reversed = this.history.map((line) => [...line].reverse());

        for (let y = 0; y < this.history.length; y++) {
            const line = this.history[y];
            for (let x = 0; x < line.length; x++) {
                if (this.history.every((next) => line[0] === next[x])) {
                    combos.push({ i: line[x], y, x: line.length - x - 1 });
                }
            }
        }

        this.hightlightCombos(combos);
        console.log("HORIZONTAL COMBOS", combos);
    };

    hightlightCombos = (combos: Array<{ y: number; x: number; i: number }>) => {
        combos.forEach(({ x, y, i }) => {
            this.reels[y].symbols[x + 1].sprite.texture = this.slotTexturesActive[i].sprite;
        });
    };

    render = () => {
        const reelContainer = new Container();
        // const testContainer = new Container();
        // testContainer.x = 0;
        // testContainer.y = 0;
        // const symbol = new Sprite(this.slotTextures[0]);
        // this.app.stage.addChild(testContainer);
        // console.log(symbol.x, symbol.y);
        // testContainer.addChild(symbol);
        // reelContainer.addChild(symbol);

        for (let i = 0; i < 3; i++) {
            const rc = new Container();
            rc.x = i * this.REEL_WIDTH;
            reelContainer.addChild(rc);

            const reel: Reel = {
                id: i,
                container: rc,
                symbols: [],
                // symbolsIds: [],
                position: 0,
                previousPosition: 0,
                blur: new filters.BlurFilter(),
            };
            reel.blur.blurX = 0;
            reel.blur.blurY = 0;
            rc.filters = [reel.blur];

            // Build the symbols
            for (let j = 0; j < 5; j++) {
                const symbolRandom = Math.floor(Math.random() * this.slotTextures.length);

                const sprite = new Sprite(this.slotTextures[symbolRandom].sprite);
                // Scale the symbol to fit symbol area.
                sprite.y = j * this.SYMBOL_SIZE;
                sprite.scale.x = sprite.scale.y = Math.min(
                    this.SYMBOL_SIZE / sprite.width,
                    this.SYMBOL_SIZE / sprite.height,
                );
                sprite.x = Math.round((this.SYMBOL_SIZE - sprite.width) / 2);
                // reel.symbolsIds.push(symbolRandom);
                reel.symbols.push({ sprite, id: this.slotTextures[symbolRandom].id });
                rc.addChild(sprite);
            }
            this.reels.push(reel);
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

    setupTickers = () => {
        this.app.ticker.add((delta: number) => {
            const now = Date.now();
            const remove = [];
            for (let i = 0; i < this.tweening.length; i++) {
                const tween = this.tweening[i];
                const phase = Math.min(1, (now - tween.start) / tween.time);

                tween.reel[tween.property] = this.lerp(tween.propertyBeginValue, tween.target, tween.easing(phase));

                if (tween.change) tween.change(tween);
                if (phase === 1) {
                    tween.reel[tween.property] = tween.target;
                    this.finishCount += 1;
                    if (this.finishCount === this.reels.length) this.onTweenComplete();
                    remove.push(tween);
                }
            }
            for (let i = 0; i < remove.length; i++) {
                this.tweening.splice(this.tweening.indexOf(remove[i]), 1);
            }
        });
        this.app.ticker.add((delta: number) => {
            // if (!this.isRunning) return;

            for (let i = 0; i < this.reels.length; i++) {
                const r = this.reels[i];
                // Update blur filter y amount based on speed.
                // This would be better if calculated with time in mind also. Now blur depends on frame rate.
                r.blur.blurY = (r.position - r.previousPosition) * 8;
                r.previousPosition = r.position;
                // Update symbol positions on reel.
                for (let j = 0; j < r.symbols.length; j++) {
                    const symbol = r.symbols[j];
                    const prevY = symbol.sprite.y;
                    symbol.sprite.y = ((r.position + j) % r.symbols.length) * this.SYMBOL_SIZE - this.SYMBOL_SIZE;
                    if (symbol.sprite.y < 0 && prevY > this.SYMBOL_SIZE) {
                        // Detect going over and swap a texture.
                        // This should in proper product be determined from some logical reel.
                        const nextSymbolIndex = Math.floor(Math.random() * this.slotTextures.length);
                        const nextSymbol = this.slotTextures[nextSymbolIndex];
                        // console.log("nextSymbolIndex", nextSymbolIndex);

                        this.history[i] = [...(this.history[i] || []), nextSymbolIndex];
                        // if (this.reels[i].id === 2) console.log(nextSymbolIndex);

                        symbol.sprite.texture = nextSymbol.sprite;
                        symbol.id = nextSymbol.id;
                        symbol.sprite.scale.x = symbol.sprite.scale.y = Math.min(
                            this.SYMBOL_SIZE / symbol.sprite.texture.width,
                            this.SYMBOL_SIZE / symbol.sprite.texture.height,
                        );
                        symbol.sprite.x = Math.round((this.SYMBOL_SIZE - symbol.sprite.width) / 2);
                    }
                }
            }
        });
    };

    tweenTo = ({
        reel,
        property,
        target,
        time,
        easing,
        onChange,
    }: {
        reel: Reel;
        property: keyof Reel;
        target: number;
        time: number;
        easing: (time: number) => number;
        onChange?: (tween: Tween) => void;
    }) => {
        const tween: Tween = {
            reel,
            property,
            propertyBeginValue: reel[property],
            target,
            easing,
            time,
            change: onChange,
            start: Date.now(),
        };

        this.tweening.push(tween);
    };

    lerp = (a1: number, a2: number, time: number) => {
        return a1 * (1 - time) + a2 * time;
    };

    backout = (amount: number): ((time: number) => number) => {
        return (time) => --time * time * ((amount + 1) * time + amount) + 1;
    };
}
