var NOISE = NOISE || { };

NOISE.Simplex = (function() {
    var iOctaves = 1,
        fPersistence = 0.5,
        fResult, fFreq, fPers,
        aOctFreq, // frequency per octave
        aOctPers, // persistance per octave
        fPersMax; // 1 / max persistence

    var octaveFreq = function() {
        var fFreq, fPers;
        aOctFreq = new Array();
        aOctPers = new Array();
        fPersMax = 0;

        for (var i=0; i < iOctaves; i++) {
            fFreq = Math.pow(2,i);
            fPers = Math.pow(fPersistence, i);
            fPersMax += fPers;
            aOctFreq.push(fFreq);
            aOctPers.push(fPers);
        }

        fPersMax = 1 / fPersMax;
    }

    // Skewing and unskewing factors for 2, 3, and 4 dimensions
    var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    var F3 = 1.0 / 3.0;
    var G3 = 1.0 / 6.0;
    var F4 = (Math.sqrt(5.0) - 1.0) / 4.0;
    var G4 = (5.0 - Math.sqrt(5.0) / 20.0);

    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);

    var p = new Uint8Array(256);
    var p = new Uint8Array([
        151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ]);
    

    // Prepopulate the permutation table with values from lookup table
    // To remove the need for index wrapping, double the permutation table length
    var grad3 = new Float32Array([
        1,1,0, -1,1,0, 1,-1,0, -1,-1,0,
        1,0,1, -1,0,1, 1,0,-1, -1,0,-1,
        0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1
    ]);

    var grad4 = new Float32Array([
        0,1,1,1, 0,1,1,-1, 0,1,-1,1, 0,1,-1,-1,
        1,0,1,1, 1,0,1,-1, 1,0,-1,1, 1,0,-1,-1,
        -1,0,1,1, -1,0,1,-1, -1,0,-1,1, -1,0,-1,-1,
        1,1,0,1, 1,1,0,-1, 1,-1,0,1, 1,-1,0,-1,
        -1,1,0,1, -1,1,0,-1, -1,-1,0,1, -1,-1,0,-1,
        1,1,1,0, 1,1,-1,0, 1,-1,1,0, 1,-1,-1,0,
        -1,1,1,0, -1,1,-1,0, -1,-1,1,0, -1,-1,-1,0
    ]);


    // Seeded random number generator
    function seed(x) {
        x = (x<<13) ^ x;
        return ( 1.0 - ( (x * (x * x * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
    }    

    function init() {
        for (var i = 0; i < 256; i++) {
            p[i] = Math.abs(~~(seed(i) * 256));
        }

        // To remove the need for index wrapping, double the permutation table length 
        for (var i=0; i < 512; i++) {
            perm[i] = p[i & 255];
            permMod12[i] = perm[i] % 12;
        }
    }    

    /*
     ** 2D Simplex Noise
     */
    function noise2D (xin, yin) {

        var n0, n1, n2, i1, j1;

        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2;
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);

        var t = (i + j) * G2; // Simple skew factor for 2D
        // Unskew the cell origin back to (x, y) space
        var X0 = i - t;
        var Y0 = j - t;
        // The x,y distances from the cell origin
        var x0 = xin - X0;
        var y0 = yin - Y0;

        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        if (x0 > y0) { i1 = 1; j1 = 0} // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else {i1 = 0; j1 = 1}	// upper triangle, YX order: (0,0)->(0,1)->(1,1)

        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6

        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1.0 + 2.0 * G2;

        // Work out the hashed gradient indices of the three simplex corners
        var ii = i & 255;
        var jj = j & 255;

        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0*x0 - y0*y0;
        if(t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii+perm[jj]];
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0+1] * y0);
        }

        var t1 = 0.5 - x1*x1 - y1*y1;
        if (t1 < 0 ) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj+j1]];
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1+1] * y1);
        }

        var t2 = 0.5 - x2*x2 - y2*y2;
        if (t2 < 0 ) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + 1 + perm[jj+1]];
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2+1] * y2);
        }

        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    }

    /*
     ** 3D Simplex Noise
     */

    function noise3D (xin, yin, zin) {
        // Noise contribution from the four corners
        var n0, n1, n2, n3;

        // Skew the input space to determine which simplex cell we are in
        var s = (xin+yin+zin) * F3; // Simple skew factor for 3D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var X0 = i - t;
        var Y0 = j - t;
        var Z0 = k - t;

        // The x, y, z distances from the cell origin
        var x0 = xin - X0;
        var y0 = yin - Y0;
        var z0 = zin - Z0;

        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1,
            i2, j2, k2;

        if (x0 >= y0) {
            if (y0 >= z0) {
                i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; // XYZ order
            } else if (x0 >= z0) {
                i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; // XZY order
            } else {
                i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; // ZXY order
            }
        } else {// x0<y0
            if (y0 < z0) {
                i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; // ZYX order
            } else if (x0 < z0) {
                i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; // YZX order
            } else {
                i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; // YXZ order
            }
        }

        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.

        var x1 = x0 - i1 + G3;
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;

        var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
        var y2 = y0 - j2 + 2.0 * G3;
        var z2 = z0 - k2 + 2.0 * G3;

        var x3 = x0 - 1.0 + 3.0 * G3;
        var y3 = y0 - 1.0 + 3.0 * G3;
        var z3 = z0 - 1.0 + 3.0 * G3;

        // Work out the hashed gradient indices of the four simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;

        var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            var gi0 = permMod12[ii+perm[jj+perm[kk]]];
            n0 = t0 * t0 * (grad3[gi0]*x0 + grad3[gi0+1]*y0 + grad3[gi0+2]*z0);
        }
        var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            var gi1 = permMod12[ii+i1+perm[jj+j1+perm[kk+k1]]];
            n1 = t1 * t1 * (grad3[gi1]*x1 + grad3[gi1+1]*y1 + grad3[gi1+2]*z1);
        }
        var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            var gi2 = permMod12[ii+i2+perm[jj+j2+perm[kk+k2]]];
            n2 = t2 * t2 * (grad3[gi2]*x2 + grad3[gi2+1]*y2 + grad3[gi2+2]*z2);
        }
        var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
        if (t3 < 0) n3 = 0.0;
        else {
            t3 *= t3;
            var gi3 = permMod12[ii+1+perm[jj+1+perm[kk+1]]];
            n3 = t3 * t3 * (grad3[gi3]*x3 + grad3[gi3+1]*y3 + grad3[gi3+2]*z3);
        }

        // Add contributions from each corner to get the final noise value.
        // The result is scaled to stay just inside [-1,1]
        return 32.0 * (n0 + n1 + n2 + n3);
    }

    function noise4D (x, y, z, w) {
        // Noise contributions from the five corners
        var n0, n1, n2, n3, n4;

        var s = (x + y + z + w) * F4; // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var k = Math.floor(z + s);
        var l = Math.floor(w + s);

        var t = (i + j + k + l) * G4; // Factor for 4D unskewing
        var X0 = i - t;
        var Y0 = j - t;
        var Z0 = z - t;
        var W0 = w - t;

        // The x, y, z, w distances from the cell origin
        var x0 = x - X0;
        var y0 = y - Y0;
        var z0 = z - Z0;
        var w0 = w - W0;

        // For the 4D case, the simplex is a 4D shape I won't even try to describe.
        // To find out which of the 24 possible simplices we're in, we need to
        // determine the magnitude ordering of x0, y0, z0 and w0.
        // Six pair-wise comparisons are performed between each possible pair
        // of the four coordinates, and the results are used to rank the numbers.
        var rankx = 0,
            ranky = 0,
            rankz = 0,
            rankw = 0;

        if (x0 > y0) rankx++; else ranky++;
        if (x0 > z0) rankx++; else rankz++;
        if (x0 > w0) rankx++; else rankw++;
        if (y0 > z0) ranky++; else rankz++;
        if (y0 > w0) ranky++; else rankw++;
        if (z0 > w0) rankz++; else rankw++;

        var i1, j1, k1, l1; // The integer offsets for the second simplex corner
        var i2, j2, k2, l2; // The integer offsets for the third simplex corner
        var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner

        // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
        // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
        // impossible. Only the 24 indices which have non-zero entries make any sense.
        // We use a thresholding to set the coordinates in turn from the largest magnitude.

        // Rank 3 denotes the largest coordinate.
        i1 = rankx >= 3 ? 1 : 0;
        j1 = ranky >= 3 ? 1 : 0;
        k1 = rankz >= 3 ? 1 : 0;
        l1 = rankw >= 3 ? 1 : 0;

        // Rank 2 denotes the second largest coordinate.
        i2 = rankx >= 2 ? 1 : 0;
        j2 = ranky >= 2 ? 1 : 0;
        k2 = rankz >= 2 ? 1 : 0;
        l2 = rankw >= 2 ? 1 : 0;
        // Rank 1 denotes the second smallest coordinate.
        i3 = rankx >= 1 ? 1 : 0;
        j3 = ranky >= 1 ? 1 : 0;
        k3 = rankz >= 1 ? 1 : 0;
        l3 = rankw >= 1 ? 1 : 0;

        // The fifth corner has all coordinate offsets = 1, so no need to compute that.
        var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
        var y1 = y0 - j1 + G4;
        var z1 = z0 - k1 + G4;
        var w1 = w0 - l1 + G4;

        var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
        var y2 = y0 - j2 + 2.0 * G4;
        var z2 = z0 - k2 + 2.0 * G4;
        var w2 = w0 - l2 + 2.0 * G4;

        var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
        var y3 = y0 - j3 + 3.0 * G4;
        var z3 = z0 - k3 + 3.0 * G4;
        var w3 = w0 - l3 + 3.0 * G4;

        var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for the last corner in (x,y,z,w) coords
        var y4 = y0 - 1.0 + 4.0 * G4;
        var z4 = z0 - 1.0 + 4.0 * G4;
        var w4 = w0 - 1.0 + 4.0 * G4;

        // Work out the hashed gradient indices of the five simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        var ll = l & 255;

        var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0 - w0*w0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            var gi0 = perm[ii+perm[jj+perm[kk+perm[ll]]]] % 32;
            n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0] * y0 + grad4[gi0] * z0 + grad4[gi0] * w0);
        }

        var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1 - w1*w1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            var gi1 = perm[ii+i1+perm[jj+j1+perm[kk+k1+perm[ll+l1]]]] % 32;
            n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1] * y1 + grad4[gi1] * z1 + grad4[gi1] * w1);
        }

        var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2 - w2*w2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            var gi2 = perm[ii+i2+perm[jj+j2+perm[kk+k2+perm[ll+l2]]]] % 32;
            n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2] * y2 + grad4[gi2] * z2 + grad4[gi2] * w2);
        }

        var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3 - w3*w3;
        if (t3 < 0) n3 = 0.0;
        else {
            t3 *= t3;
            var gi3 = perm[ii+i3+perm[jj+j3+perm[kk+k3+perm[ll+l3]]]] % 32;
            n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3] * y3 + grad4[gi3] * z3 + grad4[gi3] * w3);
        }

        var t4 = 0.6 - x4*x4 - y4*y4 - z4*z4 - w4*w4;
        if (t4 < 0) n4 = 0.0;
        else {
            t4 *= t4;
            var gi4 = perm[ii+1+perm[jj+1+perm[kk+1+perm[ll+1]]]] % 32;
            n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4] * y4 + grad4[gi4] * z4 + grad4[gi4] * w4);
        }

        return 27.0 * (n0 + n1 + n2 + n3 + n4);
    };

    function SimplexNoise(){}

    SimplexNoise.prototype = {
        init : init,
        
        noise : function(x, y, z, w) {
            fResult = 0;

            for (var i=0; i < iOctaves; i++) {
                fFreq = aOctFreq[i];
                fPers = aOctPers[i];

                switch(arguments.length) {
                    case 4 : fResult += fPers * noise4D(fFreq*x, fFreq*y, fFreq*z, fFreq*w);
                        break;
                    case 3 : fResult += fPers * noise3D(fFreq*x, fFreq*y, fFreq*z);
                        break;
                    default : fResult += fPers * noise2D(fFreq*x, fFreq*y);
                }
            }

            return (fResult * fPersMax + 1) * 0.5;
        },

        noiseDetail : function(octaves, persistance) {
            iOctaves = octaves || iOctaves;
            fPersistence = persistance || fPersistence;
            octaveFreq();
        }
    }

    return SimplexNoise;

}).call(this);