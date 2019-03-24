import './index.css';

import fragmentSource from "./resources/palette.frag";
import asciiSmallFont from "./resources/ascii_small.bitsyfont";

import * as PIXI from 'pixi.js';
import * as MTexture from "./MTexture";
import { rgb2num, randomInt, rgb2hex } from './utility';
import { parseFont, renderText, TextRenderer } from './font';

class PaletteFilter
{
    static fragmentSource: string;

    public readonly texture: MTexture.MTexture;
    public readonly colors: number[];
    public readonly filter: PIXI.Filter;

    public constructor(size: number)
    {
        this.colors = Array(size).fill(0);
        this.texture = new MTexture.MTexture(size, 1);
        this.filter = new PIXI.Filter(undefined, 
                                      PaletteFilter.fragmentSource, 
                                      { palette: this.texture.base, });
    }

    public update(): void
    {
        this.texture.plot((x, y) => this.colors[x]);
        this.texture.update();
    }
}

class TestDrawing
{
    public readonly mtexture: MTexture.MTexture;
    public readonly texture: PIXI.Texture;

    public constructor(width: number, height: number)
    {
        this.mtexture = new MTexture.MTexture(width, height);
        this.texture = new PIXI.Texture(this.mtexture.base);
    }
}

class Room
{
    public readonly tiles: number[] = [];
    public readonly walls: boolean[] = [];

    public resize(width: number, height: number): void
    {
        this.tiles.length = width * height;
        this.tiles.fill(0);
        this.walls.length = width * height;
        this.walls.fill(false);
    }
}

function makeBlankRoom(width: number, height: number): Room
{
    const room = new Room();
    room.resize(width, height);

    return room;
}

function renderRoomToMTexture(target: MTexture.MTexture, 
                              room: Room, 
                              tiles: MTexture.MTexture[]): void
{
    target.context.clearRect(0, 0, 128, 128);

    for (let y = 0; y < 16; ++y)
    {
        for (let x = 0; x < 16; ++x)
        {
            const tileIndex = room.tiles[y * 16 + x];
            const tile = tiles[tileIndex];
            target.context.drawImage(tile.canvas, x * 8, y * 8);
        }
    }
}

function randomiseRoomTiles(room: Room, maxTileIndex: number): void
{
    room.tiles.forEach((_, index) => room.tiles[index] = randomInt(0, maxTileIndex));
}

async function start()
{
    PaletteFilter.fragmentSource = await fetch(fragmentSource).then(response => response.text());

    const font = await fetch(asciiSmallFont).then(response => response.text()).then(parseFont);

    const tiles: MTexture.MTexture[] = [];
    const indexes = Array(16).fill(0).map((_, i) => i);

    for (let i = 0; i < 16; ++i)
    {
        const sub = indexes.filter(() => randomInt(0, 1) === 1);
        const tile = new MTexture.MTexture(8, 8);
        if (i > 0) tile.plot((x, y) => rgb2num(sub[(i * x * y + i + x + y) % sub.length], 0, 0));
        tile.update();

        tiles.push(tile);
    }

    const room = makeBlankRoom(16, 16);

    const palette1 = new PaletteFilter(16);
    palette1.colors.forEach((_, i) => palette1.colors[i] = rgb2num(randomInt(0, 255), randomInt(0, 255), randomInt(0, 255)));
    palette1.update();

    const palette2 = new PaletteFilter(16);
    palette2.colors.forEach((_, i) => palette2.colors[i] = rgb2num(randomInt(0, 255), randomInt(0, 255), randomInt(0, 255)));
    palette2.update();

    const screen = new TestDrawing(128, 128);

    const avatar = new TestDrawing(8, 8);
    avatar.mtexture.context.beginPath();
    avatar.mtexture.context.arc(4, 4, 3, 0, 2 * Math.PI);
    avatar.mtexture.context.fillStyle = "#FFFFFF";
    avatar.mtexture.context.fill();
    avatar.mtexture.update();
    const avatarSprite = new PIXI.Sprite(avatar.texture);
    avatarSprite.position.set(8 * 4, 8 * 4);
    avatarSprite.scale.set(2);
    avatarSprite.filters = [palette2.filter];

    const screen2 = new TestDrawing(48, 48);
    screen2.mtexture.plot((x, y) => rgb2num((x + y + randomInt(0, 4)) % 16, 0, 0));
    screen2.mtexture.update();

    const paletteSprite1 = new PIXI.Sprite(new PIXI.Texture(palette1.texture.base));
    paletteSprite1.scale.set(4);
    const paletteSprite2 = new PIXI.Sprite(new PIXI.Texture(palette2.texture.base));
    paletteSprite2.scale.set(4);
    paletteSprite2.position.set(0, 4);
    const screenSprite1 = new PIXI.Sprite(screen.texture);
    screenSprite1.scale.set(2);
    const screenSprite2 = new PIXI.Sprite(screen2.texture);
    screenSprite2.scale.set(2);
    screenSprite2.position.set(128, 128);

    const textRenderer = new TextRenderer();
    textRenderer.setBounds(192, font.charHeight * 2, 8);
    textRenderer.setFont(font);
    textRenderer.setText("hello this is a real good test oh golly oh gosh");

    const dialogueCanvas = document.createElement("canvas");
    dialogueCanvas.width = 208;
    dialogueCanvas.height = (3 * 4) + font.charHeight * 2 + 15;
    const dialogueContext = dialogueCanvas.getContext("2d")!;

    const textSprite = new PIXI.Sprite(new PIXI.Texture(new PIXI.BaseTexture(dialogueCanvas)));
    textSprite.position.set(24, 24);

    let frame = 0;

    function updateText()
    {
        frame += 1;
        textRenderer.setFrame(frame);
        textRenderer.render();

        dialogueContext.fillStyle = "#000000";
        dialogueContext.fillRect(0, 0, dialogueCanvas.width, dialogueCanvas.height);
        dialogueContext.drawImage(textRenderer.canvas, 0, 0);
        textSprite.texture.baseTexture.update();
    }

    updateText();

    screenSprite1.filters = [palette1.filter];

    const container2 = new PIXI.Container();
    container2.filters = [palette2.filter];
    container2.addChild(screenSprite2);

    const pixi = new PIXI.Application({ width: 256, height: 256, transparent: true });
    document.getElementById("root")!.appendChild(pixi.view);
    pixi.start();

    pixi.stage.addChild(screenSprite1);
    pixi.stage.addChild(container2);
    pixi.stage.addChild(paletteSprite1);
    pixi.stage.addChild(paletteSprite2);
    pixi.stage.addChild(avatarSprite);
    pixi.stage.addChild(textSprite);

    let delay = 0;

    pixi.ticker.add(() =>
    {
        if (delay == 0)
        {
            randomiseRoomTiles(room, tiles.length - 1);
            renderRoomToMTexture(screen.mtexture, room, tiles);
            screen.mtexture.update();
            delay = 60;
        }
        else
        {
            delay -= 1;
        }
    });

    pixi.ticker.add(() =>
    {
        palette1.colors[randomInt(0, 16)] = rgb2num(randomInt(0, 255), randomInt(0, 255), randomInt(0, 255));
        palette1.update();

        updateText();
    });

    document.addEventListener("keydown", event =>
    {
        if (event.key === "ArrowDown")
        {
            avatarSprite.position.set(avatarSprite.position.x, avatarSprite.position.y + 16);
        }
        if (event.key === "ArrowUp")
        {
            avatarSprite.position.set(avatarSprite.position.x, avatarSprite.position.y - 16);
        }
        if (event.key === "ArrowRight")
        {
            avatarSprite.position.set(avatarSprite.position.x + 16, avatarSprite.position.y);
        }
        if (event.key === "ArrowLeft")
        {
            avatarSprite.position.set(avatarSprite.position.x - 16, avatarSprite.position.y);
        }
    });
}

start();
