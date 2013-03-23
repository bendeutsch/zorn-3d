attribute vec3 Position;
attribute vec3 Normal;
attribute vec4 Color;

uniform mat4 MV;
uniform mat4 P;
uniform mat3 N;

uniform vec3 light_direction;

varying vec4 color;
varying vec3 pos;

void main(void) {
    gl_Position = P * MV * vec4(Position, 1.0);
    vec3 normal = N * Normal;
    float weight = min(max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0), 1.0);
    color = vec4(Color.rgb * weight, 1.0);
    //color = vec4(1.0, 0.0, 0.0, 0.0);
    //color = vec4(1.0, 1.0, 0.0, 1.0);
    //color = vec4(
    //    max(min(abs(normal.x), 1.0),0.0),
    //    max(min(abs(normal.y), 1.0),0.0),
    //    max(min(abs(normal.z), 1.0),0.0),
    //1.0);
    pos = Position;
}

