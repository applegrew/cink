/**
* @preserve
* CInk
* Version: 2.0
* GPL v3 License
* Author: AppleGrew
* Website: http://cink.applegrew.com
* License Details:-
*   CInk - Pure Javascript CFDG renderer.
*   Copyright (C) 2011 Nirupam Biswas
*
*   This program is free software: you can redistribute it and/or modify
*   it under the terms of the GNU General Public License as published by
*   the Free Software Foundation, either version 3 of the License, or
*   (at your option) any later version.
*
*   This program is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*   GNU General Public License for more details.
*
*   You should have received a copy of the GNU General Public License
*   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
(function (jQ) {
    //==============
    //Util Functions
    //==============
    function isNotDefined(v) {
        return v === null || typeof v === 'undefined';
    }
    function d2r(d) { return d * (Math.PI / 180); }
    function sqr(n) { return n * n; }
    // 3x3 Matrix. This is the identity affine transformation.
    function IDENTITY_TRANSFORM() {
        return [ [1, 0, 0],
                 [0, 1, 0],
                 [0, 0, 1] ];
    }
    // 3x1 Matrix. This is the identity affine transformation.
    function IDENTITY_TRANSFORM3x1() {
        return [ [0],
                 [0],
                 [1] ];
    }
    function toAffineTransformation(a, b, x, c, d, y) {
        return [[a, b, x],
                [c, d, y],
                [0, 0, 1]];
    }
    // Composes two transformations (i.e., by multiplying them).
    function compose(m1, m2) {
        var result = IDENTITY_TRANSFORM(), M, N, x, y, z, sum;
        M = m1.length;
        N = m2[0].length;
        if (N === 1) {
            result = IDENTITY_TRANSFORM3x1();
        }
        for (x = 0; x < M; x += 1) {
            for (y = 0; y < N; y += 1) {
                sum = 0;
                
                for (z = 0; z < M; z += 1) { //Assuming m1 is MxM and m2 is MxN
                    sum += m1[x][z] * m2[z][y];
                }
                
                result[x][y] = sum;
            }
        }
        return result; //This will have MxN dimension.
    }
    //Comapres two matrices and returns true if they have
    //same value. decimalFactor is the number of decimals
    //to consider for comparing float values. So, a value
    //of 2 will consider 2 decimal places.
    function areSameMat(mat1, mat2, decimalFactor) {
        var i, j;
        decimalFactor = decimalFactor * 10;
        for (i = 0; i < mat1.length; i += 1) {
            for (j = 0; j < mat1.length; j += 1) {
                if (Math.round(mat1[i][j] * decimalFactor) !== Math.round(mat2[i][j] * decimalFactor)) {
                    return false;
                }
            }
        }
        return true;
    }
    // hue, saturation, brightness, alpha
    // hue: [0,360)
    // saturation: [0,1]
    // brightness: [0,1]
    // alpha: [0,1]
    function hsv2rgb(h, s, v, a) {
        //
        // based on C code from http://paulbourke.net/texture_colour/convert/
        //
        var sat = {}, r, g, b, c;

        while (h < 0) {
            h += 360;
        }
        while (h > 360) {
            h -= 360;
        }

        if (h < 120) {
            sat.r = (120 - h) / 60.0;
            sat.g = h / 60.0;
            sat.b = 0;
        } else if (h < 240) {
            sat.r = 0;
            sat.g = (240 - h) / 60.0;
            sat.b = (h - 120) / 60.0;
        } else {
            sat.r = (h - 240) / 60.0;
            sat.g = 0;
            sat.b = (360 - h) / 60.0;
        }
        sat.r = Math.min(sat.r, 1);
        sat.g = Math.min(sat.g, 1);
        sat.b = Math.min(sat.b, 1);

        v *= 255; // To scale r,g,b from range [0,1] to [0, 255].
        r = Math.ceil((1 - s + s * sat.r) * v);
        g = Math.ceil((1 - s + s * sat.g) * v);
        b = Math.ceil((1 - s + s * sat.b) * v);

        //Appending this way is less memory intensive. Ref: http://dev.opera.com/articles/view/efficient-javascript/?page=2
        c = 'rgba(';
        c += r;
        c += ',';
        c += g;
        c += ',';
        c += b;
        c += ',';
        c += a;
        c += ')';
        return c;
    }
    function colorToRgba(color) {
        return hsv2rgb(color.h, color.s, color.b, color.a);
    }
    function getSafeVal(val, defaultVal) {
        if (isNotDefined(val)) {
            return defaultVal;
        }
        return val;
    }
    function mapLen(map) {
        if (isNotDefined(map)) {
            return 0;
        }
        if (typeof map.__count__ !== 'undefined') {
            return map.__count__;
        }
        var s = 0, k;
        for (k in map) {
            if (map.hasOwnProperty(k)) {
                s += 1;
            }
        }
        return s;
    }
    function callbackWithErr(callbackFunc, err) {
        if (!isNotDefined(callbackFunc)) {
            setTimeout(function () { callbackFunc(false, err); }, 500);
        }
    }
    function num2variantName(num) {
        num = Math.floor(num % 1000000 + num / 1000000);
        var result = "", remainder;
        do {
            remainder = num % 26;
            result = String.fromCharCode(remainder + 65) + result;
            num = Math.round(num / 26 - 0.5);
        } while (num > 0);
        return result;
    }
    function createCloneCanvas(canvas, z) {
        var jC = jQ(canvas), newCanvas;
        newCanvas = jQ('<canvas>').attr('height', jC.attr('height')).attr('width', jC.attr('width'));
        newCanvas.css({
            'z-index': z,
            position: 'absolute',
            margin: 0,
            border: 0,
            top: jC.offset().top + (jC.outerHeight(true) - jC.innerHeight()),
            left: jC.offset().left + (jC.outerWidth(true) - jC.innerWidth())
        });
        newCanvas.appendTo(jC.parent());
        return newCanvas.get(0);
    }
    function clone(obj) {
        if (obj === null) {
            return null;
        }
        var o, k;
        if (obj instanceof Array) {
            o = [];
            for (k = 0; k < obj.length; k += 1) {
                if (typeof obj[k] === 'object') {
                    o.push(clone(obj[k]));
                } else {
                    o.push(obj[k]);
                }
            }
        } else {
            o = {};
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    if (typeof obj[k] === 'object') {
                        o[k] = clone(obj[k]);
                    } else {
                        o[k] = obj[k];
                    }
                }
            }
        }
        return o;
    }
    function invert3x3Matrix(mat) {
        var a, b, c, d, e, f, g, h, k, A, B, C, det;
        a = mat[0][0]; b = mat[0][1]; c = mat[0][2];
        d = mat[1][0]; e = mat[1][1]; f = mat[1][2];
        g = mat[2][0]; h = mat[2][1]; k = mat[2][2];
        A = e * k - f * h; B = f * g - k * d; C = d * h - e * g;
        det = a * A + b * B + c * C;
        if (det === 0) {
            return null;
        }
        return [[A / det, (c * h - b * k) / det, (b * f - c * e) / det],
                [B / det, (a * k - c * g) / det, (c * d - a * f) / det],
                [C / det, (g * b - a * h) / det, (a * e - b * d) / det]];
    }
    //Counter-clockwise rotation
    function rotate(ang, transform) {
        var cosTheta, sinTheta, r;
        if (ang === 'pi') {
            cosTheta = -1;
            sinTheta = 0;
        } else if (ang === 'pi/2') {
            cosTheta = 0;
            sinTheta = 1;
        } else if (ang === 0) {
            cosTheta = 1;
            sinTheta = 0;
        } else {
            cosTheta = Math.cos(ang);
            sinTheta = Math.sin(ang);
        }
        r = toAffineTransformation(cosTheta, -sinTheta, 0,
                                   sinTheta, cosTheta,  0);
        return compose(r, transform);
    }
    function scale(sx, sy, transform) {
        var s = toAffineTransformation(sx, 0, 0,
                                       0, sy, 0);
        return compose(s, transform);
    }
    function translate(x, y, transform) {
        var t = toAffineTransformation(1, 0, x,
                                       0, 1, y);
        return compose(t, transform);
    }
    function sq(n) {
        return n * n;
    }
    function norm(r1, r2) {
        return Math.sqrt(sq(r2[0][0] - r1[0][0]) + sq(r2[1][0] - r1[1][0]));
    }
    function sortedAscPush(arr, v, k, isFCFS) {//We could have used sort() after push() but that would be at best O(N lnN). This is O(N).
        k = k || null;
        isFCFS = isFCFS || false; //If arr already contains elements == v and this flag is false then v will be added at the end of the equal elements, else at front.
        if (arr.length === 0) {
            arr.push(v);
            return;
        }
        var i, j;
        for (i = 0; i < arr.length; i += 1) {
            if (!isFCFS) {
                if ((k === null && arr[i] === v) ||
                        (k !== null && arr[i][k] === v[k])) {
                    break;
                }
            }
            if ((k === null && arr[i] > v) ||
                    (k !== null && arr[i][k] > v[k])) {
                break;
            }
        }
        for (j = arr.length; j > i; j -= 1) {
            arr[j] = arr[j - 1];
        }
        arr[i] = v;
    }

    //================
    //Global Functions
    //================
    var CInk = window.CInk, UNICODE_PATTERN = /\{u([0-9]+)\}/gi;
    if (!CInk) {
        CInk = window.CInk = {};
        CInk.log = function log() {
            if (console && console.log) {
                var args = Array.prototype.slice.call(arguments);
                console.log.apply(console, args);
            }
        };
        CInk.warn = function warn() {
            if (console && console.warn) {
                var args = Array.prototype.slice.call(arguments);
                console.warn.apply(console, args);
                console.trace();
            }
        };
        CInk.err = function err() {
            if (console && console.error) {
                var args = Array.prototype.slice.call(arguments);
                console.error.apply(console, args);
                console.trace();
            }
        };
    }
    CInk.isBrowserSupported = function isBrowserSupported() {
        var BrowserDetect = window.BrowserDetect;
        if (!BrowserDetect) {
            CInk.err('BrowserDetect object not found. Please make sure to include depends/browser_detect.js.');
            return undefined;
        }
        var browserSupported = false;
        if ((BrowserDetect.browser === 'Firefox' && BrowserDetect.version * 1 >= 4)
                || BrowserDetect.browser === 'Chrome'
                || BrowserDetect.browser === 'Safari') {
            browserSupported = true;
        }
        return browserSupported;
    };
    CInk.compileAndRun = function compileAndRun(rawCode, canvas, callBackOnFinish, getMeta, variant, slowClear) {
        var compiledCode = CInk.Compile(rawCode), err, w, renderer, variName, ctx;
        if (isNotDefined(compiledCode)) {
            err = "Could not compile code!!! Aborting render.";
            CInk.err(err);
            callbackWithErr(callBackOnFinish, err);
            if (getMeta) {
                getMeta('', null);
            }
            return null;
        }
        if (!isNotDefined(canvas)) {
            if (slowClear) {
                //Chrome has a bug where it fails to render strokeText after canvas has been resized.
                //http://code.google.com/p/chromium/issues/detail?id=44017
                ctx = canvas.getContext('2d');
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                CInk.log("Using slow method to clear the canvas. Because of Chrome bug#44017.");
            } else {
                w = canvas.width;
                canvas.width = 0;
                canvas.width = w;
            }
        }
        renderer = new CInk.Renderer(canvas, compiledCode, callBackOnFinish);
        if (renderer !== null) {
            variName = renderer.render(variant);
            if (getMeta) {
                getMeta(variName, compiledCode);
            }
        }
        return renderer;
    };
    CInk.resetCompileAndRun = function resetCompileAndRun(params) {
        if (!isNotDefined(params.rendererVar)) {
            params.rendererVar.shutAndDispose(function () {
                params.rendererVar = null;
                CInk.resetCompileAndRun(params);
            });
            return;
        }
        params.rendererVar = CInk.compileAndRun(params.rawCode, params.canvas, params.callBackOnFinish, params.getMeta, params.variant, params.slowClear);
    };
    CInk.resetAndRun = function resetAndRun(params) { //It doesn't compile. All params of resetCompileAndRun are supported, except,
                                                      //replace params.rawCode by params.compiledCode.
        var canvas, ctx, renderer, variName, w;
        if (!isNotDefined(params.rendererVar)) {
            params.rendererVar.shutAndDispose(function () {
                params.rendererVar = null;
                CInk.resetAndRun(params);
            });
            return;
        }
        canvas = params.canvas;
        if (!isNotDefined(canvas)) {
            if (params.slowClear) {
                //Chrome has a bug where it fails to render strokeText after canvas has been resized.
                //http://code.google.com/p/chromium/issues/detail?id=44017
                ctx = canvas.getContext('2d');
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                CInk.log("Using slow method to clear the canvas. Because of Chrome bug#44017.");
            } else {
                w = canvas.width;
                canvas.width = 0;
                canvas.width = w;
            }
        }
        renderer = new CInk.Renderer(canvas, params.compiledCode, params.callBackOnFinish);
        if (renderer !== null) {
            variName = renderer.render(params.variant);
            if (params.getMeta) {
                params.getMeta(variName, params.compiledCode);
            }
        }
        params.rendererVar = renderer;
    };
    CInk.Renderer = function Renderer(canvas, code, callBackOnFinish) {
        var err, canvases, sortedZIndices, ctx, canvasWidth, canvasHeight, halfCanvasWidth, halfCanvasHeight, correctArcPHandling,
            rendering, queue, backColor, zEnabled, zOffset, t, l, z, tileH, isInPlaceTiling, shutDown, hasEvents,
            callOnDisposeFinish, userGlobalTransform, userGlobalTransformNoTranslation, rendererObj, ID, bc, w, backgroundZ,
            timerObj, globalTransforms, LOWEST_PRIORITY, miscTransform;
        
        if (isNotDefined(code) || isNotDefined(canvas)) {
            err = "Supplied code or canvas is null!!! Aborting render.";
            CInk.err(err);
            callbackWithErr(callBackOnFinish, err);
            return null;
        }
        
        //-----------------
        //Public variables.
        //-----------------
        this.GLOBAL_SCALE = 300;
        this.MAX_THREADS = 30;
        
        //------------------
        //Private variables.
        //------------------
        LOWEST_PRIORITY = 10; //Used for optimization.
        canvases = {1: canvas};
        sortedZIndices = [1];
        ctx = canvas.getContext("2d");
        if (!ctx.setTransform) {
            err = "Bad bad browser! canvas doesn't support setTransform()! So, can't render.";
            CInk.err(err);
            callbackWithErr(callBackOnFinish, err);
            return;
        }
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        halfCanvasWidth = canvasWidth / 2;
        halfCanvasHeight = canvasHeight / 2;
        rendering = false;
        queue = [];
        backColor = code.backColor === null ? null : code.backColor.color;
        zEnabled = code.hasZ && !!jQ;
        zOffset = 0;
        backgroundZ = -10000;
        if (zEnabled) {
            t = jQ(canvas).offset().top;
            l = jQ(canvas).offset().left;
            z = getSafeVal(jQ(canvas).css('z-index'), 1);
            if (z === 'auto') {
                z = -10;
            }
            jQ(canvas).css({
                'z-index': z,
                position: 'absolute',
                top: t,
                left: l
            });
            zOffset = 1 - z;
            if (!jQ(canvas).parent().hasClass('CInkWrapper')) { //Checking if this is already wrapped.
                jQ(canvas).wrap('<div class="CInkWrapper"/>'); //So that all zcanvases are placed on after another w/o interference from other doms.
            } else { //Already wrapped then we don't re-wrap, but we do need to reset the background canvas, if present.
                bc = jQ(canvas).next();
                if (bc.length !== 0) {
                    w = bc.get(0).width;
                    bc.get(0).width = w;
                }
            }
        }
        tileH = getSafeVal(code.tileH, 100);
        isInPlaceTiling = getSafeVal(code.inTiling, true);
        correctArcPHandling = getSafeVal(code.correctArcP, true);
        shutDown = false;
        hasEvents = !!(code.rules.MOUSECLICK || code.rules.MOUSEMOVE || code.rules.TYPE || code.rules.TIME);
        callOnDisposeFinish = null;
        userGlobalTransform = null;
        timerObj = null;
        globalTransforms = {gx: 0, gy: 0};
        //var xmax = 0, xmin = canvasWidth, ymax = 0, ymin = canvasHeight; //Values reversed to make sure tight bounding is found.
        
        rendererObj = this;
        ID = new Date().getTime();
        
        //-----------------------
        //Private Thread Helpers.
        //-----------------------
        function ThreadedRuleDraw(shape, transforms, priority) {
            this.priority = priority || LOWEST_PRIORITY;
            this.gx = globalTransforms.gx;
            this.gy = globalTransforms.gy;
            this.start = function (isByEvent) {
                globalTransforms.gx = this.gx;
                globalTransforms.gy = this.gy;
                drawRule.call(rendererObj, shape, transforms, priority, isByEvent);
            };
        }
        function ThreadedLoop(c, loopCode, transforms, priority) {
            this.priority = priority || LOWEST_PRIORITY;
            this.gx = globalTransforms.gx;
            this.gy = globalTransforms.gy;
            this.start = function (isByEvent) {
                globalTransforms.gx = this.gx;
                globalTransforms.gy = this.gy;
                loop.call(rendererObj, c, loopCode, transforms, priority, isByEvent);
            };
        }
        function ThreadedShapeDraw(i, shapes, transforms, priority) {
            this.priority = priority || LOWEST_PRIORITY;
            this.gx = globalTransforms.gx;
            this.gy = globalTransforms.gy;
            this.start = function (isByEvent) {
                globalTransforms.gx = this.gx;
                globalTransforms.gy = this.gy;
                drawAllShapes.call(rendererObj, i, shapes, transforms, priority, isByEvent);
            };
        }
        function ThreadedPath(isNested, name, ops, pathTransform, transforms, priority) {
            this.priority = priority || LOWEST_PRIORITY;
            this.gx = globalTransforms.gx;
            this.gy = globalTransforms.gy;
            this.start = function (isByEvent) {
                globalTransforms.gx = this.gx;
                globalTransforms.gy = this.gy;
                drawPath.call(rendererObj, isNested, name, ops, pathTransform, transforms, isByEvent);
            };
        }
        
        //-----------------------
        //Private Helper methods.
        //-----------------------
        function q(job) {
            if (job.priority === LOWEST_PRIORITY) {
                queue.push(job);
            } else {
                sortedAscPush(queue, job, 'priority', true);
            }
        }
        function transformColor(adjustments, currentColor) {
            var newColor, adj, key;
            newColor = {
                h : currentColor.h,
                s : currentColor.s,
                b : currentColor.b,
                a : currentColor.a
            };
            
            if (!isNotDefined(adjustments.h)) {
                // Add num to the drawing hue value, modulo 360
                newColor.h += adjustments.h;
                newColor.h %= 360;
            }
            
            adj = {};
            adj.s = getSafeVal(adjustments.sat, null);
            adj.b = getSafeVal(adjustments.b, null);
            adj.a = getSafeVal(adjustments.a, null);

            // If adj<0 then change the drawing [blah] adj% toward 0.
            // If adj>0 then change the drawing [blah] adj% toward 1.
            for (key in adj) {
                if (adj.hasOwnProperty(key)) {
                    if (adj[key] !== null) {
                        if (adj[key] >= 0) {
                            newColor[key] += adj[key] * (1 - currentColor[key]);
                        } else {
                            newColor[key] += adj[key] * currentColor[key];
                        }
                        if (newColor[key] < 0) {
                            newColor[key] = 0;
                        } else if (newColor[key] > 1) {
                            newColor[key] = 1;
                        }
                    }
                }
            }
            return newColor;
        }
        function adjustMisc(adjustments, miscTransforms) {
            if (adjustments === null || mapLen(adjustments) === 0) {
                return miscTransforms;
            }
            if (isNotDefined(miscTransforms)) {
                miscTransforms = {shColor: {
                    h: 0,
                    s: 0,
                    b: 0,
                    a: 1
                }};
            }
            
            var newTrans = {
                shx: 0,
                shy: 0,
                shblur: 0
            };
            
            //Shadow transforms
            newTrans.shColor = transformColor({h: adjustments.shh, sat: adjustments.shsat, b: adjustments.shb, a: adjustments.sha}, miscTransforms.shColor);
            if (!isNotDefined(adjustments.shx)) {
                newTrans.shx += adjustments.shx;
            }
            if (!isNotDefined(adjustments.shy)) {
                newTrans.shy += adjustments.shy;
            }
            if (!isNotDefined(adjustments.shblur)) {
                newTrans.shblur += adjustments.shblur;
            }
            
            return newTrans;
        }
        function adjustColor(adjustments, currentColor, targetColor) {
            if (adjustments === null || mapLen(adjustments) === 0) {
                return { color: currentColor, target: targetColor };
            }
            // See http://www.contextfreeart.org/mediawiki/index.php/Shape_adjustments
            
            var newColor, currentTargetColor, newTargetColor, isTargetSet, k, newTargetColorUpdated,
                c, colorTarget;
            
            //Normal color calculations.
            newColor = transformColor(adjustments, currentColor);
            
            //Target color calculations.
            currentTargetColor = { //|h etc...
                h : getSafeVal(adjustments._h, null),
                s : getSafeVal(adjustments._sat, null),
                b : getSafeVal(adjustments._b, null),
                a : getSafeVal(adjustments._a, null)
            };
            if (isNotDefined(targetColor)) {
                isTargetSet = false;
                newTargetColor = {h: null, s: null, b: null, a: null};
            } else {
                isTargetSet = true;
                newTargetColor = {
                    h : getSafeVal(targetColor.h, null),
                    s : getSafeVal(targetColor.s, null),
                    b : getSafeVal(targetColor.b, null),
                    a : getSafeVal(targetColor.a, null)
                };
            }
            for (k in currentTargetColor) {
                if (currentTargetColor.hasOwnProperty(k)) {
                    if (currentTargetColor[k] !== null) {
                        isTargetSet = true;
                        newTargetColorUpdated = true;
                         //Do I need to add or simply set non-hue targets?
                        newTargetColor[k] = getSafeVal(newTargetColor[k], 0) + currentTargetColor[k];
                        if (k === 'h') {
                            newTargetColor[k] %= 360;
                        } else if (newTargetColor[k] < 0) {
                            newTargetColor[k] = 0;
                        } else if (newTargetColor[k] > 1) {
                            newTargetColor[k] = 1;
                        }
                    }
                }
            }
            if (!newTargetColorUpdated) {
                newTargetColor = targetColor;
            }
            //Color target increments, decrements, calculations.
            if (isTargetSet) {
                colorTarget = { //h| etc...
                    h : getSafeVal(adjustments.h_, null),
                    s : getSafeVal(adjustments.sat_, null),
                    b : getSafeVal(adjustments.b_, null),
                    a : getSafeVal(adjustments.a_, null)
                };
                for (k in colorTarget) {
                    if (colorTarget.hasOwnProperty(k)) {
                        if (colorTarget[k] !== null && newTargetColor[k] !== null) {
                            if (k === 'h') {
                                //var diff = newTargetColor.h - newColor.h;
                                c = newColor.h + Math.abs(newTargetColor.h - newColor.h) * colorTarget.h;
                                //if (sign(newTargetColor.h - c) == sign(diff)) {
                                if (c >= 360) {
                                    c = 360 - c;
                                } else if (c < 0) {
                                    c += 360;
                                }
                                newColor.h = c;
                                //}
                            } else {
                                c = newColor[k];
                                if (colorTarget[k] >= 0) {
                                    c += colorTarget[k] * (1 - c);
                                } else {
                                    c += colorTarget[k] * c;
                                }
                                if (Math.abs(c - newColor[k]) < Math.abs(newTargetColor[k] - newColor[k])) {
                                    if (c < 0) {
                                        c = 0;
                                    } else if (c > 1) {
                                        c = 1;
                                    }
                                    newColor[k] = c;
                                } else {
                                    newColor[k] = newTargetColor[k];
                                }
                            }
                        }
                    }
                }
            }
            return {color: newColor, target: newTargetColor};
        }
        function adjustTransform(adjs, transformObj) {
            var transform, transformZ, i, x, y, translate, r, cosTheta, sinTheta, rotate, s, scale,
                f, flip, vX, vY, norm, sk, sx, sy, skew, val, originalCompose;
                
            transform = transformObj.xy;
            transformZ = transformObj.z;
            for (i = 0; i < adjs.length; i += 1) {
                val = adjs[i].val;
                
                if (adjs[i].type === 'gx') {                             //~ Translation - Global X ~//
                    x = val;
                    if (x === 0) {
                        globalTransforms.gx = 0;
                    } else {
                        globalTransforms.gx += x;
                    }
                } else if (adjs[i].type === 'gy') {                       //~ Translation - Global Y ~//
                    y = val;
                    if (y === 0) {
                        globalTransforms.gy = 0;
                    } else {
                        globalTransforms.gy += y;
                    }
                } else if (adjs[i].type === 'x') {                        //~ Translation - X ~//
                    x = val;
                    
                    if (x !== 0) {
                        translate = toAffineTransformation(1, 0, x,
                                                           0, 1, 0);
                        transform = compose(transform, translate);
                    }
                } else if (adjs[i].type === 'y') {                      //~ Translation - Y ~//
                    y = val;
                    
                    if (y !== 0) {
                        translate = toAffineTransformation(1, 0, 0,
                                                           0, 1, -y); //We negate y since on canvas origin is at top left,
                                                                      //but we want it at bottom left.
                        transform = compose(transform, translate);
                    }
                } else if (adjs[i].type === 'z') {                      //~ Z - Index ~//
                    transformZ = getSafeVal(transformObj.z, 0) + val;
                    
                } else if (adjs[i].type === 'r') {                      //~ Rotation ~//
                    r = val;
                    if (r !== null) {
                        r = Math.PI * r / 180;
                        cosTheta = Math.cos(r);
                        sinTheta = Math.sin(r);
                        rotate = toAffineTransformation(cosTheta,  sinTheta, 0,
                                                        -sinTheta, cosTheta, 0); //We rotate clock-wise.
                        transform = compose(transform, rotate);
                    }
                } else if (adjs[i].type === 's') {                      //~ Scaling ~//
                    s = val;
                    
                    if (s.x !== 1 || s.y !== 1) { //z is ignored as this requires sorting the shapes by z-index. But in CInk we draw it as it available,
                                                  //so z cannot be honored.
                        scale = toAffineTransformation(s.x, 0, 0,
                                                       0, s.y, 0);
                        transform = compose(transform, scale);
                    }
                } else if (adjs[i].type === 'f') {                      //~ Flip around a line through the origin ~//
                    f = val;
                    if (f !== null) {
                        // Flip 0 means to flip along the X axis. Flip 90 means to flip along the Y axis.
                        // That's why the flip vector (vX, vY) is PI/2 radians further along than expected.
                        vX = Math.cos(-2 * Math.PI * f / 360.0);
                        vY = Math.sin(-2 * Math.PI * f / 360.0);
                        norm = 1 / (vX * vX + vY * vY);
                        flip = toAffineTransformation((vX * vX - vY * vY) / norm,    2 * vX * vY / norm,            0,
                                                      2 * vX * vY / norm,            (vY * vY - vX * vX) / norm,    0);
                        transform = compose(transform, flip);
                    }
                } else if (adjs[i].type === 'skew') {                   //~ Skew ~//
                    sk = val;
                    if (sk.x !== 0 || sk.y !== 0) {
                        sx = sk.x * Math.PI / 180.0; //Since in CInk we provide skew angle, not skew distance.
                        sy = sk.y * Math.PI / 180.0;
                        //From http://www.html5canvastutorials.com/advanced/html5-canvas-shear-transform-tutorial
                        skew = toAffineTransformation(1, -sy, 0,
                                                      -sx, 1, 0);
                        transform = compose(transform, skew);
                    }
                }
            }
            return {xy: transform, z: transformZ};
        }
        function adjustText(adjs, textTransform) {
            if (isNotDefined(adjs)) {
                return textTransform;
            }
            if (isNotDefined(textTransform)) {
                textTransform = {};
            }
            var tt, adjT, t, c;
            tt = {
                txt:             getSafeVal(textTransform.txt, ''),
                fontName:        getSafeVal(textTransform.fontName, 'Arial'),
                fontSize:        getSafeVal(textTransform.fontSize, 5),
                fontSizeUnit:    getSafeVal(textTransform.fontSizeUnit, 'px'),
                isStrokeText:    getSafeVal(textTransform.isStrokeText, false),
                textBaseline:    getSafeVal(textTransform.textBaseline, 'alphabetic'),
                textAlignment:   getSafeVal(textTransform.textAlignment, 'start'),
                strokeWidth:     getSafeVal(textTransform.strokeWidth, 2),
                fontStyle:       getSafeVal(textTransform.fontStyle, '')
            };
            adjT = '';
            if (!isNotDefined(adjs._t)) {
                t = tt.txt;
                if (t.length !== 0) {
                    adjT = String.fromCharCode(t.charCodeAt(t.length - 1) + adjs._t);
                }
            }
            if (getSafeVal(adjs.e, false)) {
                tt.txt = '';
            }
            if (getSafeVal(adjs.bkspc, false)) {
                t = tt.txt;
                if (t.length !== 0) {
                    tt.txt = t.substr(0, t.length - 1);
                }
            }
            tt.txt = tt.txt.concat(adjT); //This is done just to make sure _t still retains data irrespective
                                          //of if e and/or bkspc are given as they should effect only the previous text, i.e. tt.txt.
            if (!isNotDefined(adjs.t)) {
                t = adjs.t;
                UNICODE_PATTERN.lastIndex = 0;
                while ((c = UNICODE_PATTERN.exec(t)) !== null) {
                    t = t.replace(c[0], String.fromCharCode(c[1]));
                    UNICODE_PATTERN.lastIndex = UNICODE_PATTERN.lastIndex - c[0].length + 1;
                }
                tt.txt = tt.txt.concat(t);
            }
            if (!isNotDefined(adjs.fs)) {
                tt.fontSize += adjs.fs;
            }
            if (!isNotDefined(adjs.sw)) {
                tt.strokeWidth += adjs.sw;
            }
            if (!isNotDefined(adjs.st)) {
                tt.isStrokeText = adjs.st;
            }
            if (!isNotDefined(adjs.fn)) {
                tt.fontName = adjs.fn;
            }
            if (!isNotDefined(adjs.fu)) {
                tt.fontSizeUnit = adjs.fu;
            }
            if (!isNotDefined(adjs.base)) {
                tt.textBaseline = adjs.base;
            }
            if (!isNotDefined(adjs.align)) {
                tt.textAlignment = adjs.align;
            }
            if (!isNotDefined(adjs.fstyle)) {
                tt.fontStyle = adjs.fstyle === 'normal' ? '' : adjs.fstyle;
            }
            return tt;
        }
        function setTransform(trans, ctx, applyGlobalScale, applyGlobalTranslation, applyGlobalTransforms) {
            var gx = globalTransforms.gx * trans[0][0],
                gy = globalTransforms.gy * trans[1][1];
            if (applyGlobalScale !== false) {
                // Globally center and scale the transform (often the pictures are too small)
                ctx.setTransform(rendererObj.GLOBAL_SCALE, 0, 0, rendererObj.GLOBAL_SCALE, halfCanvasWidth, halfCanvasHeight);
            } else {
                if (applyGlobalTranslation === true) {
                    ctx.setTransform(1, 0, 0, 1, halfCanvasWidth, halfCanvasHeight);
                } else {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                }
            }
            if (applyGlobalTransforms === false) {
                gx = 0;
                gy = 0;
            }
            // Perform the actual transformation.
            ctx.transform(trans[0][0], trans[1][0],
                          trans[0][1], trans[1][1],
                          trans[0][2] + gx, trans[1][2] + gy);
        }
        function draw(isBackZInBound, transform, drawFunc, applyGlobalScale, applyGlobalTranslation, applyGlobalTransforms) {
            var zCtx = ctx, z, canvasZ; //This is of z==1.
            if (zEnabled) {// && !skipZCheck) {
                z = Math.round(transform.z * 100); //Multiplying by 100 to get more precision, as we need to round it off, since z-index should be integers.
                if (z > 200) {
                    z = 200; //+z-index is capped to 200, so that UIs can guarantee that top elements will be rendered.
                }
                if (z === 1) {
                    z = 2;
                } else if (!isBackZInBound && z === backgroundZ) { //Lower limit of z.
                    z = backgroundZ + 1;
                }
                canvasZ = canvases[z];
                if (isNotDefined(canvasZ)) {
                    canvasZ = createCloneCanvas(canvas, z - zOffset);
                    canvases[z] = canvasZ;
                    sortedAscPush(sortedZIndices, z);
                }
                zCtx = canvasZ.getContext('2d');
            }
            setTransform(transform.xy, zCtx, applyGlobalScale, applyGlobalTranslation, applyGlobalTransforms);
            drawFunc(zCtx);
            return z;
        }
        function schedulePathDraw(shapeName, transforms) {
            q(new ThreadedPath(false, shapeName, null,
                {currCoord: {x: 0, y: 0}, isCurve: false},
                transforms, 2));
        }
        function applyShadowTransform(ctx, transform) {
            if (!isNotDefined(transform)) {
                ctx.shadowOffsetX = transform.shx;
                ctx.shadowOffsetY = transform.shy;
                ctx.shadowBlur = transform.shblur;
                ctx.shadowColor = colorToRgba(transform.shColor);
            }
        }
        function normalizeStrokeWidth(sw) {
            return sw / rendererObj.GLOBAL_SCALE;
        }
        /*function reflectAboutLine(pt, aboutP1, aboutP2) {
            var x, y, C;
            C = (aboutP1.x - aboutP2.x) * (pt.x - aboutP2.x) + (aboutP1.y - aboutP2.y) * (pt.y - aboutP2.y) * 1.0;
            C = C / (Math.pow(aboutP1.x - aboutP2.x, 2) + Math.pow(aboutP1.y - aboutP2.y, 2));
            x = 2 * aboutP2.x + (aboutP1.x - aboutP2.x) * C;
            y = 2 * aboutP2.y + (aboutP1.y - aboutP2.y) * C;
            return {x: x, y: y};
        }*/
        function reflectAboutPt(pt, aboutPt) {
            var x, y, C, D, C2;
            
            if (pt.x === aboutPt.x) {
                x = pt.x;
                y = 2 * aboutPt.y - pt.y;
            } else {            
                D = Math.sqrt(Math.pow(aboutPt.x - pt.x, 2) + Math.pow(aboutPt.y - pt.y, 2));
                C = (pt.y - aboutPt.y) / (pt.x - aboutPt.x);
                C2 = Math.sqrt(1 + C * C);
                x = D / C2 + aboutPt.x;
                if (x === pt.x) {
                    x = -D / C2 + aboutPt.x;
                }
                y = C * (x - aboutPt.x) + aboutPt.y;
            }
            return {x: x, y: y};
        }
        function scheduleTransformsAdjustment(currTransforms, pathTransform) {
            var transforms = clone(currTransforms);
            pathTransform.draw.push(['geoAdjust', function (currPathTransform, geoAdjustment) {
                var trans = clone(transforms), tmpGeo; //cloning again so that this method can be used again. E.g. when we have two consecutive FILL{}.
                tmpGeo = adjustTransform(geoAdjustment, {xy: IDENTITY_TRANSFORM(), z: trans.geo.z});
                trans.geo.z = tmpGeo.z;
                trans.geo.xy = compose(tmpGeo.xy, trans.geo.xy);
                trans.geo.xy = compose(currPathTransform.globalXYTrans, trans.geo.xy);
                currPathTransform.currTransforms = trans;
            }]);
        }
        function scheduleDraw(name, localPathTransform, f) {
            localPathTransform.draw.push([name, function (pathTransform) {
                draw(false, pathTransform.currTransforms.geo, f);
            }]);
        }
        function scheduleMoveTo(isRelative, localPathTransform, x, y) {
            scheduleDraw('mv', localPathTransform, function (ctx) {
                ctx.moveTo(x, -y);
            });
        }
        function scheduleLineTo(isRelative, localPathTransform, x, y) {
            scheduleDraw('ln', localPathTransform, function (ctx) {
                ctx.lineTo(x, -y);
            });
        }
        function scheduleArcTo(isRelative, localPathTransform, t0, t1, c, ang, rx, ry, large) {
            scheduleDraw('ac', localPathTransform, function (ctx) {
                var dt = 0.1, t, xy, check, len = t1 - t0, smallLen, getXY,
                    cosA, sinA, TWOPI = 2 * Math.PI;
                cosA = Math.cos(ang);
                sinA = Math.sin(ang);
                getXY = function getXY(t) {
                    var res = {};
                    res.x = c.x + rx * Math.cos(t) * cosA - ry * Math.sin(t) * sinA;
                    res.y = c.y + rx * Math.cos(t) * sinA + ry * Math.sin(t) * cosA;
                    return res;
                };
                if (len < 0) {
                    len = TWOPI + len; //which is TWOPI - -len
                }
                smallLen = len <= Math.PI;
                /* ***********************************************************
                 *         Conditions          ||          Results
                 * ***********************************************************
                 *  large | smallLen | t0 < t1 ||       check          |  dt
                 * ***********************************************************
                 *    F   |     F    |    F    ||        t >= t1       |  -ve
                 *    F   |     F    |    T    || !(t >= t0 && t < t1) |  -ve
                 *    F   |     T    |    F    || !(t > t1 && t <= t0) |  +ve
                 *    F   |     T    |    T    ||        t <= t1       |  +ve
                 *    T   |     F    |    F    || !(t > t1 && t <= t0) |  +ve
                 *    T   |     F    |    T    ||        t <= t1       |  +ve
                 *    T   |     T    |    F    ||        t >= t1       |  -ve
                 *    T   |     T    |    T    || !(t >= t0 && t < t1) |  -ve
                 * ***********************************************************
                 */
                
                //Direct conversion of above truth table to if-else conditions.
                //Isn't truth tables beautiful? :-)
                if (large === smallLen) {
                    dt = -dt;
                }
                
                if (t0 < t1) {
                    if (large !== smallLen) {
                        check = function (t) { return t0 <= t && t <= t1; };
                    } else if (large === smallLen) {
                        check = function (t) { return !(t >= t0 && t < t1); };
                    }
                } else { // t0 > t1
                    if (large !== smallLen) {
                        check = function (t) { return !(t > t1 && t <= t0); };
                    } else if (large === smallLen) {
                        check = function (t) { return t1 <= t && t <= t0; };
                    }
                }
                
                for (t = t0;;) {
                    t += dt;
                    if (t >= TWOPI) {
                        t = t - TWOPI;
                    } else if (t < 0) {
                        t = TWOPI + t;
                    }
                    if (!check(t)) {
                        break;
                    }
                    
                    xy = getXY(t);
                    ctx.lineTo(xy.x, -xy.y);
                }
                //If we miss to draw to exact t1 due to stepping of dt, then we do that here.
                if (t !== (t1 + dt) && ((dt < 0 && t < t1) || (dt > 0 && t > t1))) {
                    xy = getXY(t1);
                    ctx.lineTo(xy.x, -xy.y);
                }
            });
        }
        function scheduleCurveTo(isRelative, localPathTransform, x1, y1, x2, y2, x0, y0) {
            scheduleDraw('cv', localPathTransform, function (ctx) {
                ctx.bezierCurveTo(x1, -y1, x2, -y2, x0, -y0);
            });
        }
        function scheduleCubicCurveTo(isRelative, localPathTransform, x1, y1, x0, y0) {
            scheduleDraw('quad cv', localPathTransform, function (ctx) {
                ctx.quadraticCurveTo(x1, -y1, x0, -y0);
            });
        }
        function drawPath(isNested, name, ops, pathTransform, transforms, isByEvent) {
            /*
            * Hard to thread path. No matter how cleaver priority mathematics I apply, there
            * is always a chance that some cases may slip thorugh. For example one issue is,
            * even when I queue all my paths perfectly, but it is possible some event may launch
            * a rule with a path. This path will then hijack the queue's top, which will make
            * last running path's queue to be messed up.
            */
            var op, opPathTransform, currCoord, err, x0, y0, x1, y1, x2, y2, i, r, cw, large, D, theta, beta,
                strokeWidth, isCubic, isSmooth, localPathTransform, isDrawn = false, isCircular, alpha, cx, cy,
                localTransform, newColor, localTargetColor, localColor, localMisc, startAng, endAng, willShowLarge,
                ang, rx, ry, multiplier, s, sr, tsr, utsr, vutsr, R1, R2, R1x, R1y, R2x, R2y, c, R1R2x, R1R2y, invMat,
                C1, C2, c1, c2, t0, t1, getT, TWOPI = 2 * Math.PI, rad, len, drawI, trans;
            
            localPathTransform = pathTransform;
            currCoord = localPathTransform.currCoord;
            function convertCurrCoord(localTransform) {
                var xy, invT;
                if (localPathTransform.currCoordGeoTransform &&
                        !areSameMat(localPathTransform.currCoordGeoTransform.xy, localTransform.xy, 4)) {
                    invT = invert3x3Matrix(localTransform.xy);
                    if (!invT) {
                        CInk.err("Path: Failed to find inverse of currCoordGeoTransform!");
                        return;
                    }
                    xy = compose(invT, localPathTransform.currCoordGeoTransform.xy);
                    xy = compose(xy, [[currCoord.x], [-currCoord.y], [1]]);  //Negation of y needed since adjustTransform negates y.
                    currCoord.x = xy[0][0];
                    currCoord.y = -xy[1][0];
                    localPathTransform.currCoordGeoTransform = localTransform;
                }
            }
            function resetDrawList() {
                localPathTransform.draw = [];
                scheduleTransformsAdjustment(transforms, localPathTransform);
                localPathTransform.isPathDrawn = false;
            }
            if (!isNested) {
                ops = code.shapes[name];
                if (ops.length === 0) { //We will end up here for code like - startshape STOPTIME
                    return null;
                }
                transforms = clone(transforms);
                localPathTransform.globalXYTrans = transforms.geo.xy;
                transforms.geo.xy = IDENTITY_TRANSFORM(); //Taking out the parent transform out of the path.
                                                          //This is needed so that parent transforms do not interfere with local ones here.
                                                          //We will apply it at render time.
                
                resetDrawList();
                scheduleDraw('beginPath', localPathTransform, function (ctx) {
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                });
            } else {
                convertCurrCoord(transforms.geo); //Converts currCoords from last transform (if set) to current transform.
            }
            function getPosVal(v, def, isX) {
                var pre = isX ? currCoord.x : currCoord.y;
                v = getSafeVal(v, def);
                return opPathTransform.isRelative && !isNotDefined(pre) ? (v + pre) : v;
            }
            
            i = 0;
            do { //It will process all Path ops, then only exit.
                
                localTransform = transforms.geo;
                localTargetColor = transforms.color.target;
                localColor = transforms.color.color;
                localMisc = transforms.misc;
                
                op = ops[i];
                if (op.name === '__loop*') {//Then this is loop.
                    loop(1, op, {geo: localTransform, color: {color: localColor, target: localTargetColor}, txt: null, misc: localMisc},
                        2, isByEvent, true, localPathTransform);
                    
                    convertCurrCoord(localTransform); //Converts currCoords from last transform (if set) to current transform.
                    scheduleTransformsAdjustment(transforms, localPathTransform);
                    
                } else {
                    opPathTransform = op.transform.path;
                    
                    if (op.name === 'STROKE' || op.name === 'FILL') {
                        localTransform = adjustTransform(op.transform.geo, localTransform);
                        localTransform.xy = compose(localPathTransform.globalXYTrans, localTransform.xy);
                        newColor = adjustColor(op.transform.color, localColor, localTargetColor);
                        localMisc = adjustMisc(op.transform.misc, localMisc);
                        localTargetColor = newColor.target;
                        localColor = newColor.color;
                        
                        //Delayed draw. Finally we draw the whole path here.
                        //We use this funda since STROKE/FILL can have transformations that needs to
                        //be applied to the whole path which is about to be drawn now.
                        len = localPathTransform.draw.length;
                        for (drawI = 0; drawI < len; drawI += 1) {
                            localPathTransform.draw[drawI][1](localPathTransform, op.transform.geo);
                        }
                        localPathTransform.isPathDrawn = true;
                        scheduleTransformsAdjustment(transforms, localPathTransform);
                        
                        if (op.name === 'STROKE') { //STROKE it.
                            strokeWidth = normalizeStrokeWidth(getSafeVal(opPathTransform.stw, 30));
                            draw(false, localTransform, function (ctx) {
                                ctx.lineWidth = strokeWidth;
                                ctx.lineJoin = getSafeVal(opPathTransform.p, 'miter');
                                ctx.lineCap = getSafeVal(opPathTransform.p1, 'butt');
                                applyShadowTransform(ctx, localMisc);
                                ctx.strokeStyle = colorToRgba(localColor);
                                ctx.stroke();
                            });
                        } else { //Else FILL it.
                            draw(false, localTransform, function (ctx) {
                                applyShadowTransform(ctx, localMisc);
                                ctx.fillStyle = colorToRgba(localColor);
                                ctx.fill();
                            });
                        }
                        localPathTransform.isCurve = false;
                        
                    } else {
                    
                        if (localPathTransform.isPathDrawn) {
                            resetDrawList();
                        }
                        
                        if (op.name === 'mv') {
                            currCoord.x = getPosVal(opPathTransform.x0, 0, true);
                            currCoord.y = getPosVal(opPathTransform.y0, 0, false);
                            localPathTransform.currCoordGeoTransform = localTransform;
                            scheduleMoveTo(opPathTransform.isRelative, localPathTransform, currCoord.x, currCoord.y);
                            localPathTransform.isCurve = false;
                            
                        } else if (op.name === 'ln') {
                            currCoord.x = getPosVal(opPathTransform.x0, 0, true);
                            currCoord.y = getPosVal(opPathTransform.y0, 0, false);
                            localPathTransform.currCoordGeoTransform = localTransform;
                            scheduleLineTo(opPathTransform.isRelative, localPathTransform, currCoord.x, currCoord.y);
                            localPathTransform.isCurve = false;
                            
                        } else if (op.name === 'ac') {
                            isCircular = true;
                            localPathTransform.isCurve = true;
                            rad = getSafeVal(opPathTransform.rad, 1);
                            if (!isNotDefined(opPathTransform.rx) || !isNotDefined(opPathTransform.ry)) {
                                isCircular = false;
                                if (getSafeVal(opPathTransform.rx, 1) === getSafeVal(opPathTransform.ry, 1)) {
                                    isCircular = true;
                                    rad = getSafeVal(opPathTransform.rx, 1);
                                }
                            }
                            cw = opPathTransform.p1 === 'cw';
                            large = opPathTransform.p === 'large';
                            
                            if (isCircular) { //Circular
                                ang = 0;
                                rx = ry = rad;
                            } else { //Elliptic
                                ang = d2r(getSafeVal(opPathTransform.rad % 360, 0));
                                rx = getSafeVal(opPathTransform.rx, 1);
                                ry = getSafeVal(opPathTransform.ry, 1);
                            }
                            if (rx < 0 || ry < 0) {
                                cw = !cw;
                                rx = Math.abs(rx);
                                ry = Math.abs(ry);
                            }
                            
                            x0 = currCoord.x;
                            y0 = currCoord.y;
                            x1 = getPosVal(opPathTransform.x0, 0, true);
                            y1 = getPosVal(opPathTransform.y0, 0, false);
                            currCoord.x = x1;
                            currCoord.y = y1;
                            
                            localPathTransform.currCoordGeoTransform = localTransform;
                            
                            //Calculating center of ellipse using above data.
                            //Ref: http://math.stackexchange.com/questions/53093/how-to-find-the-center-of-an-ellipse/
                            
                            r = rotate(-ang, IDENTITY_TRANSFORM()); //We rotate by by -ve angle to align the major axis with x-axis.
                            sr = scale(1 / rx, 1 / ry, r); //This will "squeeze" the ellipse into a unit circle.
                            
                            R1 = compose(sr, [[x0], [y0], [1]]); //Coord of (x0,y0) on the new unit circle (=r0)
                            R2 = compose(sr, [[x1], [y1], [1]]);
                            R1x = R1[0][0];
                            R1y = R1[1][0];
                            R2x = R2[0][0];
                            R2y = R2[1][0];
                            c = norm(R1, R2) / 2;
                            R1R2x = (R1x + R2x) / 2;
                            R1R2y = (R1y + R2y) / 2;
                            
                            if (c > 1) { //--- No solutions ---//
                                CInk.warn('ARCTO: Ellipse cannot be drawn. No solutions possible.');
                            } else if (c === 0) { //--- Infinite number of solutions. Maybe start and end pts. coincide. ---//
                                CInk.warn('ARCTO: Ellipse cannot be drawn. Infinite no. of solutions. Does the two given points coincide?');
                            } else {
                                if (c === 1) {
                                    //--- Has unique solution ---// i.e. only one ellipse possible.
                                    //Now unwinding.
                                    invMat = invert3x3Matrix(sr);
                                    if (invMat === null) {
                                        CInk.err("ARCTO: Couldn't find the inverse!");
                                        return null;
                                    }
                                    C1 = compose(invMat, [[ R1R2x ], [ R1R2y ], [ 1 ]]);
                                    C2 = null;
                                } else { //--- Has two possible solutions ---//
                                    
                                    trans = translate(-R1R2x, -R1R2y, IDENTITY_TRANSFORM()); //We now translate the chord(r0,r1)'s mid-pt to origin.
                                    utsr = rotate('pi/2', trans); //Now we rotate by 90deg to align r0 with unit circle's center (=s0)
                                    s = Math.sqrt((1 - c) * (1 + c)) / c; //perpendicular len / c. perpendicular len = Math.sqrt(1 - c * c)
                                    vutsr = scale(s, s, utsr); //Scale it again so that s0 coincides exactly with the unit circle's center.
                                    C1 = compose(vutsr, [[R1x], [R1y], [1]]);
                                    C2 = compose(vutsr, [[R2x], [R2y], [1]]); //s1 is the reflection of s0 about the origin.
                                    
                                    //Now unwinding.
                                    invMat = invert3x3Matrix(translate(-R1R2x, -R1R2y, sr));
                                    if (invMat === null) {
                                        CInk.err("ARCTO: Couldn't find the inverse!");
                                        return null;
                                    }
                                    
                                    C1 = compose(invMat, [[ C1[0][0] ], [ C1[1][0] ], [ 1 ]]);
                                    C2 = compose(invMat, [[ C2[0][0] ], [ C2[1][0] ], [ 1 ]]);
                                }
                                c1 = {};
                                c1.x = C1[0][0];
                                c1.y = C1[1][0];
                                c2 = {};
                                if (C2 !== null) {
                                    c2.x = C2[0][0];
                                    c2.y = C2[1][0];
                                } else {
                                    c2 = null;
                                }
                                
                                getT = function getT(x, y, cx, cy) {
                                    var c, s;
                                    c = ((x - cx) * Math.cos(ang) + (y - cy) * Math.sin(ang)) / rx;
                                    if (c < -1) { //Snapping values within range else we would get NaN. We might get rouge values due to rounding errors.
                                        c = -1;
                                    } else if (c > 1) {
                                        c = 1;
                                    }
                                    s = ((-x + cx) * Math.sin(ang) + (y - cy) * Math.cos(ang)) / ry;
                                    if (s < 0) { //We use sin t to find out the correct quadrant.
                                        if (c === 1) { //We don't want to return 360deg, instead we snap it to 0deg.
                                            return 0;
                                        } else {
                                            return TWOPI - Math.acos(c);
                                        }
                                    } else {
                                        return Math.acos(c);
                                    }
                                };
                                
                                t0 = getT(x0, y0, c1.x, c1.y);
                                t1 = getT(x1, y1, c1.x, c1.y);
                                c = c1;
                                
                                if (c2 !== null && ((cw && large) || (!cw && !large))) { //Clock-wise then we need to choose the upper ellipse (c2),
                                                                                         //and ofcourse when this doesn't have unique solution.
                                    t0 = getT(x0, y0, c2.x, c2.y);
                                    t1 = getT(x1, y1, c2.x, c2.y);
                                    c = c2;
                                }
                                if (c2 === null && cw) { //Then both halves are equal and we have no concept of large now.
                                    large = true; //We can show cw part by simply setting large = true.
                                }
                                
                                scheduleArcTo(opPathTransform.isRelative, localPathTransform, t0, t1, c, ang, rx, ry, large);
                            }

                        } else if (op.name === 'cv') {
                            isCubic = true;
                            if (isNotDefined(opPathTransform.x2) && isNotDefined(opPathTransform.y2)) {
                                isCubic = false;
                            }
                            isSmooth = false;
                            if (isNotDefined(opPathTransform.x1) && isNotDefined(opPathTransform.y1)) {
                                isSmooth = true;
                                if (!localPathTransform.isCurve) {
                                    err = 'Runtime error! Tried to make a smooth curve but last path was not a curve.';
                                    CInk.err(err);
                                    return null;
                                }
                            }
                            if (isCubic) {
                                if (isSmooth) {
                                    currCoord.x = x0 = getPosVal(opPathTransform.x0, 0, true);
                                    currCoord.y = y0 = getPosVal(opPathTransform.y0, 0, false);
                                    x1 = localPathTransform.reflectPt.x;
                                    y1 = localPathTransform.reflectPt.y;
                                    x2 = getPosVal(opPathTransform.x2, 0, true);
                                    y2 = getPosVal(opPathTransform.y2, 0, false);
                                    localPathTransform.isCurve = true;
                                    localPathTransform.reflectPt = reflectAboutPt(localPathTransform.reflectPt, currCoord);
                                } else {
                                    currCoord.x = x0 = getPosVal(opPathTransform.x0, 0, true);
                                    currCoord.y = y0 = getPosVal(opPathTransform.y0, 0, false);
                                    x1 = getPosVal(opPathTransform.x1, 0, true);
                                    y1 = getPosVal(opPathTransform.y1, 0, false);
                                    x2 = getPosVal(opPathTransform.x2, 0, true);
                                    y2 = getPosVal(opPathTransform.y2, 0, false);
                                    localPathTransform.isCurve = true;
                                    localPathTransform.reflectPt = reflectAboutPt({x: x2, y: y2}, currCoord);
                                }
                                localPathTransform.currCoordGeoTransform = localTransform;
                                scheduleCurveTo(opPathTransform.isRelative, localPathTransform, x1, y1, x2, y2, x0, y0);
                                
                            } else { //Else it is quadratic curve.
                                if (isSmooth) {
                                    currCoord.x = x0 = getPosVal(opPathTransform.x0, 0, true);
                                    currCoord.y = y0 = getPosVal(opPathTransform.y0, 0, false);
                                    x1 = localPathTransform.reflectPt.x;
                                    y1 = localPathTransform.reflectPt.y;
                                    localPathTransform.isCurve = true;
                                    localPathTransform.reflectPt = reflectAboutPt(localPathTransform.reflectPt, currCoord);
                                } else {
                                    currCoord.x = x0 = getPosVal(opPathTransform.x0, 0, true);
                                    currCoord.y = y0 = getPosVal(opPathTransform.y0, 0, false);
                                    x1 = getPosVal(opPathTransform.x1, 0, true);
                                    y1 = getPosVal(opPathTransform.y1, 0, false);
                                    localPathTransform.isCurve = true;
                                    localPathTransform.reflectPt = reflectAboutPt({x: x1, y: y1}, currCoord);
                                }
                                localPathTransform.currCoordGeoTransform = localTransform;
                                scheduleCubicCurveTo(opPathTransform.isRelative, localPathTransform, x1, y1, x0, y0);
                            }

                        } else if (op.name === 'endP') {
                            scheduleDraw('endP', localPathTransform, function (ctx) {
                                ctx.closePath();
                            });
                            localPathTransform.isCurve = false;

                        }
                    }
                }
                
                i += 1;
            } while (!shutDown && i < ops.length);
            
            /*if (!isNested && !isDrawn) {
                draw(false, localTransform, function (ctx) {
                    //ctx.closePath();
                    ctx.fill();
                });
            }*/
            return pathTransform;
        }
        function drawRule(ruleName, transforms, priority, isByEvent) {
            // When things get too small, we can stop rendering.
            // Too small, in this case, means less than half a pixel.
            if (Math.abs(transforms.geo.xy[0][1]) * rendererObj.GLOBAL_SCALE < 0.5 && Math.abs(transforms.geo.xy[1][1]) * rendererObj.GLOBAL_SCALE < 0.5) {
                return;
            }

            // Choose which rule to go with...
            
            var choices, sum, r, shapes, i;
            
            choices = code.rules[ruleName];
            if (isNotDefined(choices)) {
                if (ruleName === 'CIRCLE' || ruleName === 'SQUARE' || ruleName === 'TRIANGLE' || ruleName === 'LINE') {
                    //Handles code like - startshape CIRCLE
                    drawAllShapes(0, [{
                        name: ruleName,
                        transform: {
                            geo: [],
                            txt: [],
                            color: {color: {}, target: {}},
                            misc: {},
                            path: {}
                        }
                    }], transforms, priority, isByEvent);
                } else {
                    schedulePathDraw(ruleName, transforms);
                }
                
            } else {
                if (ruleName === 'TIME') {
                    timerObj = setTimeout(function () { eventHandler.call(rendererObj, "TIME", null, "time"); }, (choices.totalWt * 1000));
                } else {
                    choices = choices.def;
                    sum = code.rules[ruleName].totalWt;
                    r = Math.srandom ? Math.srandom() : Math.random();
                    r = r * sum;
                    
                    sum = 0;
                    for (i = 0; i < choices.length; i += 1) {
                        sum += choices[i].wt;
                        if (r <= sum) {
                            shapes = choices[i].c;
                            break;
                        }
                    }
                    drawAllShapes(0, shapes, transforms, priority, isByEvent);
                }
            }
        }
        function loop(c, loopCode, transforms, priority, isByEvent, isFromPath, pathTransform) {//c starts from 1 (not zero!)
            var count = loopCode.loopTo, loopAdjustments, tL, newTransforms;
            if (c > count || shutDown) {
                return;
            }
            isFromPath = isFromPath || false;
            
            if (isFromPath) {
                newTransforms = clone(transforms);
                loopAdjustments = loopCode.adjustments.transform;
                while (c <= count) {
                    if (drawPath(true, null, loopCode.body, pathTransform, newTransforms, isByEvent) === null) { //Some error occurred.
                        return;
                    }
                    
                    c += 1;
                    
                    if (c <= count) {
                        newTransforms.geo = adjustTransform(loopAdjustments.geo, newTransforms.geo);
                        newTransforms.color = adjustColor(loopAdjustments.color, newTransforms.color.color, newTransforms.color.target);
                        //newTransforms.txt = adjustText(loopAdjustments.txt, newTransforms.txt); Text transform not allowed in path. Conceptually it doesn't fit here.
                        newTransforms.misc = adjustMisc(loopAdjustments.misc, newTransforms.misc);
                        
                        scheduleTransformsAdjustment(newTransforms, pathTransform);
                    }
                }
                return;
            } else {
                drawAllShapes(0, loopCode.body, transforms, priority, isByEvent);
            }
            c += 1;
            if (c <= count) {
                loopAdjustments = loopCode.adjustments.transform;
                newTransforms = {};
                newTransforms.geo = adjustTransform(loopAdjustments.geo, transforms.geo);
                newTransforms.color = adjustColor(loopAdjustments.color, transforms.color.color, transforms.color.target);
                newTransforms.txt = adjustText(loopAdjustments.txt, transforms.txt);
                newTransforms.misc = adjustMisc(loopAdjustments.misc, transforms.misc);
                
                q(new ThreadedLoop(c, loopCode, newTransforms, priority));
            }
        }
        function normalizeFontSize(fs) {
            return (fs * 75);
        }
        function drawAllShapes(i, shapes, transforms, priority, isByEvent) {
            if (i >= shapes.length || shutDown) {
                return;
            }
            
            var shape = shapes[i], localTransform, newColor, localColor, newTxtTransform, isShapeNotVisible,
                path, tD, tS, echoTransform, newTransforms, newMiscTransforms;

            if (shape.name === "__loop*") { //Then this is a loop.
                loop(1, shape, transforms, priority, isByEvent);

            } else { //Else shapes.
                newTransforms = {};
                localTransform = newTransforms.geo = adjustTransform(shape.transform.geo, transforms.geo);
                newColor = newTransforms.color = adjustColor(shape.transform.color, transforms.color.color, transforms.color.target);
                localColor = newColor.color;
                newTxtTransform = newTransforms.txt = adjustText(shape.transform.txt, transforms.txt);
                newMiscTransforms = newTransforms.misc = adjustMisc(shape.transform.misc, transforms.misc);
                
                isShapeNotVisible = false;
                
                if (!zEnabled && backColor !== null && backColor.a !== 0 && backColor.s === transforms.color.color.s &&
                        backColor.b === transforms.color.color.b && backColor.h === transforms.color.color.h) {
                    isShapeNotVisible = true;
                }

                /*var xLocal = localTransform.xy[0][2]*rendererObj.GLOBAL_SCALE, yLocal = localTransform.xy[1][2]*rendererObj.GLOBAL_SCALE;
                if ((xLocal < -halfCanvasWidth || xLocal>halfCanvasWidth)&&(yLocal<-halfCanvasHeight || Local>halfCanvasHeight)) {
                    CInk.log("Shape is out of bound, so skipping.");
                    var isShapeNotVisible = true;
                }
                if (!isShapeNotVisible) {
                    if (xmin > xLocal && xLocal >=0) xmin = xLocal;
                    if (xmax < xLocal && xLocal < canvasWidth) xmax = xLocal;
                    if (ymin > yLocal && yLocal >=0) ymin = yLocal;
                    if (ymax < yLocal && yLocal < canvasHeight) ymax = yLocal;
                    //console.log(xmin,xmax,ymin,ymax,xLocal,yLocal);
                }*/
                
                switch (shape.name) {
                case "CIRCLE":
                    if (!isShapeNotVisible) {
                        draw(false, localTransform, function (ctx) {
                            ctx.beginPath();
                            applyShadowTransform(ctx, newMiscTransforms);
                            ctx.fillStyle = colorToRgba(localColor);
                            ctx.arc(0, 0, 0.5, 0, 2 * Math.PI, true);
                            ctx.fill();
                            ctx.closePath();                      
                        });
                    }
                    break;
                    
                case "SQUARE":
                    if (!isShapeNotVisible) {
                        draw(false, localTransform, function (ctx) {
                            ctx.beginPath();
                            applyShadowTransform(ctx, newMiscTransforms);
                            ctx.fillStyle = colorToRgba(localColor);
                            ctx.fillRect(-0.5, -0.5, 1, 1);
                            ctx.closePath();
                        });
                    }
                    break;
                
                case "TRIANGLE":
                    if (!isShapeNotVisible) {
                        draw(false, localTransform, function (ctx) {
                            var scale, i;
                            ctx.beginPath();
                            scale = 0.57735; // Scales the side of the triagle down to unit length.
                            ctx.moveTo(0, -scale);
                            for (i = 1; i <= 3; i += 1) {
                                ctx.lineTo(scale * Math.sin(i * 2 * Math.PI / 3), -scale * Math.cos(i * 2 * Math.PI / 3));
                            }
                            applyShadowTransform(ctx, newMiscTransforms);
                            ctx.fillStyle = colorToRgba(localColor);
                            ctx.fill();
                            ctx.closePath();            
                        });
                    }
                    break;
                    
                case "ECHO":
                    if (!isShapeNotVisible && newTxtTransform.txt && newTxtTransform.txt.length > 0) {
                        echoTransform = clone(localTransform); //For ECHO only translation is scaled by GLOBAL_SCALE factor.
                        echoTransform.xy[0][2] = (echoTransform.xy[0][2] + globalTransforms.gx * localTransform.xy[0][0]) * rendererObj.GLOBAL_SCALE;
                        echoTransform.xy[1][2] = (echoTransform.xy[1][2] + globalTransforms.gy * localTransform.xy[1][1]) * rendererObj.GLOBAL_SCALE;
                        draw(false, echoTransform, function (ctx) {
                            var f = '';
                            if (newTxtTransform.fontStyle !== '') {
                                f += newTxtTransform.fontStyle;
                                f += ' ';
                            }
                            f += normalizeFontSize(newTxtTransform.fontSize);
                            f += newTxtTransform.fontSizeUnit;
                            f += ' ';
                            f += newTxtTransform.fontName;
                            ctx.font = f;
                            ctx.textAlign = newTxtTransform.textAlignment;
                            ctx.textBaseline = newTxtTransform.textBaseline;
                            applyShadowTransform(ctx, newMiscTransforms);
                            if (newTxtTransform.isStrokeText) {
                                ctx.strokeStyle = colorToRgba(localColor);
                                ctx.lineWidth = newTxtTransform.strokeWidth;//normalizeStrokeWidth(newTxtTransform.strokeWidth);
                                ctx.strokeText(newTxtTransform.txt, 0, 0);
                            } else {
                                ctx.fillStyle = colorToRgba(localColor);
                                ctx.fillText(newTxtTransform.txt, 0, 0);
                            }
                        }, false, true, false); //Texts render can be funny in Chrome if font size is too small
                                                //due to bug#88404. (http://code.google.com/p/chromium/issues/detail?id=88404)
                    }
                    break;
                    
                case "STOPTIME":
                    if (!isNotDefined(timerObj)) {
                        clearTimeout(timerObj);
                        timerObj = null;
                    }
                    break;
                
                case "LINE":
                    if (!isShapeNotVisible) {
                        draw(false, localTransform, function (ctx) {
                            ctx.beginPath();
                            ctx.lineWidth = normalizeStrokeWidth(newTxtTransform.strokeWidth);
                            applyShadowTransform(ctx, newMiscTransforms);
                            ctx.strokeStyle = colorToRgba(localColor);
                            ctx.moveTo(0, -0.5);
                            ctx.lineTo(0, 0.5);
                            ctx.stroke();
                        });
                    }
                    break;
                
                    
                default:
                    if (!isNotDefined(code.shapes[shape.name])) { //Then this is a path.
                        if (!isShapeNotVisible) {
                            schedulePathDraw(shape.name, newTransforms);
                        }
                        
                    } else { //Else this is another rule.
                        tD = new ThreadedRuleDraw(shape.name, newTransforms, priority);
                        q(tD);
                    }
                    break;
                }
            }
            i += 1;
            if (i < shapes.length) {
                tS = new ThreadedShapeDraw(i, shapes, transforms, priority);
                q(tS);
            }    
        }
        function updateBackColor() {
            var colorAdj, backgroundColor, c;
            colorAdj = backColor;
            backgroundColor = {h: 0, s: 0, b: 1, a: 1};
            c = adjustColor(colorAdj, backgroundColor).color;
            backColor = c;
        }
        function drawBackground() {
            backgroundZ = draw(true, {xy: IDENTITY_TRANSFORM(), z: backgroundZ}, function (ctx) {
                ctx.fillStyle = colorToRgba(backColor);
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }, false, false);
        }
        function eventHandler(ruleName, event, eventType) {
            var foregroundColor, transform, txtTrans, miscTransform;
            foregroundColor = {h: 0, s: 0, b: 0, a: 1};
            if (eventType === 'mouse') {
                transform = toAffineTransformation(1, 0, (event.pageX - halfCanvasWidth) / rendererObj.GLOBAL_SCALE,
                                                   0, 1, (event.pageY - halfCanvasHeight) / rendererObj.GLOBAL_SCALE);
            } else {
                transform = IDENTITY_TRANSFORM();
            }
            txtTrans = null;
            miscTransform = null;
            if (userGlobalTransform !== null) {
                if (eventType === 'mouse') {
                    transform = compose(transform, userGlobalTransformNoTranslation);
                } else {
                    transform = userGlobalTransform.geo.xy;
                }
                foregroundColor = userGlobalTransform.color;
                if (eventType === 'key') {
                    txtTrans = clone(userGlobalTransform.txt);
                    if (txtTrans === null) {
                        txtTrans = {txt: ''};
                    }
                    txtTrans.txt += String.fromCharCode(event.which);
                } else {
                    txtTrans = userGlobalTransform.txt;
                }
                miscTransform = userGlobalTransform.misc;
            } else if (eventType === 'key') {
                txtTrans = {txt: String.fromCharCode(event.which)};
            }
            
            if (eventType === 'time') {
                drawAllShapes(0, code.rules[ruleName].def[0].c,
                    {geo: {xy: transform, z: 1}, color: {color: foregroundColor, target: null}, txt: txtTrans, misc: miscTransform}, 5, true);
            } else {
                drawRule(ruleName,
                    {geo: {xy: transform, z: 1}, color: {color: foregroundColor, target: null}, txt: txtTrans, misc: miscTransform}, 5, true);
            }
            if (!rendering) {
                tick(true);
            }
        }
        
        function setupEventHandlers() {
            if (jQ) {
                var listnerDom = jQ(canvas).parent().hasClass('CInkWrapper') ? jQ(canvas).parent() : jQ(canvas);
                if (!isNotDefined(code.rules.MOUSECLICK)) {
                    listnerDom.bind('click.Renderer.' + ID, function (e) {
                        eventHandler("MOUSECLICK", e, "mouse");
                    });
                    //hasEvents = true;
                }
                if (!isNotDefined(code.rules.MOUSEMOVE)) {
                    listnerDom.bind('mousemove.Renderer.' + ID, function (e) {
                        eventHandler("MOUSEMOVE", e, "mouse");
                    });
                    //hasEvents = true;
                }
                if (!isNotDefined(code.rules.TYPE)) {
                    listnerDom.attr("tabindex", "0").bind('mousedown.Renderer.' + ID, function () { $(this).focus(); return false; })
                        .bind('keypress.Renderer.' + ID, function (e) {
                            eventHandler("TYPE", e, "key");
                            e.preventDefault();
                        });
                    //hasEvents = true;
                }
            }
        }
        function removeEventHandlers() {
            if (jQ) {
                var listnerDom = jQ(canvas).parent().hasClass('CInkWrapper') ? jQ(canvas).parent() : jQ(canvas);
                listnerDom.unbind('.Renderer.' + ID);
                if (!isNotDefined(timerObj)) {
                    clearTimeout(timerObj);
                    timerObj = null;
                }
            }
        }
        function renderingPostProcess(isByEvent) {
            var i, x, y, z, xy, xy1, xy2, tileW, buffer, transform, invTransform, backCanvas;
            if (zEnabled) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                backCanvas = canvases[backgroundZ];
                if (!hasEvents) {
                    ctx.drawImage(canvases[backgroundZ], 0, 0);
                    jQ(backCanvas).remove();
                }
                //Merging changes from all auxilary canvases into main original canvas.
                for (i = 0; i < sortedZIndices.length; i += 1) {
                    z = sortedZIndices[i];
                    if (z === 1 || z === backgroundZ) {
                        continue;
                    }
                    
                    ctx.drawImage(canvases[z], 0, 0);
                    //Deleting this auxilary canvas.
                    jQ(canvases[z]).remove();
                }
                if (hasEvents) { //Resetting this list for events.
                    sortedZIndices = [backgroundZ, 1];
                    canvases = {1: canvas};
                    canvases[backgroundZ] = backCanvas;
                }
            }
            if (!isNotDefined(code.tile)) {
                tileW = Math.round((canvasWidth / canvasHeight) * tileH);
                
                //Buffering current graphics to a backup canvas.
                buffer = document.createElement('canvas');
                buffer.height = tileH;
                buffer.width = tileW;
                buffer.getContext('2d').drawImage(canvas, 0, 0, tileW, tileH);
                
                //Clearing canvas.
                canvas.width = 0; canvas.width = canvasWidth;
                ctx = canvas.getContext('2d');
                drawBackground();
                ctx.mozImageSmoothingEnabled = true;
                
                transform = adjustTransform(code.tile.geo, {xy: IDENTITY_TRANSFORM(), z: 1}).xy;
                invTransform = invert3x3Matrix(transform);
                if (invTransform !== null) {
                    setTransform(transform, ctx, false);
                    if (isInPlaceTiling) { //If we are applying the transformation to each tile indivisually.
                        for (y = 0; y < canvasHeight; y += tileH) {
                            for (x = 0; x < canvasWidth; x += tileW) {
                                xy = compose(invTransform, [[x], [y], [1]]);
                                ctx.drawImage(buffer, xy[0][0], xy[1][0]);
                            }
                        }
                    } else { // or if are first applying the transsformation to the whole of canvas then simply tiling that.
                        setTransform(transform, ctx, false);
                        ctx.fillStyle = ctx.createPattern(buffer, 'repeat');
                        xy1 = compose(invTransform, [[0], [0], [1]]);
                        xy2 = compose(invTransform, [[canvasWidth], [canvasHeight], [1]]);
                        ctx.fillRect(xy1[0][0], xy1[1][0], xy2[0][0], xy2[1][0]);
                    }
                } else {
                    CInk.err("Cannot tile this.");
                }
            }
        }
        function tick(isByEvent) { //Neat trick. Adapted from Aza Raskin's Algorithm Ink. Without this, CInk wouldn't be possible.
            var start, concurrent, i, end, stay;
            if (queue.length > 0) {
                rendering = true;
                start = new Date();
                concurrent = Math.min(queue.length, rendererObj.MAX_THREADS);
                for (i = 1; i <= concurrent; i += 1) {
                    queue.shift().start(isByEvent);
                }
                end = new Date();
                stay = 2 * (end - start);
                if (hasEvents) {
                    stay = stay < 10 ? 10 : stay; //In case of events if stay is too low then many times event may not be fired.
                }
                setTimeout(function () { tick.call(rendererObj, isByEvent); }, stay);
            } else {
                renderingPostProcess(isByEvent);
                if (!isByEvent) {
                    if (!isNotDefined(callBackOnFinish)) {
                        setTimeout(function () { callBackOnFinish(true); }, 500);
                    }
                }
                if (zEnabled && !hasEvents) {
                    jQ(canvas).unwrap();
                }
                if (!isNotDefined(callOnDisposeFinish)) {
                    setTimeout(callOnDisposeFinish, 100);
                }
                shutDown = false;
                rendering = false;
            }
        }
        
        //---------------
        //Public methods.
        //---------------
        this.shutAndDispose = function shutAndDispose(argCallOnDisposeFinish) { //After calling this, this Renderer instance shouldn't be reused.
            var listnerDom, b;
            if (shutDown) {
                CInk.log('Current Renderer asked to shutdown: Ignoring as already shutting down.');
                return false; //Since we are already shutting down.
            }
            
            CInk.log('Current Renderer asked to shutdown: Aye aye sir!');
            shutDown = true;
            queue = [];
            removeEventHandlers();
            
            //renderingPostProcess(); will be called by tick().
            
            if (!rendering) {
                if (jQ && jQ(canvas).parent().hasClass('CInkWrapper')) {
                    b = jQ(canvas).next();
                    jQ(canvas).unwrap();
                    if (b.length !== 0) {
                        b.remove();
                    }
                }
                if (!isNotDefined(argCallOnDisposeFinish)) {
                    setTimeout(argCallOnDisposeFinish, 100);
                }
                shutDown = false;
            } else {
                callOnDisposeFinish = argCallOnDisposeFinish;
            }
            return true;
        };
        this.render = function render(variantName) {
            var ruleName, foregroundColor, transform, txtTransform;
            if (!isNotDefined(variantName) && !Math.seedrandom) {
                CInk.warn("Math.seedrandom not found. Cannot use provided variant name. Please include depends/seedrandom-raw.js.");
            }
            if (Math.seedrandom) {
                CInk.log("Math.seedRandom found. Now variation can be captured by name.");
                if (isNotDefined(variantName)) {
                    variantName = num2variantName(new Date().getTime());
                    window.dummy = Math.seedrandom(variantName); //Google Closure has a bug which deletes this code if we don't use the returned result.
                    CInk.log("Generated variant name:", variantName);
                } else {
                    variantName = variantName.toUpperCase();
                    CInk.log("Provided variant name:", variantName);
                    window.dummy = Math.seedrandom(variantName); //Google Closure has a bug which deletes this code if we don't use the returned result.
                }
            }
        
            updateBackColor();
            if (isNotDefined(code.tile)) {
                drawBackground();
                setupEventHandlers();
            }
            
            ruleName = code.startShape;
            foregroundColor = {h: 0, s: 0, b: 0, a: 1};
            transform = {xy: IDENTITY_TRANSFORM(), z: 1};
            txtTransform = null;
            miscTransform = null;
            if (!isNotDefined(code.size)) {
                userGlobalTransform = {};
                transform = adjustTransform(code.size.transform.geo, transform);
                userGlobalTransform.geo = transform;
                userGlobalTransformNoTranslation = clone(userGlobalTransform.geo.xy);
                userGlobalTransformNoTranslation[0][2] = 0; //Removing only x and y transforms.
                userGlobalTransformNoTranslation[1][2] = 0;
                foregroundColor = userGlobalTransform.color = adjustColor(code.size.transform.color, foregroundColor).color;
                txtTransform = userGlobalTransform.txt = adjustText(code.size.transform.txt, null);
                miscTransform = userGlobalTransform.misc = adjustMisc(code.size.transform.misc, null);
            }
            drawRule(ruleName, {geo: transform, color: {color: foregroundColor, target: null}, txt: txtTransform, misc: miscTransform});
            
            tick(false);
            return variantName;
        };
    };
})(jQuery); //End of anonymous wrapper function.