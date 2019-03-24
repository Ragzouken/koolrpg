varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D palette;

void main(void)
{
    float index = texture2D(uSampler, vTextureCoord).r;
    gl_FragColor = texture2D(palette, vec2(index * 16., .5));
}
