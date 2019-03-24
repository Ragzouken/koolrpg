import { number } from "prop-types";

interface Character
{
    codepoint: number,
    canvas: HTMLCanvasElement,
    sprite: { x: number, y: number, w: number, h: number },
    offset: { x: number, y: number },
    spacing: number,
} 

class Font
{
    private readonly characters = new Map<number, Character>();

    public constructor(public readonly name: string, 
                       public readonly charWidth: number, 
                       public readonly charHeight: number)
    {
    }

    public addCharacter(character: Character): void
    {
        this.characters.set(character.codepoint, character);
    }

    public getCharacter(codepoint: number): Character | undefined
    {   
        return this.characters.get(codepoint);
    }

    public renderGlyph(context: CanvasRenderingContext2D, 
                       codepoint: number,
                       x: number, 
                       y: number): Character
    {
        const character = this.getCharacter(codepoint)!;

        context.drawImage(character.canvas, 
                          character.sprite.x,
                          character.sprite.y,
                          character.sprite.w,
                          character.sprite.h,
                          x,
                          y,
                          character.sprite.w,
                          character.sprite.h);
        
        return character;
    }
}

export class TextRenderer
{
    public readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private font: Font | undefined;
    private text = "";
    private padding = 0;
    private frame = 0;

    public constructor()
    {
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d")!;
    }

    public setBounds(width: number, height: number, padding: number): void
    {
        this.canvas.width  = width  + padding * 2;
        this.canvas.height = height + padding * 2;
        this.padding = padding;
    }

    public setFont(font: Font): void
    {
        this.font = font;
    }

    public setText(text: string): void
    {   
        this.text = text;
    }

    public setFrame(frame: number): void
    {
        this.frame = frame;
    }

    public render(): void
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.font) return;

        const time = this.frame / 60.;

        let x = this.padding;

        for (let i = 0; i < this.text.length; ++i)
        {
            const codepoint = this.text.codePointAt(i);

            if (!codepoint) continue;

            const y = this.padding + Math.round(Math.sin(time / .25 - i / 2) * 2);

            const character = this.font.renderGlyph(this.context, codepoint, x, y);

            x += character.spacing;
        }
    }
}

export function renderText(font: Font, text: string): HTMLCanvasElement
{
    const canvas = document.createElement("canvas");
    canvas.width = font.charWidth * text.length;
    canvas.height = font.charHeight * 2;
    const context = canvas.getContext("2d")!;
    
    let x = 0;

    for (let i = 0; i < text.length; ++i)
    {
        const character = font.renderGlyph(context, text.codePointAt(i)!, x, 0);

        x += character.spacing;
    }

    return canvas;
}

export function parseFont(data: string): Font
{
    const lines = data.split("\n").reverse();

    function take(): string
    {
        const line = lines.pop()!;
        
        return line;
    }

    const name = take().match(/FONT (.*)/)![1];
    const [charWidth, charHeight, ..._] = take().match(/SIZE (\d+) (\d+)/)!.slice(1).map(dimension => parseInt(dimension));

    const font = new Font(name, charWidth, charHeight);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = charWidth * 16;
    canvas.height = charHeight * 16;

    const charData = context.createImageData(charWidth, charHeight);
    const buf32 = new Uint32Array(charData.data.buffer); 

    while (lines.length > 0)
    {
        const charIndex = parseInt(take().match(/CHAR (\d+)/)![1]);

        for (let row = 0; row < charHeight; ++row)
        {
            take().split("").forEach((bit, column) =>
            {
                buf32[row * charWidth + column] = bit === "1" ? 0xFFFFFFFF : 0;
            });
        }

        const x = charIndex % 16;
        const y = Math.floor(charIndex / 16);

        const rect = {
            x: x * charWidth, 
            y: y * charHeight, 
            w: charWidth, 
            h: charHeight,
        }

        context.putImageData(charData, rect.x, rect.y);
        font.addCharacter({
            codepoint: charIndex,

            canvas: canvas,
            sprite: rect,

            offset: { x: 0, y: 0 },
            spacing: charWidth,
        });
    }

    return font;
}
