attribute vec3 Position;
attribute vec4 Color;

uniform mat4 MV;
uniform mat4 P;

varying vec4 color;

void main(void) {
    gl_Position = P * MV * vec4(Position, 1.0);
    color = Color;
}

