var gl;
var shader_v;
var shader_f;
var shader_program;
var clear_color = 0.4;
var p_mat;
var mv_mat;

var map_position_buffer;
var map_color_buffer;
var map_index_buffer;
var v_count = 0;

var map_x = 50;
var map_y = 50;

var camera = {
    rx: 0.1,
    ry: 0.0,
    x:  map_x / 2.0,
    y:  map_y / 2.0,
    z:  1.0,
};

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
    shader_program.v_col = gl.getAttribLocation(shader_program, "Color");
    gl.enableVertexAttribArray(shader_program.v_pos);
    gl.enableVertexAttribArray(shader_program.v_col);
    shader_program.p_mat = gl.getUniformLocation(shader_program, "P");
    shader_program.mv_mat = gl.getUniformLocation(shader_program, "MV");

    map_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, map_position_buffer);
    var v = [ ];
    // remember: need one more, for the edges
    for (var y=0; y<=map_y; y++) {
        for (var x=0; x<=map_x; x++) {
            v.push(x,   (x+y)%3 * 0.1, y);
        }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);

    map_color_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, map_color_buffer);
    var vc = [ ];
    // remember: need one more, for the edges
    for (var y=0; y<=map_y; y++) {
        for (var x=0; x<=map_x; x++) {
            vc.push((x%2)/2.0, (x+y)%4/4.0, (y%3)/3.0, 1.0);
        }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vc), gl.STATIC_DRAW);

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

    //window.mozRequestAnimationFrame(draw);
}

function draw() {
    window.requestAnimFrame(draw);
    gl.clearColor(0.0, 0.6, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!shader_program) {
        return;
    }

    mat4.perspective(p_mat, 45, gl.viewportWidth / gl.viewportHeight, 0.01, 100.0);
    mat4.identity(mv_mat);
    mat4.rotateX(mv_mat, mv_mat, camera.rx);
    mat4.rotateY(mv_mat, mv_mat, camera.ry);
    //camera.ry += 0.01;
    //if (camera.ry > 3.1415 * 2.0 ) {
    //    camera.ry = 0.0;
    //}
    mat4.translate(mv_mat, mv_mat, [-camera.x , -camera.z, -camera.y]);

    gl.bindBuffer(gl.ARRAY_BUFFER, map_position_buffer);
    gl.vertexAttribPointer(shader_program.v_pos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, map_color_buffer);
    gl.vertexAttribPointer(shader_program.v_col, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, map_index_buffer);
    gl.uniformMatrix4fv(shader_program.p_mat, false, p_mat);
    gl.uniformMatrix4fv(shader_program.mv_mat, false, mv_mat);
    //gl.drawArrays(gl.TRIANGLES, 0, v_count);
    gl.drawElements(gl.TRIANGLES, v_count, gl.UNSIGNED_SHORT, 0);
}

function lock_pointer() {
    //console.log('lock it!');
    var canvas = $("#canvas")[0];
    document.addEventListener('mozfullscreenchange', fullscreenChange, false);
    document.addEventListener('webkitfullscreenchange', fullscreenChange, false);
    document.addEventListener('mousemove', function(e) {
        var factor_y = $('#invert-mouse-y').prop('checked') ? -0.01 : 0.01;
        var factor_x = $('#invert-mouse-x').prop('checked') ? -0.01 : 0.01;
        if (!!document.mozPointerLockElement) {
            camera.ry += e.mozMovementX * factor_x;
            camera.rx += e.mozMovementY * factor_y;
        } else if (!!document.webkitPointerLockElement) {
            camera.ry += e.webkitMovementX * factor_x;
            camera.rx += e.webkitMovementY * factor_y;
        }
    });

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
    console.log("Fullscreen: " + new_width+ ", " + new_height);
    if (document.mozFullScreen) {
        canvas[0].mozRequestPointerLock();
    } else if (document.webkitIsFullScreen) {
        canvas[0].webkitRequestPointerLock();
    }
}

function pointerlockChange() {
    console.log('pointerlock change');
}

