// Request animation frame
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
            || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

var simplex = new NOISE.Simplex();
simplex.init();
simplex.noiseDetail(4, 2);

var canvas = document.createElement('canvas');
canvas.setAttribute('width', '520');
canvas.setAttribute('height', '320');
canvas.setAttribute('id', 'canvas');
var canvasWidth = canvas.width = canvas.getAttribute('width');
var canvasHeight = canvas.height = canvas.getAttribute('height');
var mainContext = document.getElementsByClassName('context')[0];
canvas.style.width = mainContext.offsetWidth - 20 + 'px';
canvas.style.height = mainContext.offsetHeight - 20 + 'px';

mainContext.appendChild(canvas);
var ctx = canvas.getContext('2d');

var perlinMap = document.createElement('canvas');
var ctxPerlin = perlinMap.getContext('2d');
perlinMap.setAttribute('width', '64');
perlinMap.setAttribute('height', '64');
perlinMap.setAttribute('id', 'perlin-map');

ctx.scale(2,2);
var cx = 0, 
    cy = 0, 
    lastX = 0, 
    lastY = 0,
    dx = 0, 
    dy = 0;

var valx = 1, valy = 1;
var curx = 0, cury = 0;
var mouseDown = false;

var ww = hh = 64;
var image = ctx.createImageData(canvasWidth, canvasHeight);
var noisemap = ctx.createImageData(ww, hh);
var pixels = image.data;
var noise = noisemap.data;

var w = canvas.width;
var h = canvas.height;

var map = new Array();
var texmap = new Array();

var fTime = 0, fDeltaT = 0, fLastTime = 0;

if (!this.millis) {
    var millis = function() {
        return new Date().getTime();
    };
}

function getScrollX() {
    return window.pageXOffset || window.document.documentElement.scrollLeft;
}

function getScrollY() {
    return window.pageYOffset || window.document.documentElement.scrollTop;
}

function getMousePos(event) {    
    event.preventDefault();
    dx = event.pageX - (getScrollX() + canvas.getBoundingClientRect().left);
    dy = event.pageY - (getScrollY() + canvas.getBoundingClientRect().top) ;        
    lastX = event.pageX - (getScrollX() + canvas.getBoundingClientRect().left) - cx;
    lastY = event.pageY - (getScrollY() + canvas.getBoundingClientRect().top) - cy;    

    return {
        x: lastX,
        y: lastY
    }    
}

function getTouchPos(event) {    
    event.preventDefault();
    dx = event.changedTouches[0].pageX - (getScrollX() + canvas.getBoundingClientRect().left) - lastX;
    dy = event.changedTouches[0].pageY - (getScrollY() + canvas.getBoundingClientRect().top) - lastY;    
    lastX = event.changedTouches[0].pageX - (getScrollX() + canvas.getBoundingClientRect().left);
    lastY = event.changedTouches[0].pageY - (getScrollY() + canvas.getBoundingClientRect().top);        

    lastX = lastX > 0 ? (lastX < canvas.width ? lastX : canvas.width) : 0;
    lastY = lastY > 0 ? (lastY < canvas.height ? lastY : canvas.height) : 0;        

    return {
        x: lastX,
        y: lastY
    }    
}

window.addEventListener('resize', function() {        
    var canvasWidth = window.getComputedStyle(canvas, null).getPropertyValue('width');
    var canvasHeight = window.getComputedStyle(canvas, null).getPropertyValue('height');
    canvasWidth = parseInt(canvasWidth.substring(-2));
    canvasHeight = parseInt(canvasHeight.substring(-2));  
     
});

canvas.addEventListener('mousemove', onMouseMove);

canvas.addEventListener('mousedown', function(event) {    
    event.preventDefault();
    cx = event.pageX - (getScrollX() + canvas.getBoundingClientRect().left) - lastX;
    cy = event.pageY - (getScrollY() + canvas.getBoundingClientRect().top) - lastY;    
    mouseDown = true;    
});

canvas.addEventListener('mouseup', function(event) {
    event.preventDefault();
    mouseDown = false;
});


// Mobile devices touch events
canvas.addEventListener('touchstart', function(event) {    
    event.preventDefault();    
    cx = event.changedTouches[0].pageX - (getScrollX() + canvas.getBoundingClientRect().left) - lastX;
    cy = event.changedTouches[0].pageY - (getScrollY() + canvas.getBoundingClientRect().top) - lastY;            
    mouseDown = true;      
});

canvas.addEventListener('touchmove', onTouchMove);

canvas.addEventListener('touchend', function(event) {    
    event.preventDefault();
    mouseDown = false;
});

function onMouseMove(e) {
    if (getMousePos(e).y <= 40) return;

    if (mouseDown) {                        
        valx = getMousePos(e).x * 0.01; 
        valy = getMousePos(e).y * 0.02;        
    } else {
        if (dx == undefined) return;        
    }    

    document.documentElement.addEventListener('mouseup', function(e){
        mouseDown = false;        
    });
}

function onTouchMove(e) {
    if (getTouchPos(e).y <= 40) return;

    if (mouseDown) {                        
        valx = getTouchPos(e).x * 0.01; 
        valy = getTouchPos(e).y * 0.02;          
    } else {
        if (dx == undefined) return;        
    }

    document.documentElement.addEventListener('touchend', function(e){
        mouseDown = false;        
    });
}

function initTexMap() {
    for ( var i = 1; i < 16; i++) {
        var br = 255 - ((Math.random() * 96) | 0);
        for ( var y = 0; y < 16 * 3; y++) {
            for ( var x = 0; x < 16; x++) {
                var color = 0x966C4A;
                if (i == 4)
                    color = 0x7F7F7F;
                if (i != 4 || ((Math.random() * 3) | 0) === 0) {
                    br = 255 - ((Math.random() * 96) | 0);
                }
                if ((i == 1 && y < (((x * x * 3 + x * 81) >> 2) & 3) + 18)) {
                    color = 0x6AAA40;
                } else if ((i == 1 && y < (((x * x * 3 + x * 81) >> 2) & 3) + 19)) {
                    br = br * 2 / 3;
                }
                if (i == 7) {
                    color = 0x675231;
                    if (x > 0 && x < 15
                            && ((y > 0 && y < 15) || (y > 32 && y < 47))) {
                        color = 0xBC9862;
                        var xd = (x - 7);
                        var yd = ((y & 15) - 7);
                        if (xd < 0)
                            xd = 1 - xd;
                        if (yd < 0)
                            yd = 1 - yd;
                        if (yd > xd)
                            xd = yd;

                        br = 196 - ((Math.random() * 32) | 0) + xd % 3 * 32;
                    } else if (((Math.random() * 2) | 0) === 0) {
                        br = br * (150 - (x & 1) * 100) / 100;
                    }
                }

                if (i == 5) {
                    color = 0xB53A15;
                    if ((x + (y >> 2) * 4) % 8 === 0 || y % 4 === 0) {
                        color = 0xBCAFA5;
                    }
                }
                if (i == 9) {
                    color = 0x4040ff;
                }
                var brr = br;
                if (y >= 32)
                    brr /= 2;

                if (i == 8) {
                    color = 0x50D937;
                    if (((Math.random() * 2) | 0) === 0) {
                        color = 0;
                        brr = 255;
                    }
                }                

                var col = (((color >> 16) & 0xff) * brr / 255) << 16
                        | (((color >> 8) & 0xff) * brr / 255) << 8
                        | (((color) & 0xff) * brr / 255);
                texmap[x + y * 16 + i * 256 * 3] = col;
            }
        }
    }
}

function initMap() {
    curx = (getScrollX() + canvas.getBoundingClientRect().left) + window.innerHeight >> 1;
    cury = (getScrollY() + canvas.getBoundingClientRect().top) + window.innerHeight >> 1;

    for ( var i = 0; i < w * h; i++) {
        pixels[i * 4 + 3] = 255;
    }

    for (var pixel = 0; pixel < noise.length; pixel += 4) {
        var x = (pixel / 4) % ww;
        var y = Math.floor(pixel / hh / 4);
        x /= ww;
        y /= hh; // normalize
        
        var size = GUI.frequency || 2;  // pick a scaling value
        // add octaves
        var value = Math.floor(
                (simplex.noise(size * x * GUI.x, size * y * GUI.y, 0.1 + GUI.z) +
                 simplex.noise(2 * size * x * GUI.x, 2 * size * y * GUI.y, 0.1 + GUI.z) * 0.5)
            * 177);        
        noise[pixel] = noise[pixel + 1] = noise[pixel + 2] = value;
        noise[pixel + 3] = 255;
    }    

    noisemap.data = noise;

    for (var z = 0; z < 64; z++) {        

        ctxPerlin.putImageData(noisemap, z * 0.18, z);

        for (var x = 0; x < 64; x++) {
            for (var y = 0; y < 64; y++) {            

                var i = z << 12 | y << 6 | x;
                var yd = (y - 32.5) * 0.4;
                var zd = (z - 32.5) * 0.4;
                map[i] = 2 + (Math.random() * (8 - 2)) | 0;
                
                var pixel = ctxPerlin.getImageData(x, y, 1, 1).data[0];
                
                if (Math.random() > Math.sqrt(Math.sqrt(yd * yd + zd * zd)) - 0.8 || 
                    (pixel & 0xff) * 0.8 < (64 - y) << 2) {

                    map[i] = 0;   
                } 

                if (map[i] == 0 && y > 40)
                    map[i] = 9;
                else if (map[i] != 0) {
                    var j = z << 12 | (y-1) << 6 | x;
                    if (map[j] == 0) {
                        map[i] = 1;
                    } else {
                        j = z << 12 | (y-2) << 6 | x;
                        if (map[j] == 0)
                            map[i] = 2;                            
                    }
                } 
            }
        }
    }
}

function renderMinecraft() {    
    curx += (valx - curx) * 0.2;
    cury += (valy - cury) * 0.2;

    var speed = 25000;
    var xRot = Math.sin(Date.now() % speed / speed * Math.PI * 2) * (curx * 0.4) + Math.PI / 2;    
    var yRot = Math.cos(Date.now() % speed / speed * Math.PI * 2) * (cury * 0.06) - Math.PI / 6 ;
    var yCos = Math.cos(yRot);
    var ySin = Math.sin(yRot);
    var xCos = Math.cos(xRot);
    var xSin = Math.sin(xRot);
    
    var ox = 32.5 + Date.now() % speed / speed * 128;
    var oy = 32.5 + (cury * 0.4);
    var oz = 32.5;

    
    for ( var x = 0; x < w; x++) {
        var ___xd = (x - w / 2) / h;
        for ( var y = 0; y < h; y++) {
            var __yd = (y - h / 2) / h;
            var __zd = 1;

            var ___zd = __zd * yCos + __yd * ySin;
            var _yd = __yd * yCos - __zd * ySin;

            var _xd = ___xd * xCos + ___zd * xSin;
            var _zd = ___zd * xCos - ___xd * xSin;

            var col = 0;
            var br = 255;
            var ddist = 0;

            var closest = 48;
            for ( var d = 0; d < 3; d++) {
                var dimLength = _xd;
                if (d == 1)
                    dimLength = _yd;
                if (d == 2)
                    dimLength = _zd;

                var ll = 1 / (dimLength < 0 ? -dimLength : dimLength);
                var xd = (_xd) * ll;
                var yd = (_yd) * ll;
                var zd = (_zd) * ll;

                var initial = ox - (ox | 0);
                if (d == 1)
                    initial = oy - (oy | 0);
                if (d == 2)
                    initial = oz - (oz | 0);
                if (dimLength > 0)
                    initial = 1 - initial;

                var dist = ll * initial;

                var xp = ox + xd * initial;
                var yp = oy + yd * initial;
                var zp = oz + zd * initial;

                if (dimLength < 0) {
                    if (d === 0)
                        xp--;
                    if (d === 1)
                        yp--;
                    if (d === 2)
                        zp--;
                }

                while (dist < closest) {
                    var tex = map[(zp & 127) << 12 | (yp & 63) << 6 | (xp & 63)];

                    if (tex > 0) {
                        var u = ((xp + zp) * 16) & 15;
                        var v = ((yp * 16) & 15) + 16;
                        if (d == 1) {
                            u = (xp * 16) & 15;
                            v = ((zp * 16) & 15);
                            if (yd < 0)
                                v += 48;
                        }

                        var cc = texmap[u + v * 16 + tex * 256 * 3];
                        if (cc > 0) {
                            col = cc;
                            ddist = 255 - ((dist / 48 * 255) | 0);
                            br = 255 * (255 - ((d + 2) % 3) * 50) / 255;
                            closest = dist;

                            if (d == 1) {
                                var maxsh = 0.4;
                                var shcorner = 12;
                                tex = map[((zp-1) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp-1) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (u+v)/shcorner));
                                tex = map[((zp+1) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp-1) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (u+16-v)/shcorner));
                                tex = map[((zp-1) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp+1) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (16-u+v)/shcorner));
                                tex = map[((zp+1) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp+1) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (16-u+16-v)/shcorner));  
                                
                                var sh = 5;
                                tex = map[((zp) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp-1) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (u)/sh));
                                tex = map[((zp) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp+1) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (16-u)/sh));
                                tex = map[((zp-1) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (v)/sh));
                                tex = map[((zp+1) & 127) << 12 | ((yp-1) & 63) << 6 | ((xp) & 63)];
                                if (tex>0)
                                    br *= Math.max(maxsh, Math.min(1.0, (16-v)/sh));
                                
                                br = Math.max(br, 120);
                                //br = 255;                              
                            }
                            if (d == 1) { 
                                //yp-=2;                                                         
                                tex = map[(zp & 127) << 12 | ((yp-2) & 63) << 6 | (xp & 63)];
                                if (tex > 0) {                                    
                                    br *= 0.5;
                                }
                                else {                                
                                    tex = map[(zp & 127) << 12 | ((yp-3) & 63) << 6 | (xp & 63)];
                                    if (tex > 0)
                                        br *= 0.7;                                   
                               }
                            }
                        }
                    }
                    xp += xd;
                    yp += yd;
                    zp += zd;
                    dist += ll;
                }
            }

            var r = ((col >> 16) & 0xff) * br * ddist / (255 * 255);
            var g = ((col >> 8) & 0xff) * br * ddist / (255 * 255);
            var b = ((col) & 0xff) * br * ddist / (255 * 255);

            if(ddist <= 175) r += 175-ddist;
            if(ddist <= 255) g += 255-ddist;
            if(ddist <= 245) b += 245-ddist;  

            pixels[(x + y * w) * 4 + 0] = r;
            pixels[(x + y * w) * 4 + 1] = g;
            pixels[(x + y * w) * 4 + 2] = b;
        }
    }
}

// Initialize GUI values
var GUI = new function() {        
    this.frequency = 0.33;
    this.x = 0.64;
    this.y = 0.64;
    this.z = 0.63;

  return this;
}  

function init() {
    initMap();     
    ctxPerlin.putImageData(noisemap, 0, 0);

    var gui = new dat.GUI({autoPlace:false, width: 270, align: "left"});

    var datGUI = document.getElementById('gui');
    datGUI.appendChild(gui.domElement);
    datGUI.appendChild(perlinMap);
    var gs = gui.addFolder('General settings');
    gs.open();
    gs.add(GUI, 'x', 0.1, 1.8).name('x')
        .onChange(function() {
            initMap();
            ctxPerlin.putImageData(noisemap, 0, 0);
        });
    gs.add(GUI, 'y', 0.1, 1.8).name('y')
        .onChange(function() {
            initMap();
            ctxPerlin.putImageData(noisemap, 0, 0);
        });
    gs.add(GUI, 'z', 0, 2.5).name('z')
        .onChange(function() {
            initMap();
            ctxPerlin.putImageData(noisemap, 0, 0);
        });
    gs.add(GUI, 'frequency', 0.1, 2).name('frequency')
        .onChange(function() {
            initMap();
            ctxPerlin.putImageData(noisemap, 0, 0);
        });    
}

init();
render();
initTexMap();

function render() {
    var id = requestAnimationFrame(render);    
        
    renderMinecraft();
    ctx.putImageData(image, 0, 0);
};