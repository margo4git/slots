import { Application, Container, filters, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
// 1. add bounce
// 2. change speed
export class Slots {
    private app: Application;

    // layout
    private REEL_WIDTH = 170;
    private SYMBOL_SIZE = 150;
    private slotTextures = [
        Texture.from("./assets/slot-1.png"),
        Texture.from("./assets/slot-2.png"),
        Texture.from("./assets/slot-3.png"),
        Texture.from("./assets/slot-4.png"),
    ];

    // state
    private isRunning = false;
    private reels: any[] = [];
    private tweening: any[] = [];

    constructor(app: Application) {
        this.app = app;
        this.render();
    }

    startPlay() {
        if (this.isRunning) return;
        this.isRunning = true;

        for (let i = 0; i < this.reels.length; i++) {
            const r = this.reels[i];
            const extra = Math.floor(Math.random() * 3);
            const target = r.position + 10 + i * 5 + extra;
            const time = 2500 + i * 600 + extra * 600;
            this.tweenTo(
                r,
                "position",
                target,
                time,
                this.backout(0.5),
                null,
                i === this.reels.length - 1 ? () => this.reelsComplete() : null,
            );
        }
    }

    reelsComplete() {
        this.isRunning = false;
    }

    render() {
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

            const reel = {
                container: rc,
                symbols: [],
                position: 0,
                previousPosition: 0,
                blur: new filters.BlurFilter(),
            };
            reel.blur.blurX = 0;
            reel.blur.blurY = 0;
            rc.filters = [reel.blur];

            // Build the symbols
            for (let j = 0; j < 4; j++) {
                const symbol = new Sprite(this.slotTextures[Math.floor(Math.random() * this.slotTextures.length)]);
                // Scale the symbol to fit symbol area.
                symbol.y = j * this.SYMBOL_SIZE;
                symbol.scale.x = symbol.scale.y = Math.min(
                    this.SYMBOL_SIZE / symbol.width,
                    this.SYMBOL_SIZE / symbol.height,
                );
                symbol.x = Math.round((this.SYMBOL_SIZE - symbol.width) / 2);

                reel.symbols.push(symbol);
                rc.addChild(symbol);
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
        bottom.drawRect(200, 0, 100, 100);

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
        const bottomIcon = Sprite.from("./assets/slot-1.png");

        bottom.addChild(bottomIcon);
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

        this.setupListeners();
    }

    setupListeners() {
        this.app.ticker.add((delta) => {
            // Update the slots.
            for (let i = 0; i < this.reels.length; i++) {
                const r = this.reels[i];
                // Update blur filter y amount based on speed.
                // This would be better if calculated with time in mind also. Now blur depends on frame rate.
                r.blur.blurY = (r.position - r.previousPosition) * 8;
                r.previousPosition = r.position;

                // Update symbol positions on reel.
                for (let j = 0; j < r.symbols.length; j++) {
                    const symbol = r.symbols[j];
                    const prevy = symbol.y;
                    symbol.y = ((r.position + j) % r.symbols.length) * this.SYMBOL_SIZE - this.SYMBOL_SIZE;
                    if (symbol.y < 0 && prevy > this.SYMBOL_SIZE) {
                        // Detect going over and swap a texture.
                        // This should in proper product be determined from some logical reel.
                        symbol.texture = this.slotTextures[Math.floor(Math.random() * this.slotTextures.length)];
                        symbol.scale.x = symbol.scale.y = Math.min(
                            this.SYMBOL_SIZE / symbol.texture.width,
                            this.SYMBOL_SIZE / symbol.texture.height,
                        );
                        symbol.x = Math.round((this.SYMBOL_SIZE - symbol.width) / 2);
                    }
                }
            }
        });

        this.app.ticker.add((delta) => {
            const now = Date.now();
            const remove = [];
            for (let i = 0; i < this.tweening.length; i++) {
                const t = this.tweening[i];
                const phase = Math.min(1, (now - t.start) / t.time);

                t.object[t.property] = this.lerp(t.propertyBeginValue, t.target, t.easing(phase));
                if (t.change) t.change(t);
                if (phase === 1) {
                    t.object[t.property] = t.target;
                    if (t.complete) t.complete(t);
                    remove.push(t);
                }
            }
            for (let i = 0; i < remove.length; i++) {
                this.tweening.splice(this.tweening.indexOf(remove[i]), 1);
            }
        });
    }

    tweenTo(object, property, target, time, easing, onchange, oncomplete) {
        const tween = {
            object,
            property,
            propertyBeginValue: object[property],
            target,
            easing,
            time,
            change: onchange,
            complete: oncomplete,
            start: Date.now(),
        };

        this.tweening.push(tween);
        return tween;
    }

    lerp(a1, a2, t) {
        return a1 * (1 - t) + a2 * t;
    }

    backout(amount) {
        return (t) => --t * t * ((amount + 1) * t + amount) + 1;
    }
}
