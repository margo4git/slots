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
    private tweening: Tween[] = [];
    private finishCount = 0;

    // user
    private balance = 70;
    private bets = [10, 25, 50, 100];
    private currentBet = this.bets[0];

    private balanceText?: Text;

    constructor(app: Application) {
        this.app = app;
        this.render();
    }

    private startPlay = () => {
        if (this.balance - this.currentBet < 0) return;
        if (this.isRunning) return;

        this.onTweenStart();

        this.balance -= this.currentBet;

        if (this.balanceText) {
            this.balanceText.text = `BALANCE: ${this.balance}`;
        }

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
            line.forEach((combo, index) => {
                if (line.every(({ imageIndex }) => line[0].imageIndex === imageIndex)) {
                    combos.push(combo);
                    if (index === 0) this.rewardUser();
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

    private rewardUser(multiplier = 3) {
        this.balance += this.currentBet * multiplier;
        if (this.balanceText) {
            this.balanceText.text = `BALANCE: ${this.balance}`;
        }
    }

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

            for (let j = 0; j < 5; j++) {
                const imageIndex = Math.floor(Math.random() * this.SLOT_TEXTURES.length);

                const sprite = new Sprite(this.SLOT_TEXTURES[imageIndex]);

                sprite.y = j * this.SYMBOL_SIZE;
                sprite.scale.x = sprite.scale.y = Math.min(
                    this.SYMBOL_SIZE / sprite.width,
                    this.SYMBOL_SIZE / sprite.height,
                );
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

        const positionY = (this.app.screen.height - this.SYMBOL_SIZE * 3) / 2;
        const positionX = (this.app.screen.width - reelContainer.width) / 2;
        reelContainer.y = positionY;
        reelContainer.x = positionX;

        const borderHeight = 46;
        const borderWidth = 58;
        const startButtonWidth = 160;
        const betButtonWidth = 180;
        const uiZIndex = 3;

        const startButton = new Graphics();
        const betButton = new Graphics();
        const betSelectorContainer = new Container();

        const textStyle = new TextStyle({
            fontFamily: "Arial",
            fontSize: 24,
            fontWeight: "bold",
            fill: "#ffffff",
            strokeThickness: 5,
        });
        this.balanceText = new Text(`BALANCE: ${this.balance}`, textStyle);
        const startButtonText = new Text("SPIN!", textStyle);
        const betButtonText = new Text(`BET: ${this.currentBet}`, textStyle);

        this.bets.forEach((bet, index) => {
            const nextBetButton = new Graphics();
            const nextBetText = new Text(bet, textStyle);
            const nextButtonHeight = 48;
            nextBetText.x = (betButtonWidth - nextBetText.width) / 2;
            nextBetText.y = (nextButtonHeight - nextBetText.height) / 2;
            nextBetButton.addChild(nextBetText);
            nextBetButton.y = index * (nextButtonHeight + 1);
            nextBetButton.beginFill(0xe6a817, 1);
            nextBetButton.drawRect(0, 0, betButtonWidth, nextButtonHeight);
            betSelectorContainer.addChild(nextBetButton);

            nextBetButton.interactive = true;
            nextBetButton.buttonMode = true;

            nextBetButton.addListener("pointerup", () => {
                this.currentBet = bet;
                betSelectorContainer.visible = false;
                betButtonText.text = `BET: ${bet}`;
                betButtonText.x = (betButtonWidth - betButtonText.width) / 2;
            });
        });

        betButton.beginFill(0x449114, 1);
        startButton.beginFill(0x449114, 1);
        startButton.drawRoundedRect(0, 0, startButtonWidth, borderHeight, 0);
        betButton.drawRoundedRect(0, 0, betButtonWidth, borderHeight, 0);

        betSelectorContainer.x = this.app.screen.width - betSelectorContainer.width - borderWidth;
        betSelectorContainer.y = this.app.screen.height - betSelectorContainer.height - 4 - borderHeight;
        this.balanceText.y = this.app.screen.height - (this.balanceText.height + borderHeight) / 2;
        this.balanceText.x = borderWidth;
        startButton.x = (this.app.screen.width - startButtonWidth) / 2;
        startButton.y = this.app.screen.height - borderHeight;
        betButton.y = this.app.screen.height - borderHeight;
        betButton.x = this.app.screen.width - betButtonWidth - borderWidth;
        startButtonText.x = (startButtonWidth - startButtonText.width) / 2;
        startButtonText.y = (borderHeight - startButtonText.height) / 2;
        betButtonText.x = (betButtonWidth - betButtonText.width) / 2;
        betButtonText.y = (borderHeight - betButtonText.height) / 2;

        betButton.addChild(betButtonText);
        startButton.addChild(startButtonText);
        this.app.stage.addChild(this.balanceText);
        this.app.stage.addChild(startButton);
        this.app.stage.addChild(betButton);
        this.app.stage.addChild(betSelectorContainer);

        startButton.interactive = betButton.interactive = true;
        startButton.buttonMode = betButton.buttonMode = true;

        startButton.zIndex = this.balanceText.zIndex = betButton.zIndex = betSelectorContainer.zIndex = uiZIndex;

        betSelectorContainer.visible = false;

        betButton.addListener("pointerup", () => {
            betSelectorContainer.visible = !betSelectorContainer.visible;
        });
        startButton.addListener("pointerup", () => {
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
