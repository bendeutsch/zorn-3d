var gl;
var shader_v;
var shader_f;
var shader_program;
var clear_color = 0.4;
var p_mat;
var mv_mat;
var n_mat;

var map_heights = [];
var map_position_buffer;
var map_color_buffer;
var map_index_buffer;
var map_normal_buffer;
var v_count = 0;

var map_x = 255;
var map_y = 255;

function Map( ) {
    this.heights = [];
    this.position_buffer = null;
    this.color_buffer = null;
    this.index_buffer = null;
    this.normal_buffer = null;
    this.width = 128; // in tiles
    this.height = 128; 
}

var camera = {
    rx: 0.1,
    ry: 0.0,
    t: vec3.fromValues(64.0, 0.0, 64.0),
};
var move_mat = mat3.create();
var move_vec = vec3.create();

var move_keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
};

var noise_tex;

window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame;

function shaders_loaded() {
    shader_program = gl.createProgram();
    gl.attachShader(shader_program, shader_v);
    gl.attachShader(shader_program, shader_f);
    gl.linkProgram(shader_program);

    if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
        shader_program = null;
        return;
    }

    gl.useProgram(shader_program);

    shader_program.v_pos = gl.getAttribLocation(shader_program, "Position");
    shader_program.v_nor = gl.getAttribLocation(shader_program, "Normal");
    shader_program.v_col = gl.getAttribLocation(shader_program, "Color");
    gl.enableVertexAttribArray(shader_program.v_pos);
    gl.enableVertexAttribArray(shader_program.v_nor);
    gl.enableVertexAttribArray(shader_program.v_col);
    shader_program.p_mat = gl.getUniformLocation(shader_program, "P");
    shader_program.mv_mat = gl.getUniformLocation(shader_program, "MV");
    shader_program.n_mat = gl.getUniformLocation(shader_program, "N");
    shader_program.light = gl.getUniformLocation(shader_program, "light_direction");
    shader_program.noise_tex = gl.getUniformLocation(shader_program, "noise_tex");

}

function make_map() {

    map_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, map_position_buffer);
    var v = [ ];
    var vc = [ ];
    // remember: need one more, for the edges
    for (var y=0; y<=map_y; y++) {
        for (var x=0; x<=map_x; x++) {
            var h;
            //h = (Math.sin(x / 5.0) + Math.sin(y / 5.0) + 2.0) / 4.0;
            var dx = Math.abs(x - map_x / 2.0);
            var dy = Math.abs(y - map_y / 2.0);
            var d = Math.sqrt(dx * dx + dy * dy);
            // boundaries, 0-1
            var h_max = Math.min( 1.0 - (dx / (map_x/1.4)) , 1.0 - (dy / (map_y/1.4)) );
            h_max = Math.pow(h_max, 1.5);
            if (h_max < 0.0) { h_max = 0.0; }
            h = 0;
            h += rand_field(x / 25.0 , y / 25.0 ) * 0.75;
            h += rand_field(x / 10.0 , y / 10.0 ) * 0.23;
            h += rand_field(x / 2.0 , y / 2.0) * 0.02;
            // h is 0-1
            // create grooves!
            //var h_min = 2.0 / (2.0 + rand_field(x / 30.0, y/30.0));
            //if (h > h_min) {
            //    h = h_min - (h - h_min);
            //}
            h = h * h_max - (1.0-h_max)*0.2;
            // h is 0-1

            if (h < 0.0) { h = 0.0; }
            // h = 0-1

            // Lighting will take care of this
            //vc.push(1.0, 1.0, 1.0, 1.0);

            // Mock
            var terrain = h - rand_field(x / 4.5, y / 4.5) * 0.02;
            if (terrain <= 0.0) {
                vc.push(0.2, 0.2, 0.5, 1.0);
            } else if (terrain < 0.02) {
                vc.push(1.0, 1.0, 0.7, 1.0);
            } else if (terrain < 0.15) {
                vc.push(0.0, 1.0, 0.0, 1.0);
            } else if (terrain < 0.35) {
                vc.push(0.0, 0.7, 0.0, 1.0);
            } else if (terrain < 0.5) {
                vc.push(0.5, 0.5, 0.5, 1.0);
            } else {
                vc.push(1.0, 1.0, 1.0, 1.0);
            }

            h *= 50.0;
            // h = 0-50, tall enough

            map_heights.push(h);
            v.push(x, h, y);
            //vc.push((x%2)/2.0, (x+y)%4/4.0, (y%3)/3.0, 1.0);
            if (x == Math.floor(camera.t[0]) && y == Math.floor(camera.t[2])) {
                camera.t[1] = h+1;
            }

        }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);

    map_color_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, map_color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vc), gl.STATIC_DRAW);

    // normals
    // edges are flat
    map_normal_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, map_normal_buffer);
    var vn = [ ];
    var n_tmp = vec3.create();
    for (var x=0; x<=map_x; x++) {
        vn.push(0.0, 1.0, 0.0);
    }
    for (var y=1; y<map_y; y++) {
        vn.push(0.0, 1.0, 0.0);
        for (var x=1; x<map_x; x++) {
            n_tmp = vec3.fromValues(
                map_heights[(x+1) + (map_x+1) * y] - map_heights[(x-1) + (map_x+1) * y],
                1.0,
                map_heights[x + (map_x+1) * (y+1)] - map_heights[x + (map_x+1) * (y-1)]
            );
            vec3.normalize(n_tmp, n_tmp);
            vn.push(n_tmp[0], n_tmp[1], n_tmp[2]);
        }
        vn.push(0.0, 1.0, 0.0);
    }
    for (var x=0; x<=map_x; x++) {
        vn.push(0.0, 1.0, 0.0);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vn), gl.STATIC_DRAW);

    map_index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, map_index_buffer);
    var vi = [ ];
    for (var y=0; y<map_y; y++) {
        for (var x=0; x<map_x; x++) {
            vi.push( (x+0) + (map_x+1)*(y+0));
            vi.push( (x+0) + (map_x+1)*(y+1));
            vi.push( (x+1) + (map_x+1)*(y+0));

            vi.push( (x+1) + (map_x+1)*(y+0));
            vi.push( (x+0) + (map_x+1)*(y+1));
            vi.push( (x+1) + (map_x+1)*(y+1));

            v_count += 6;
        }
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vi), gl.STATIC_DRAW);

    window.requestAnimFrame(draw);
}

function do_webgl () {
    var canvas = $("#canvas")[0];
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth  = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch(e) {
        alert("Could not initialize");
    }
    gl.clearColor(clear_color, 0.6, 1.0, 1.0);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    p_mat = mat4.create();
    mv_mat = mat4.create();
    n_mat = mat3.create();

    //alert($('#shader-fs').html());

    $.ajax({
        url: 'shader-vertex.glsl',
        dataType: 'text',
        success: function(data) {
            shader_v = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(shader_v, data);
            gl.compileShader(shader_v);
            if (!gl.getShaderParameter(shader_v, gl.COMPILE_STATUS)) {
                alert("Vertex error:" + gl.getShaderInfoLog(shader_v));
                shader_v = null;
            }
            if (shader_v && shader_f) {
                shaders_loaded();
            }
        },
        error: function() {
            alert("Error in vertex shader");
        }
    });

    $.ajax({
        url: 'shader-fragment.glsl',
        dataType: 'text',
        success: function(data) {
            shader_f = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(shader_f, data);
            gl.compileShader(shader_f);
            if (!gl.getShaderParameter(shader_f, gl.COMPILE_STATUS)) {
                alert("Fragment error:" + gl.getShaderInfoLog(shader_f));
                shader_f = null;
            }
            if (shader_v && shader_f) {
                shaders_loaded();
            }
        },
        error: function() {
            alert("Error in fragment shader");
        }
    });

    make_map();

    noise_tex = gl.createTexture();
    noise_tex.image = new Image();
    noise_tex.image.onload = noise_loaded;
    noise_tex.image.src = "noise.png";
    //console.log('requesting noise.png');

    //window.mozRequestAnimationFrame(draw);
}

function noise_loaded() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noise_tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noise_tex.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    //console.log('noise texture loaded');
    noise_tex.loaded = true;
}

function draw() {
    window.requestAnimFrame(draw);
    gl.clearColor(0.0, 0.6, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!shader_program) {
        return;
    }
    if (!noise_tex || !noise_tex.loaded) {
        return;
    }

    mat4.perspective(p_mat, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0);
    mat4.identity(mv_mat);
    mat4.rotateX(mv_mat, mv_mat, camera.rx);
    mat4.rotateY(mv_mat, mv_mat, camera.ry);
    var mv_side = 0;
    var mv_forward = 0;
    var mv_up = 0;
    if (move_keys.forward) {
        mv_forward -= 0.1;
    }
    if (move_keys.backward) {
        mv_forward += 0.1;
    }
    if (move_keys.left) {
        mv_side -= 0.1;
    }
    if (move_keys.right) {
        mv_side += 0.1;
    }
    if (move_keys.up) {
        mv_up += 0.1;
    }
    if (move_keys.down) {
        mv_up -= 0.1;
    }

    mat3.fromMat4(move_mat, mv_mat);
    mat3.transpose(move_mat, move_mat); // invert a rotation matrix
    //var movement = vec3.fromValues( mv_side, mv_up, mv_forward);
    vec3.set(move_vec, mv_side, mv_up, mv_forward);
    vec3.transformMat3(move_vec, move_vec, move_mat);
    vec3.add(camera.t, camera.t, move_vec);
    if (camera.t[1] <= map_height_at(camera.t[0], camera.t[2]) + 1.0 )  {
        camera.t[1] = map_height_at(camera.t[0], camera.t[2]) + 1.0;
    }

    // reuse move_vec as -t
    vec3.negate(move_vec, camera.t)
    mat4.translate(mv_mat, mv_mat, move_vec);

    if (map_index_buffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, map_position_buffer);
        gl.vertexAttribPointer(shader_program.v_pos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, map_color_buffer);
        gl.vertexAttribPointer(shader_program.v_col, 4, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, map_normal_buffer);
        gl.vertexAttribPointer(shader_program.v_nor, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(shader_program.p_mat, false, p_mat);
        gl.uniformMatrix4fv(shader_program.mv_mat, false, mv_mat);

        n_mat = mat3.create();
        //mat4.toInverseMat3(mv_mat, n_mat);
        //mat3.normalFromMat4(n_mat, mv_mat);
        //mat3.transpose(n_mat, n_mat);
        mat3.identity(n_mat);
        gl.uniformMatrix3fv(shader_program.n_mat, false, n_mat);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, noise_tex);
        gl.uniform1i(shader_program.noise_tex, 0);

        //gl.drawArrays(gl.TRIANGLES, 0, v_count);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, map_index_buffer);
        gl.drawElements(gl.TRIANGLES, v_count, gl.UNSIGNED_SHORT, 0);
    }
}

function mouse_move(e) {
    var factor_y = $('#invert-mouse-y').prop('checked') ? -0.01 : 0.01;
    var factor_x = $('#invert-mouse-x').prop('checked') ? -0.01 : 0.01;
    e = e.originalEvent;
    if (!!document.mozPointerLockElement) {
        camera.ry += e.mozMovementX * factor_x;
        camera.rx += e.mozMovementY * factor_y;
    } else if (!!document.webkitPointerLockElement) {
        camera.ry += e.webkitMovementX * factor_x;
        camera.rx += e.webkitMovementY * factor_y;
    }
}

function key_down(e) {
    var prevent = true;
    if (e.which === 38) {
        move_keys.forward = true;
    } else if (e.which === 40) {
        move_keys.backward = true;
    } else if (e.which === 37) {
        move_keys.left = true;
    } else if (e.which === 39) {
        move_keys.right = true;
    } else if (e.which === 33) {
        move_keys.up = true;
    } else if (e.which === 34) {
        move_keys.down = true;
    } else {
        prevent = false;
    }
    if (prevent) {
        e.preventDefault();
    }
}

function key_up(e) {
    var prevent = true;
    if (e.which === 38) {
        move_keys.forward = false;
    } else if (e.which === 40) {
        move_keys.backward = false;
    } else if (e.which === 37) {
        move_keys.left = false;
    } else if (e.which === 39) {
        move_keys.right = false;
    } else if (e.which === 33) {
        move_keys.up = false;
    } else if (e.which === 34) {
        move_keys.down = false;
    } else {
        prevent = false;
    }
    if (prevent) {
        e.preventDefault();
    }
}

function lock_pointer() {
    //console.log('lock it!');
    var canvas = $("#canvas")[0];
    $(document).on('mozfullscreenchange', fullscreenChange);
    $(document).on('webkitfullscreenchange', fullscreenChange);
    $(document).mousemove(mouse_move);
    $(document).keydown(key_down);
    $(document).keyup(key_up);

    canvas.requestFullscreen =
        canvas.requestFullscreen ||
        canvas.mozRequestFullscreen ||
        canvas.mozRequestFullScreen ||
        canvas.webkitRequestFullScreen;
    canvas.requestFullscreen();
}

function fullscreenChange() {
    var new_width;
    var new_height;
    var canvas = $("#canvas");
    if (document.mozFullScreen) {
        new_width = $(canvas).width();
        new_height = $(canvas).height();
    } else if (document.webkitIsFullScreen) {
        new_width = $(window).width();
        new_height = $(window).height();
    } else {
        new_width = 640;
        new_height = 480;
    }
    canvas[0].width = new_width;
    canvas[0].height = new_height;
    gl.viewportWidth  = new_width;
    gl.viewportHeight = new_height;
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    //console.log("Fullscreen: " + new_width+ ", " + new_height);
    if (document.mozFullScreen) {
        canvas[0].mozRequestPointerLock();
    } else if (document.webkitIsFullScreen) {
        canvas[0].webkitRequestPointerLock();
    }
}

function pointerlockChange() {
    //console.log('pointerlock change');
}

var rand_map = null;

function rand_field(x, y) {
    var w = 10;
    var h = 10;
    if (!rand_map) {
        rand_map = [];
        for(var iy=0; iy<h; iy++) {
            var row = [];
            for(var ix=0; ix<w; ix++) {
                row.push(Math.random());
            }
            row.push(row[0]);
            rand_map.push(row);
        }
        rand_map.push(rand_map[0]);
    }
    x = x / w; y = y / h;
    x = (x - Math.floor(x)) * w;
    y = (y - Math.floor(y)) * h;
    var x1 = Math.floor(x);
    var x2 = x1 + 1;
    var xd = x - x1;
    var y1 = Math.floor(y);
    var y2 = y1 + 1;
    var yd = y - y1;

    // smoothing with "cubic spline"
    xd = 3 * xd * xd - 2 * xd * xd * xd;
    yd = 3 * yd * yd - 2 * yd * yd * yd;

    //console.log(x1, y1, x2, y2);
    var z1 = rand_map[x1][y1];
    var z2 = rand_map[x2][y1];
    var z3 = rand_map[x1][y2];
    var z4 = rand_map[x2][y2];

    var z = (1-xd)*(1-yd)*z1 + (xd)*(1-yd)*z2 + (1-xd)*(yd)*z3 + (xd)*(yd)*z4;

    return z;
    //return Math.random();
}

function map_height_at(x, y) {
    if (x <= 0.0 || y <= 0.0 || x >= map_x || y >= map_y) {
        return 0.0; // sea level
    }
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var x1 = x0 + 1;
    var y1 = y0 + 1;
    var dx = x - x0;
    var dy = y - y0;
    return (1-dx)*(1-dy)*map_heights[x0 + (map_x+1) * y0] +
        (dx)*(1-dy)*map_heights[x1 + (map_x+1) * y0] +
        (1-dx)*(dy)*map_heights[x0 + (map_x+1) * y1] +
        (dx)*(dy)*map_heights[x1 + (map_x+1) * y1];
}
