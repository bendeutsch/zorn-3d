precision mediump float;

varying vec4 color;
varying vec3 pos;

uniform sampler2D noise_tex;

void main(void) {
    gl_FragColor = color * texture2D(noise_tex, vec2(pos.x / 4.0, pos.z / 4.0));
}
