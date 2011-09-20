
/**
* @preserve
* CInk
* Version: 2.0
* GPL v3 License
* Author: AppleGrew
* Website: http://cink.applegrew.com
* License Details:-
*   CInk - Pure Javascript CFDG compiler.
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
(function () {
var CInk = window.CInk, args, UNICODE_PATTERN, predefinedFuncs, geoTrans, txtTrans, pathTrans, shadowTrans;
//==============
//Util Functions
//==============
function isNotDefined(v) {
    return v === null || typeof v === 'undefined';
}
function d2r(d) { return d * (Math.PI / 180); }
function r2d(r) { return r * (180 / Math.PI); }
function sortedAscPush(arr, o, key) {//We could have used sort() after push() but that would be at best O(N lnN). This is O(N).
    if (arr.length === 0) {
        arr.push(o);
        return;
    }
    var i, j;
    for (i = 0; i < arr.length; i += 1) {
        if (arr[i][key] >= o[key]) {
            break;
        }
    }
    for (j = arr.length; j > i; j -= 1) {
        arr[j] = arr[j - 1];
    }
    arr[i] = o;
}
function indexOf(arr, v) {
    var i;
    for (i = 0; i < arr.length; i += 1) {
        if (arr[i] === v) {
            return i;
        }
    }
    return -1;
}
/*function isChildrenValid(children, required, optional, minArgs) {
    var i, k, argC, key;
    for (i = 0; i < required.length; i += 1) {
        if(isNotDefined(children[required[i]])) {
            CInk.err(required[i] + " is not found in " + children);
            return false;
        }
    }
    k = [];
    argC = 0;
    for (key in children) {
        if (children.hasOwnProperty(key)) {
            if (indexOf(required, key) === -1 && indexOf(optional, key) === -1) {
                CInk.err(key + " is not allowed here.");
                return false;
            }
            argC += 1;
        }
    }
    if (argC < minArgs) {
        CInk.err(argC + " no. of arguments supplied. Need minimum of " + minArgs + " arguments.");
        return false;
    }
    return true;
}*/
UNICODE_PATTERN = /\{u([0-9]+)\}/gi;
function evaluteTxtAdjustments(transArr) {
    var outTrans = {}, lastTxt = '', i, type, t, ft, cc, c;
    
    function getSafeTxt() {
        return isNotDefined(outTrans.t) ? '' : outTrans.t;
    }
    for (i = 0; i < transArr.length; i += 1) {
        type = transArr[i].type;
        switch (type) {
        case 'fn':
        case 'fu':
        case 'base':
        case 'align':
        case 'st':
        case 'fstyle':
            if (isNotDefined(outTrans[type])) {
                outTrans[type] = transArr[i].val; //If type is e then Renderer should empty previous text.
            }
            break;
        case 'e':
            t = getSafeTxt();
            if (t.length !== 0) {
                lastTxt = t;
                outTrans.t = null;
            } else {
                outTrans.e = true;
            }
            break;
        case 'fs':
        case 'sw':
            if (isNotDefined(outTrans[type])) {
                outTrans[type] = 0;
            }
            outTrans[type] += transArr[i].val;
            break;
        case 't':
            if (isNotDefined(outTrans[type])) {
                outTrans[type] = '';
            }
            t = transArr[i].val;
            UNICODE_PATTERN.lastIndex = 0;
            while ((c = UNICODE_PATTERN.exec(t)) !== null) {
                t = t.replace(c[0], String.fromCharCode(c[1]));
                UNICODE_PATTERN.lastIndex = UNICODE_PATTERN.lastIndex - c[0].length + 1;
            }
            if (t.length !== 0) {
                lastTxt = '';
            }
            outTrans[type] = outTrans[type].concat(t);
            break;
        case 'bkspc':
            t = getSafeTxt();
            if (t.length !== 0) {
                lastTxt = t;
                outTrans.t = t.substr(0, t.length - 1);
            } else {
                outTrans.bkspc = true; //Value not really needed, but given to comply with general assumptions.
            }
            break;
        case '_t':
            t = lastTxt;
            if (t.length === 0) {
                t = getSafeTxt();
            }
            if (t.length !== 0) {
                outTrans.t = getSafeTxt().concat(String.fromCharCode(t.charCodeAt(t.length - 1) + transArr[i].val));
            } else {
                outTrans._t = true;
            }
            break;
        }
    }
    if (!isNotDefined(outTrans.t)) {
        //Convert unicode chars back to notation form, i.e. {uxxx} form. xxx is the decimal value of the char.
        t = outTrans.t;
        ft = '';
        for (i = 0; i < t.length; i += 1) {
            cc = t.charCodeAt(i);
            if (cc >= 32 && cc <= 126) {
                ft += t.charAt(i);
            } else {
                ft += '{u' + cc + '}';
            }
        }
        outTrans.t = ft;
    }
    return outTrans;
}

//================
//Global Functions
//================
if (!CInk) {
    CInk = window.CInk = {};
    CInk.log = function log() {
        if (console && console.log) {
            args = Array.prototype.slice.call(arguments);
            console.log.apply(console, args);
        }
    };
    CInk.warn = function warn() {
        if (console && console.warn) {
            args = Array.prototype.slice.call(arguments);
            console.warn.apply(console, args);
            console.trace();
        }
    };
    CInk.err = function err() {
        if (console && console.error) {
            args = Array.prototype.slice.call(arguments);
            console.error.apply(console, args);
            console.trace();
        }
    };
}
predefinedFuncs = {
    sin: {agc: 1, f: function sin(x){ return Math.sin(d2r(x)); }},
    cos: {agc: 1, f: function cos(x){ return Math.cos(d2r(x)); }},
    tan: {agc: 1, f: function tan(x){ return Math.tan(d2r(x)); }},
    cot: {agc: 1, f: function cot(x){ return 1 / Math.tan(d2r(x)); }},
    asin: {agc: 1, f: function asin(x){ return r2d(Math.asin(x)); }},
    acos: {agc: 1, f: function acos(x){ return r2d(Math.acos(x)); }},
    atan: {agc: 1, f: function atan(x){ return r2d(Math.atan(x)); }},
    acot: {agc: 1, f: function acot(x){ return 90 - predefinedFuncs.atan(x); }},
    sinh: {agc: 1, f: function sinh(x) { x = d2r(x); return (Math.exp(x) - Math.exp(-x)) / 2; }},
    cosh: {agc: 1, f: function cosh(x) { x = d2r(x); return (Math.exp(x) + Math.exp(-x)) / 2; }},
    tanh: {agc: 1, f: function tanh(x) { x = d2r(x); return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x)); }},
    asinh: {agc: 1, f: function asinh(x) { return r2d(Math.log(x + Math.sqrt(x * x + 1))); }},
    acosh: {agc: 1, f: function acosh(x) { return r2d(Math.log(x + Math.sqrt(x * x - 1))); }},
    atanh: {agc: 1, f: function atanh(x) { return r2d(0.5 * Math.log((1 + x) / (1 - x))); }},
    log: {agc: 1, f: Math.log},
    log10: {agc: 1, f: function log10(x){return Math.log(x) / Math.LN10;}},
    sqrt: {agc: 1, f: Math.sqrt},
    exp: {agc: 1, f: function exp(x){return Math.pow(Math.E, x);}},
    abs: {agc: 1, f: Math.abs},
    atan2: {agc: 2, f: Math.atan2},
    mod: {agc: 2, f: function mod(x, y){return x % y;}}
};
geoTrans = ['gx', 'gy', 'x', 'y', 'r', 's', 'skew', 'f', 'z'];
txtTrans = ['t', 'e', '_t', 'bkspc', 'fn', 'fs', 'fu', 'st', 'base', 'align', 'sw', 'fstyle'];
shadowTrans = ['shx', 'shy', 'shblur', 'shh', 'shsat', 'shb', 'sha'];
pathTrans = ['x0', 'x1', 'x2', 'y0', 'y1', 'y2', 'rad', 'rx', 'ry', 'stw', 'p', 'p1'];
CInk.Compile = function Compile(code) {
    var startTime, compiled, currentTransforms, stillOrphanChildren, COMMENT_PATTERN, 
        error_cnt, error_off, error_la, i, j, hasErr, allShapes;

    startTime = new Date().getTime();
    compiled = {
        startShape: null, backColor: null, tile: null, hasZ: false, rules: {},
        shapes: {CIRCLE: [], SQUARE: [], TRIANGLE: [], ECHO: [], LINE: [], STOPTIME: []}
    };
    currentTransforms = []; //This mutates between being an array and a map. It starts as an array then is converted into a map by groupTransforms().
    stillOrphanChildren = [];
    
    function includeFile(file) {//TODO
    }
    function startShape(shape) {
        if (compiled.startShape === null) {
            compiled.startShape = shape;
        }
    }
    function background() {
        if (compiled.backColor === null) {
            if (currentTransforms.length === 0) {
                currentTransforms = [];
                return 1;
            }
            compiled.backColor = {color: {}};
            var c = compiled.backColor.color, i;
            for (i in currentTransforms) {
                if(currentTransforms.hasOwnProperty(i)) {
                    c[currentTransforms[i].type] = currentTransforms[i].val;
                }
            }
        }
        currentTransforms = [];
        return 0;
    }
    function tile() {
        if (compiled.tile === null) {
            if (stillOrphanChildren.length === 0) {
                stillOrphanChildren = [];
                return 1;
            }
            //compiled.tile = stillOrphanChildren[0].transform; IGNORING TILE, AS ITS IMPLEMENTATION IS BROKEN.
        }
        stillOrphanChildren = [];
        return 0;
    }
    function sizeF() {
        if (isNotDefined(compiled.size)) {
            if (stillOrphanChildren.length === 0) {
                stillOrphanChildren = [];
                return 1;
            }
            compiled.size = stillOrphanChildren[0];
        }
        stillOrphanChildren = [];
        return 0;
    }
    function rule(name, wt) {
        if (!isNotDefined(compiled.shapes[name])) {
            CInk.err('Cannot mix rules and shapes with the same name.');
            stillOrphanChildren = [];
            return 1;
        }
        
        if (wt <= 0) {
            wt = 1.0;
        }
        if (isNotDefined(compiled.rules[name])) {
            compiled.rules[name] = {totalWt: 0, def: []};
        }
        sortedAscPush(compiled.rules[name].def, {
            wt: wt,
            c: stillOrphanChildren
        });
        /*compiled.rules[name].def.push({
            wt: wt,
            c: stillOrphanChildren
        });*/
        compiled.rules[name].totalWt += wt;
        stillOrphanChildren = [];
        return 0;
    }
    function shortenPathOpName(opName) {
        var op = opName.match(/^(.+)(REL|TO)$/);
        if (op !== null) {
            op = op[1];
            if (op == 'MOVE')
                return 'mv';
            else if (op == 'ARC')
                return 'ac';
            else if (op == 'CURVE')
                return 'cv';
            else if (op == 'LINE')
                return 'ln';
        } else if (opName === 'CLOSEPOLY') {
            return 'endP';
        }
    }
    function replacement(c, index) {
        if (isNotDefined(index)) {
            index = stillOrphanChildren.length - 1;
        }
        if (stillOrphanChildren.length > 0) {
            stillOrphanChildren[index].name = c;
        }
    }
    function loop(c) {
        var i, children, l;
        for (i = stillOrphanChildren.length - 1; i >= 0; i -= 1) {
            if (isNotDefined(stillOrphanChildren[i].name)) {
                children = stillOrphanChildren.splice(i, stillOrphanChildren.length - i);
                l = {name: '__loop*', loopTo: c,
                    adjustments: children.shift(), //Removing the first modification, i.e. adjustment, it has no 'name'.
                    body: children
                };
                stillOrphanChildren.push(l);
                return 0;
            }
        }
        return 3;
    }
    function groupTransforms() {
        var th = {geo: [], color: {}, txt: [], path: {}, misc: {}}, i, t;
        
        for (i = 0; i < currentTransforms.length; i += 1) {
            t = currentTransforms[i].type;
            if (indexOf(geoTrans, t) > -1) {
                th.geo.push(currentTransforms[i]);
                
            } else if (indexOf(shadowTrans, t) > -1) {
                if (isNotDefined(th.misc[t])) {
                    th.misc[t] = currentTransforms[i].val;
                }
                
            } else if (indexOf(txtTrans, t) > -1) {
                th.txt.push(currentTransforms[i]);
                
            } else if (indexOf(pathTrans, t) > -1) {
                if (isNotDefined(th.path[t])) {
                    th.path[t] = currentTransforms[i].val;
                }
                
            } else {
                th.color[t] = currentTransforms[i].val;
            }
        }
        currentTransforms = th;
    }
    function makeGeoUniqueAndOrdered() {
        var th = {}, g, i, t;
        g = currentTransforms.geo;
        for (i = 0; i < g.length; i += 1) {
            th[g[i].type] = g[i].val;
        }
        t = [];
        for (i = 0; i < geoTrans.length; i += 1) { //This reorders the geo trans in sequence: gx gy x y r s skew f z.
            if (!isNotDefined(th[geoTrans[i]])) {
                t.push({type: geoTrans[i], val: th[geoTrans[i]]});
            }
        }
        if (t.length < currentTransforms.geo.length) {
            CInk.warn("Some geometric transforms could have been dropped from: ", currentTransforms.geo);
        }
        currentTransforms.geo = t;
    }
    function modificationCaptured() {
        //Evaluating text transforms here; this will make all transforms in it unique and put less load on Renderer.
        currentTransforms.txt = evaluteTxtAdjustments(currentTransforms.txt);
        stillOrphanChildren.push({ transform: currentTransforms });
        currentTransforms = [];
    }
    function checkPathOp(opName) {
        currentTransforms.path.isRelative = opName.search(/REL$/) !== -1;
        var p = currentTransforms.path.p, p1 = currentTransforms.path.p1;
        if (!isNotDefined(p)) {
            if (opName === 'ARCTO' || opName === 'ARCREL') {
                if (!isNotDefined(p) && p !== 'large') {
                    CInk.err("Invalid paramenter for " + opName + ". Only 'cw' and 'large' allowed. Given: ", p);
                    return -1;
                }
            } else if (opName === 'CLOSEPOLY') {
                if (!isNotDefined(p)) {
                    if (p === 'align') {
                        CInk.warn("Parameter not supported for CLOSEPOLY. It will be ignored.");
                    } else {
                        CInk.err("Invalid paramenter for CLOSEPOLY. Only 'align' is allowed. Given: ", p);
                        return -1;
                    }
                }
            } else {
                CInk.err("Paramenter not allowed for " + opName + ". Given: ", p);
                return -1;
            }
        }
        if (!isNotDefined(p1)) {
            if (opName === 'ARCTO' || opName === 'ARCREL') {
                if (p1 !== 'cw') {
                    CInk.err("Invalid paramenter for " + opName + ". Only 'cw' and 'large' allowed. Given: ", p1);
                    return -1;
                }
            } else if (opName === 'CLOSEPOLY') {                
                CInk.err("Invalid paramenter for CLOSEPOLY. Only 'align' is allowed. Given: ", p1);
                return -1;
            } else {
                CInk.err("Paramenter not allowed for " + opName + ". Given: ", p1);
                return -1;
            }
        }
        return 0;
    }
    function checkPathCmd(cmdName) {
        var path;
        if (cmdName !== 'FILL' && cmdName !== 'STROKE') {
            CInk.err('Only FILL and STROKE are valid path commands. Given: ', cmdName);
            return -1;
        }
        if (stillOrphanChildren.length > 0) {
            path = stillOrphanChildren[stillOrphanChildren.length - 1].transform.path;
            if (cmdName === 'FILL') {
                if (!isNotDefined(path.stw)) {
                    CInk.err('Stroke width cannot be specified for FILL command.');
                    return -1;
                }
                if (!isNotDefined(path.p)) {
                    if (path.p === 'evenodd') {
                        CInk.warn('Parameter for FILL is not supported, and will be ignored.');
                    } else {
                        CInk.err("FILL can accept only 'evenodd' as parameter. Given: ", path.p);
                        return -1;
                    }
                }
            } else { //It is STROKE then.
                if (!isNotDefined(path.p)) {
                    if (path.p === 'miterjoin') {
                        path.p = 'miter';
                    } else if (path.p === 'roundjoin') {
                        path.p = 'round';
                    } else if (path.p === 'beveljoin') {
                        path.p = 'bevel';
                    } else {
                        CInk.err("STROKE can accept only 'miterjoin', 'roundjoin' or  'beveljoin' as join parameter. Given: ", path.p);
                        return -1;
                    }
                }
                if (!isNotDefined(path.p1)) {
                    if (path.p1 === 'buttcap') {
                        path.p1 = 'butt';
                    } else if (path.p1 === 'roundcap') {
                        path.p1 = 'round';
                    } else if (path.p1 === 'squarecap') {
                        path.p1 = 'square';
                    } else {
                        CInk.err("STROKE can accept only 'buttcap', 'roundcap' or  'squarecap' as cap parameter. Given: ", path.p1);
                        return -1;
                    }
                }
            }
        }
        return 0;
    }
    function path(name) {
        if (!isNotDefined(compiled.shapes[name]) || !isNotDefined(compiled.rules[name])) {
            CInk.err('Duplicate definition. This path is already defined as a path or rule.');
            stillOrphanChildren = [];
            return 1;
        }
        compiled.shapes[name] = stillOrphanChildren;
        stillOrphanChildren = [];
        return 0;
    }
    
    function pointX(v, i) {
        var k = (i == 0 ? 'x0' : (i == 1 ? 'x1' : 'x2'));
        currentTransforms.push({type: k, val: v});
    }
    function pointY(v, i) {
        var k = (i == 0 ? 'y0' : (i == 1 ? 'y1' : 'y2'));
        currentTransforms.push({type: k, val: v});
    }
    function radiusX(r) {
        if (r === 0) {
            CInk.warn("Setting rx to 1, since zero is not allowed for rx. Given ", r);
            r = 1;
        }
        currentTransforms.push({type: 'rx', val: r});
    }
    function radiusY(r) {
        if (r === 0) {
            CInk.warn("Setting ry to 1, since zero is not allowed for ry. Given ", r);
            r = 1;
        }
        currentTransforms.push({type: 'ry', val: r});
    }
    function radius(r) {
        currentTransforms.push({type: 'rad', val: r});
    }
    function parameters(p) {
        var t = 'p';
        if (p === 'buttcap' || p === 'roundcap' || p === 'squarecap' || p === 'cw') {
            t = 'p1';
        }
        currentTransforms.push({type: t, val: p});
    }
    function size(x, y, z) {
        currentTransforms.push({type: 's', val: {x:x, y:y, z:z}});
    }
    function zLocation(z) {
        currentTransforms.push({type: 'z', val: z});
        compiled.hasZ = true;
    }
    function xGlobal(x) {
        currentTransforms.push({type: 'gx', val: x});
    }
    function yGlobal(y) {
        currentTransforms.push({type: 'gy', val: y});
    }
    function xLocation(x) {
        currentTransforms.push({type: 'x', val: x});
    }
    function yLocation(y) {
        currentTransforms.push({type: 'y', val: y});
    }
    function skew(y, x) {
        currentTransforms.push({type: 'skew', val: {x:x, y:y}});
    }
    function reflection(num) {
        currentTransforms.push({type: 'f', val: num});
    }
    function orientation(num) {
        currentTransforms.push({type: 'r', val: num});
    }
    function functionType(name, argC) {
        if (isNotDefined(predefinedFuncs[name])) {
            return -1;
        }
        if (predefinedFuncs[name].agc !== argC) {
            return -2;
        }
        return predefinedFuncs[name].f;
    }
    function expFunction(fType) {
        var args = Array.prototype.slice.call(arguments);
        args.shift(fType);
        return fType.apply(this, args );
    }
    function hue(v, isTargetValue) {
        var type = 'h';
        if (isTargetValue) {
            type = 'h_';
        }
        currentTransforms.push({type: type, val: v});
    }
    function saturation(v, isTargetValue) {
        var type = 'sat';
        if (isTargetValue) {
            type = 'sat_';
        }
        currentTransforms.push({type: type, val: v});
    }
    function brightness(v, isTargetValue) {
        var type = 'b';
        if (isTargetValue) {
            type = 'b_';
        }
        currentTransforms.push({type: type, val: v});
    }
    function alpha(v, isTargetValue) {
        var type = 'a';
        if (isTargetValue) {
            type = 'a_';
        }
        currentTransforms.push({type: type, val: v});
    }
    function hueTarget(v) {
        currentTransforms.push({type: '_h', val: v});
    }
    function saturationTarget(v) {
        currentTransforms.push({type: '_sat', val: v});
    }
    function brightnessTarget(v) {
        currentTransforms.push({type: '_b', val: v});
    }
    function alphaTarget(v) {
        currentTransforms.push({type: '_a', val: v});
    }
    function shadowOffsetX(v) {
        currentTransforms.push({type: 'shx', val: v});
    }
    function shadowOffsetY(v) {
        currentTransforms.push({type: 'shy', val: v});
    }
    function shadowBlur(v) {
        currentTransforms.push({type: 'shblur', val: v});
    }
    function shadowHue(v) {
        currentTransforms.push({type: 'shh', val: v});
    }
    function shadowSaturation(v) {
        currentTransforms.push({type: 'shsat', val: v});
    }
    function shadowBrightness(v) {
        currentTransforms.push({type: 'shb', val: v});
    }
    function shadowAlpha(v) {
        currentTransforms.push({type: 'sha', val: v});
    }
    function tileDim(v) {
        compiled.tileH = v;
    }
    function allow(opt) {
        opt = opt.toUpperCase();
        /*switch (opt) {
        default: return -1;
        }
        return 0;*/
        return -1;
    }
    function deny(opt) {
        opt = opt.toUpperCase();
        switch (opt) {
        case 'INTILING': compiled.inTiling = false; break;
        case 'CORRECTARCP': compiled.correctArcP = false; break;
        default: return -1;
        }
        return 0;
    }
    function textAppend(t) {
        currentTransforms.push({type: 't', val: t});
    }
    function textAppendUsingLast(n) {
        if (Math.floor(n) !== n) {
            CInk.err("Cannot accept fractional value for |t. Given: ", n);
            return 1;
        }
        n = Math.ceil(n);
        currentTransforms.push({type: '_t', val: n});
        return 0;
    }
    function bckSpc() {
        currentTransforms.push({type: 'bkspc', val: true});
    }
    function truncateText() {
        currentTransforms.push({type: 'e', val: true});
    }
    function fontName(n) {
        currentTransforms.push({type: 'fn', val: n});
    }
    function fontSize(s) {
        currentTransforms.push({type: 'fs', val: s});
    }
    function fontUnit(u) {
        u = u.toLowerCase();
        if (u !== 'pt' && u !== 'px' && u !== 'em') {
            CInk.err('Invalid font unit. It must be either of pt, px or em. Given: ', u);
            return 1;
        }
        currentTransforms.push({type: 'fu', val: u});
        return 0;
    }
    function fontStyle(s) {
        s = s.toLowerCase();
        if (s !== 'italic' && s !== 'bold' && s !== 'cap' && s !== 'normal') {
            CInk.err('Invalid font style. It must be either of italic, bold, cap or normal. Given: ', s);
            return 1;
        }
        currentTransforms.push({type: 'fstyle', val: s});
        return 0;
    }
    function strokeText() {
        currentTransforms.push({type: 'st', val: true});
    }
    function textAlign(a) {
        a = a.toLowerCase();
        if (a !== 'left' && a !== 'right' && a !== 'center' && a !== 'start' && a !== 'end') {
            CInk.err('Invalid font alignment. It must be either of left, right, center, start or end. Given: ', a);
            return 1;
        }
        currentTransforms.push({type: 'align', val: a});
        return 0;
    }
    function textBaseline(b) {
        b = b.toLowerCase();
        if (b !== 'top' && b !== 'hanging' && b !== 'middle' && b !== 'alphabetic' && b !== 'ideographic' && b !== 'bottom') {
            CInk.err('Invalid font baseline. It must be either of top, hanging, middle, alphabetic, ideographic or bottom. Given: ', b);
            return 1;
        }
        currentTransforms.push({type: 'base', val: b});
        return 0;
    }
    function strokeWidth(w, isPath) {
        currentTransforms.push({type: (isPath ? 'stw' : 'sw'), val: w});
    }

/*
	Default template driver for JS/CC generated parsers running as
	browser-based JavaScript/ECMAScript applications.
	
	WARNING: 	This parser template will not run as console and has lesser
				features for debugging than the console derivates for the
				various JavaScript platforms.
	
	Features:
	- Parser trace messages
	- Integrated panic-mode error recovery
	
	Written 2007, 2008 by Jan Max Meyer, J.M.K S.F. Software Technologies
	
	This is in the public domain.
*/

var _dbg_withtrace		= false;
var _dbg_string			= new String();

function __dbg_print( text )
{
	_dbg_string += text + "\n";
}

function __lex( info )
{
	var state		= 0;
	var match		= -1;
	var match_pos	= 0;
	var start		= 0;
	var pos			= info.offset + 1;

	do
	{
		pos--;
		state = 0;
		match = -2;
		start = pos;

		if( info.src.length <= start )
			return 109;

		do
		{

switch( state )
{
	case 0:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 32 ) || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 39 ) || ( info.src.charCodeAt( pos ) >= 58 && info.src.charCodeAt( pos ) <= 64 ) || info.src.charCodeAt( pos ) == 92 || info.src.charCodeAt( pos ) == 96 || ( info.src.charCodeAt( pos ) >= 126 && info.src.charCodeAt( pos ) <= 199 ) ) state = 1;
		else if( info.src.charCodeAt( pos ) == 33 ) state = 2;
		else if( info.src.charCodeAt( pos ) == 40 ) state = 3;
		else if( info.src.charCodeAt( pos ) == 41 ) state = 4;
		else if( info.src.charCodeAt( pos ) == 42 ) state = 5;
		else if( info.src.charCodeAt( pos ) == 43 ) state = 6;
		else if( info.src.charCodeAt( pos ) == 44 ) state = 7;
		else if( info.src.charCodeAt( pos ) == 45 ) state = 8;
		else if( info.src.charCodeAt( pos ) == 47 ) state = 9;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 10;
		else if( info.src.charCodeAt( pos ) == 65 ) state = 11;
		else if( info.src.charCodeAt( pos ) == 66 || info.src.charCodeAt( pos ) == 98 ) state = 12;
		else if( info.src.charCodeAt( pos ) == 67 ) state = 13;
		else if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 14;
		else if( info.src.charCodeAt( pos ) == 70 || info.src.charCodeAt( pos ) == 102 ) state = 15;
		else if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 16;
		else if( info.src.charCodeAt( pos ) == 80 || info.src.charCodeAt( pos ) == 112 ) state = 17;
		else if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 18;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 19;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 20;
		else if( info.src.charCodeAt( pos ) == 88 || info.src.charCodeAt( pos ) == 120 ) state = 21;
		else if( info.src.charCodeAt( pos ) == 89 || info.src.charCodeAt( pos ) == 121 ) state = 22;
		else if( info.src.charCodeAt( pos ) == 90 || info.src.charCodeAt( pos ) == 122 ) state = 23;
		else if( info.src.charCodeAt( pos ) == 91 ) state = 24;
		else if( info.src.charCodeAt( pos ) == 93 ) state = 25;
		else if( info.src.charCodeAt( pos ) == 94 ) state = 26;
		else if( info.src.charCodeAt( pos ) == 123 ) state = 27;
		else if( info.src.charCodeAt( pos ) == 124 ) state = 28;
		else if( info.src.charCodeAt( pos ) == 125 ) state = 29;
		else if( info.src.charCodeAt( pos ) == 34 ) state = 76;
		else if( info.src.charCodeAt( pos ) == 71 || info.src.charCodeAt( pos ) == 103 ) state = 78;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 90;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 68 || info.src.charCodeAt( pos ) == 100 ) state = 176;
		else if( info.src.charCodeAt( pos ) == 97 ) state = 191;
		else if( info.src.charCodeAt( pos ) == 87 || info.src.charCodeAt( pos ) == 119 ) state = 192;
		else if( info.src.charCodeAt( pos ) == 76 ) state = 204;
		else if( info.src.charCodeAt( pos ) == 77 ) state = 206;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 220;
		else if( ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 78 && info.src.charCodeAt( pos ) <= 79 ) || info.src.charCodeAt( pos ) == 81 || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 86 ) || info.src.charCodeAt( pos ) == 99 || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 111 ) || info.src.charCodeAt( pos ) == 113 || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 118 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		break;

	case 1:
		state = -1;
		match = 74;
		match_pos = pos;
		break;

	case 2:
		state = -1;
		match = 6;
		match_pos = pos;
		break;

	case 3:
		state = -1;
		match = 17;
		match_pos = pos;
		break;

	case 4:
		state = -1;
		match = 18;
		match_pos = pos;
		break;

	case 5:
		state = -1;
		match = 3;
		match_pos = pos;
		break;

	case 6:
		state = -1;
		match = 2;
		match_pos = pos;
		break;

	case 7:
		state = -1;
		match = 19;
		match_pos = pos;
		break;

	case 8:
		state = -1;
		match = 1;
		match_pos = pos;
		break;

	case 9:
		state = -1;
		match = 4;
		match_pos = pos;
		break;

	case 10:
		if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 10;
		else if( ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || info.src.charCodeAt( pos ) == 95 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 31;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 77;
		else state = -1;
		match = 70;
		match_pos = pos;
		break;

	case 11:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 178;
		else if( info.src.charCodeAt( pos ) == 82 ) state = 179;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 25;
		match_pos = pos;
		break;

	case 12:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 145;
		else if( info.src.charCodeAt( pos ) == 75 || info.src.charCodeAt( pos ) == 107 ) state = 180;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 74 ) || ( info.src.charCodeAt( pos ) >= 76 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 106 ) || ( info.src.charCodeAt( pos ) >= 108 && info.src.charCodeAt( pos ) <= 113 ) || ( info.src.charCodeAt( pos ) >= 115 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 224;
		else state = -1;
		match = 24;
		match_pos = pos;
		break;

	case 13:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 85 ) state = 207;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 84 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else if( info.src.charCodeAt( pos ) == 76 ) state = 225;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 14:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 52;
		match_pos = pos;
		break;

	case 15:
		if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 32;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 33;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 34;
		else if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 35;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 149;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || info.src.charCodeAt( pos ) == 77 || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || info.src.charCodeAt( pos ) == 109 || ( info.src.charCodeAt( pos ) >= 111 && info.src.charCodeAt( pos ) <= 114 ) || ( info.src.charCodeAt( pos ) >= 118 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 21;
		match_pos = pos;
		break;

	case 16:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 93;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 84 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 116 ) || ( info.src.charCodeAt( pos ) >= 118 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 22;
		match_pos = pos;
		break;

	case 17:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 150;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 42;
		match_pos = pos;
		break;

	case 18:
		if( info.src.charCodeAt( pos ) == 88 || info.src.charCodeAt( pos ) == 120 ) state = 38;
		else if( info.src.charCodeAt( pos ) == 89 || info.src.charCodeAt( pos ) == 121 ) state = 39;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 151;
		else if( info.src.charCodeAt( pos ) == 79 || info.src.charCodeAt( pos ) == 111 ) state = 197;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 84 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 87 ) || info.src.charCodeAt( pos ) == 90 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 110 ) || ( info.src.charCodeAt( pos ) >= 112 && info.src.charCodeAt( pos ) <= 116 ) || ( info.src.charCodeAt( pos ) >= 118 && info.src.charCodeAt( pos ) <= 119 ) || info.src.charCodeAt( pos ) == 122 || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 20;
		match_pos = pos;
		break;

	case 19:
		if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 40;
		else if( info.src.charCodeAt( pos ) == 87 || info.src.charCodeAt( pos ) == 119 ) state = 41;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 95;
		else if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 97;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 152;
		else if( info.src.charCodeAt( pos ) == 75 || info.src.charCodeAt( pos ) == 107 ) state = 153;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 71 ) || info.src.charCodeAt( pos ) == 74 || ( info.src.charCodeAt( pos ) >= 76 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 86 ) || ( info.src.charCodeAt( pos ) >= 88 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 103 ) || info.src.charCodeAt( pos ) == 106 || ( info.src.charCodeAt( pos ) >= 108 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 118 ) || ( info.src.charCodeAt( pos ) >= 120 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 35;
		match_pos = pos;
		break;

	case 20:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 154;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 104 ) || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 50;
		match_pos = pos;
		break;

	case 21:
		if( info.src.charCodeAt( pos ) == 49 ) state = 42;
		else if( info.src.charCodeAt( pos ) == 50 ) state = 43;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 48 || ( info.src.charCodeAt( pos ) >= 51 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 26;
		match_pos = pos;
		break;

	case 22:
		if( info.src.charCodeAt( pos ) == 49 ) state = 44;
		else if( info.src.charCodeAt( pos ) == 50 ) state = 45;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 48 || ( info.src.charCodeAt( pos ) >= 51 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 27;
		match_pos = pos;
		break;

	case 23:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 34;
		match_pos = pos;
		break;

	case 24:
		state = -1;
		match = 15;
		match_pos = pos;
		break;

	case 25:
		state = -1;
		match = 16;
		match_pos = pos;
		break;

	case 26:
		state = -1;
		match = 5;
		match_pos = pos;
		break;

	case 27:
		state = -1;
		match = 13;
		match_pos = pos;
		break;

	case 28:
		if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 46;
		else if( info.src.charCodeAt( pos ) == 66 || info.src.charCodeAt( pos ) == 98 ) state = 47;
		else if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 48;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 49;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 96;
		else state = -1;
		match = 41;
		match_pos = pos;
		break;

	case 29:
		state = -1;
		match = 14;
		match_pos = pos;
		break;

	case 30:
		state = -1;
		match = 73;
		match_pos = pos;
		break;

	case 31:
		if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || info.src.charCodeAt( pos ) == 95 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 31;
		else state = -1;
		match = 72;
		match_pos = pos;
		break;

	case 32:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 54;
		match_pos = pos;
		break;

	case 33:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 182;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 55;
		match_pos = pos;
		break;

	case 34:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 59;
		match_pos = pos;
		break;

	case 35:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 56;
		match_pos = pos;
		break;

	case 36:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 48;
		match_pos = pos;
		break;

	case 37:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 49;
		match_pos = pos;
		break;

	case 38:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 30;
		match_pos = pos;
		break;

	case 39:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 31;
		match_pos = pos;
		break;

	case 40:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 212;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 58;
		match_pos = pos;
		break;

	case 41:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 47;
		match_pos = pos;
		break;

	case 42:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 28;
		match_pos = pos;
		break;

	case 43:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 32;
		match_pos = pos;
		break;

	case 44:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 29;
		match_pos = pos;
		break;

	case 45:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 33;
		match_pos = pos;
		break;

	case 46:
		if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 98;
		else state = -1;
		match = 40;
		match_pos = pos;
		break;

	case 47:
		if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 100;
		else state = -1;
		match = 39;
		match_pos = pos;
		break;

	case 48:
		if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 102;
		else state = -1;
		match = 37;
		match_pos = pos;
		break;

	case 49:
		state = -1;
		match = 51;
		match_pos = pos;
		break;

	case 50:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 222;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 84 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 116 ) || ( info.src.charCodeAt( pos ) >= 118 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 23;
		match_pos = pos;
		break;

	case 51:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 68;
		match_pos = pos;
		break;

	case 52:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 167;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 67;
		match_pos = pos;
		break;

	case 53:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 65;
		match_pos = pos;
		break;

	case 54:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 62;
		match_pos = pos;
		break;

	case 55:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 63;
		match_pos = pos;
		break;

	case 56:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 60;
		match_pos = pos;
		break;

	case 57:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 45;
		match_pos = pos;
		break;

	case 58:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 12;
		match_pos = pos;
		break;

	case 59:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 11;
		match_pos = pos;
		break;

	case 60:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 36;
		match_pos = pos;
		break;

	case 61:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 68 || info.src.charCodeAt( pos ) == 100 ) state = 169;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 67 ) || ( info.src.charCodeAt( pos ) >= 69 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 99 ) || ( info.src.charCodeAt( pos ) >= 101 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 10;
		match_pos = pos;
		break;

	case 62:
		if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 116;
		else state = -1;
		match = 38;
		match_pos = pos;
		break;

	case 63:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 61;
		match_pos = pos;
		break;

	case 64:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 44;
		match_pos = pos;
		break;

	case 65:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 69;
		match_pos = pos;
		break;

	case 66:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 53;
		match_pos = pos;
		break;

	case 67:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 66;
		match_pos = pos;
		break;

	case 68:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 43;
		match_pos = pos;
		break;

	case 69:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 57;
		match_pos = pos;
		break;

	case 70:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 64;
		match_pos = pos;
		break;

	case 71:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 9;
		match_pos = pos;
		break;

	case 72:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 46;
		match_pos = pos;
		break;

	case 73:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 8;
		match_pos = pos;
		break;

	case 74:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 7;
		match_pos = pos;
		break;

	case 75:
		if( info.src.charCodeAt( pos ) == 34 ) state = 30;
		else if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 9 ) || ( info.src.charCodeAt( pos ) >= 11 && info.src.charCodeAt( pos ) <= 12 ) || ( info.src.charCodeAt( pos ) >= 14 && info.src.charCodeAt( pos ) <= 33 ) || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 101 ) || ( info.src.charCodeAt( pos ) >= 103 && info.src.charCodeAt( pos ) <= 254 ) ) state = 75;
		else state = -1;
		break;

	case 76:
		if( info.src.charCodeAt( pos ) == 34 ) state = 30;
		else if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 9 ) || ( info.src.charCodeAt( pos ) >= 11 && info.src.charCodeAt( pos ) <= 12 ) || ( info.src.charCodeAt( pos ) >= 14 && info.src.charCodeAt( pos ) <= 31 ) || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 42 ) || ( info.src.charCodeAt( pos ) >= 177 && info.src.charCodeAt( pos ) <= 199 ) ) state = 75;
		else if( ( info.src.charCodeAt( pos ) >= 32 && info.src.charCodeAt( pos ) <= 33 ) || ( info.src.charCodeAt( pos ) >= 43 && info.src.charCodeAt( pos ) <= 101 ) || ( info.src.charCodeAt( pos ) >= 103 && info.src.charCodeAt( pos ) <= 176 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 89;
		else if( info.src.charCodeAt( pos ) == 102 ) state = 92;
		else state = -1;
		match = 74;
		match_pos = pos;
		break;

	case 77:
		if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 77;
		else state = -1;
		match = 70;
		match_pos = pos;
		break;

	case 78:
		if( info.src.charCodeAt( pos ) == 88 || info.src.charCodeAt( pos ) == 120 ) state = 36;
		else if( info.src.charCodeAt( pos ) == 89 || info.src.charCodeAt( pos ) == 121 ) state = 37;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 87 ) || info.src.charCodeAt( pos ) == 90 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 119 ) || info.src.charCodeAt( pos ) == 122 || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 79:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 21;
		match_pos = pos;
		break;

	case 80:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 22;
		match_pos = pos;
		break;

	case 81:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 20;
		match_pos = pos;
		break;

	case 82:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 35;
		match_pos = pos;
		break;

	case 83:
		if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 193;
		else state = -1;
		match = 73;
		match_pos = pos;
		break;

	case 84:
		state = -1;
		match = 72;
		match_pos = pos;
		break;

	case 85:
		state = -1;
		match = 40;
		match_pos = pos;
		break;

	case 86:
		state = -1;
		match = 39;
		match_pos = pos;
		break;

	case 87:
		state = -1;
		match = 37;
		match_pos = pos;
		break;

	case 88:
		state = -1;
		match = 38;
		match_pos = pos;
		break;

	case 89:
		if( ( info.src.charCodeAt( pos ) >= 0 && info.src.charCodeAt( pos ) <= 9 ) || ( info.src.charCodeAt( pos ) >= 11 && info.src.charCodeAt( pos ) <= 12 ) || ( info.src.charCodeAt( pos ) >= 14 && info.src.charCodeAt( pos ) <= 31 ) || ( info.src.charCodeAt( pos ) >= 35 && info.src.charCodeAt( pos ) <= 42 ) || ( info.src.charCodeAt( pos ) >= 177 && info.src.charCodeAt( pos ) <= 199 ) ) state = 75;
		else if( info.src.charCodeAt( pos ) == 34 ) state = 84;
		else if( ( info.src.charCodeAt( pos ) >= 32 && info.src.charCodeAt( pos ) <= 33 ) || ( info.src.charCodeAt( pos ) >= 43 && info.src.charCodeAt( pos ) <= 101 ) || ( info.src.charCodeAt( pos ) >= 103 && info.src.charCodeAt( pos ) <= 176 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 89;
		else if( info.src.charCodeAt( pos ) == 102 ) state = 92;
		else state = -1;
		break;

	case 90:
		if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) ) state = 77;
		else state = -1;
		match = 74;
		match_pos = pos;
		break;

	case 91:
		if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || info.src.charCodeAt( pos ) == 95 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 91;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 92:
		if( info.src.charCodeAt( pos ) == 34 ) state = 84;
		else if( ( info.src.charCodeAt( pos ) >= 32 && info.src.charCodeAt( pos ) <= 33 ) || ( info.src.charCodeAt( pos ) >= 43 && info.src.charCodeAt( pos ) <= 176 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 92;
		else state = -1;
		break;

	case 93:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 80;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 94:
		if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 99 ) state = 177;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 98 ) || ( info.src.charCodeAt( pos ) >= 100 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 193;
		else state = -1;
		break;

	case 95:
		if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 50;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 96:
		if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 104;
		else state = -1;
		break;

	case 97:
		if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 51;
		else if( info.src.charCodeAt( pos ) == 66 || info.src.charCodeAt( pos ) == 98 ) state = 52;
		else if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 53;
		else if( info.src.charCodeAt( pos ) == 88 || info.src.charCodeAt( pos ) == 120 ) state = 54;
		else if( info.src.charCodeAt( pos ) == 89 || info.src.charCodeAt( pos ) == 121 ) state = 55;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 161;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 67 && info.src.charCodeAt( pos ) <= 71 ) || ( info.src.charCodeAt( pos ) >= 73 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 84 && info.src.charCodeAt( pos ) <= 87 ) || info.src.charCodeAt( pos ) == 90 || ( info.src.charCodeAt( pos ) >= 99 && info.src.charCodeAt( pos ) <= 103 ) || ( info.src.charCodeAt( pos ) >= 105 && info.src.charCodeAt( pos ) <= 114 ) || ( info.src.charCodeAt( pos ) >= 116 && info.src.charCodeAt( pos ) <= 119 ) || info.src.charCodeAt( pos ) == 122 || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 98:
		if( info.src.charCodeAt( pos ) == 80 || info.src.charCodeAt( pos ) == 112 ) state = 106;
		else state = -1;
		break;

	case 99:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 56;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 100:
		if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 108;
		else state = -1;
		break;

	case 101:
		if( info.src.charCodeAt( pos ) == 89 || info.src.charCodeAt( pos ) == 121 ) state = 57;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 88 ) || info.src.charCodeAt( pos ) == 90 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 120 ) || info.src.charCodeAt( pos ) == 122 || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 102:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 87;
		else state = -1;
		break;

	case 103:
		if( info.src.charCodeAt( pos ) == 80 || info.src.charCodeAt( pos ) == 112 ) state = 79;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 79 ) || ( info.src.charCodeAt( pos ) >= 81 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 111 ) || ( info.src.charCodeAt( pos ) >= 113 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 104:
		if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 62;
		else state = -1;
		break;

	case 105:
		if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 58;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 71 ) || ( info.src.charCodeAt( pos ) >= 73 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 103 ) || ( info.src.charCodeAt( pos ) >= 105 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 106:
		if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 112;
		else state = -1;
		break;

	case 107:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 59;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 108:
		if( info.src.charCodeAt( pos ) == 71 || info.src.charCodeAt( pos ) == 103 ) state = 114;
		else state = -1;
		break;

	case 109:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 82;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 110:
		if( info.src.charCodeAt( pos ) == 103 ) state = 83;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 102 ) || ( info.src.charCodeAt( pos ) >= 104 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 193;
		else state = -1;
		break;

	case 111:
		if( info.src.charCodeAt( pos ) == 87 || info.src.charCodeAt( pos ) == 119 ) state = 60;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 86 ) || ( info.src.charCodeAt( pos ) >= 88 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 118 ) || ( info.src.charCodeAt( pos ) >= 120 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 112:
		if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 85;
		else state = -1;
		break;

	case 113:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 61;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 114:
		if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 118;
		else state = -1;
		break;

	case 115:
		if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 63;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 109 ) || ( info.src.charCodeAt( pos ) >= 111 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 116:
		if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 120;
		else state = -1;
		break;

	case 117:
		if( info.src.charCodeAt( pos ) == 87 || info.src.charCodeAt( pos ) == 119 ) state = 64;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 86 ) || ( info.src.charCodeAt( pos ) >= 88 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 118 ) || ( info.src.charCodeAt( pos ) >= 120 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 118:
		if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 122;
		else state = -1;
		break;

	case 119:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 194;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 120:
		if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 124;
		else state = -1;
		break;

	case 121:
		if( info.src.charCodeAt( pos ) == 79 ) state = 65;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 122:
		if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 126;
		else state = -1;
		break;

	case 123:
		if( info.src.charCodeAt( pos ) == 67 || info.src.charCodeAt( pos ) == 99 ) state = 66;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 66 ) || ( info.src.charCodeAt( pos ) >= 68 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 98 ) || ( info.src.charCodeAt( pos ) >= 100 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 124:
		if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 128;
		else state = -1;
		break;

	case 125:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 77 || info.src.charCodeAt( pos ) == 109 ) state = 146;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 76 ) || ( info.src.charCodeAt( pos ) >= 78 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 108 ) || ( info.src.charCodeAt( pos ) >= 110 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 126:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 130;
		else state = -1;
		break;

	case 127:
		if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 67;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 128:
		if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 132;
		else state = -1;
		break;

	case 129:
		if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 68;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 71 ) || ( info.src.charCodeAt( pos ) >= 73 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 103 ) || ( info.src.charCodeAt( pos ) >= 105 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 130:
		if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 134;
		else state = -1;
		break;

	case 131:
		if( info.src.charCodeAt( pos ) == 76 ) state = 65;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 132:
		if( info.src.charCodeAt( pos ) == 79 || info.src.charCodeAt( pos ) == 111 ) state = 136;
		else state = -1;
		break;

	case 133:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 69;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 134:
		if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 86;
		else state = -1;
		break;

	case 135:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 81;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 136:
		if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 88;
		else state = -1;
		break;

	case 137:
		if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 70;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 113 ) || ( info.src.charCodeAt( pos ) >= 115 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 138:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 71;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 139:
		if( info.src.charCodeAt( pos ) == 77 || info.src.charCodeAt( pos ) == 109 ) state = 72;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 76 ) || ( info.src.charCodeAt( pos ) >= 78 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 108 ) || ( info.src.charCodeAt( pos ) >= 110 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 140:
		if( info.src.charCodeAt( pos ) == 89 ) state = 65;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 88 ) || info.src.charCodeAt( pos ) == 90 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 141:
		if( info.src.charCodeAt( pos ) == 68 || info.src.charCodeAt( pos ) == 100 ) state = 73;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 67 ) || ( info.src.charCodeAt( pos ) >= 69 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 99 ) || ( info.src.charCodeAt( pos ) >= 101 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 142:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 175;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 84 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 114 ) || ( info.src.charCodeAt( pos ) >= 116 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 143:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 205;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 109 ) || ( info.src.charCodeAt( pos ) >= 111 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 144:
		if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 74;
		else if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 145:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 99;
		else if( info.src.charCodeAt( pos ) == 67 || info.src.charCodeAt( pos ) == 99 ) state = 209;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 66 ) || ( info.src.charCodeAt( pos ) >= 68 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 84 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 98 ) || ( info.src.charCodeAt( pos ) >= 100 && info.src.charCodeAt( pos ) <= 114 ) || ( info.src.charCodeAt( pos ) >= 116 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 146:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 42;
		match_pos = pos;
		break;

	case 147:
		if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 100 ) state = 110;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 99 ) || ( info.src.charCodeAt( pos ) >= 101 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 193;
		else state = -1;
		break;

	case 148:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 101;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 109 ) || ( info.src.charCodeAt( pos ) >= 111 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 149:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 103;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 104 ) || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 150:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 105;
		else if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 160;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || info.src.charCodeAt( pos ) == 83 || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 113 ) || info.src.charCodeAt( pos ) == 115 || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 151:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 107;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 152:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 90 || info.src.charCodeAt( pos ) == 122 ) state = 109;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 89 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 121 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 153:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 111;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 154:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 113;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 155:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 71 || info.src.charCodeAt( pos ) == 103 ) state = 115;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 70 ) || ( info.src.charCodeAt( pos ) >= 72 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 102 ) || ( info.src.charCodeAt( pos ) >= 104 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 156:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 79 || info.src.charCodeAt( pos ) == 111 ) state = 117;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 110 ) || ( info.src.charCodeAt( pos ) >= 112 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 157:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 119;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 71 ) || ( info.src.charCodeAt( pos ) >= 73 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 103 ) || ( info.src.charCodeAt( pos ) >= 105 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 158:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 ) state = 121;
		else if( info.src.charCodeAt( pos ) == 82 ) state = 163;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || info.src.charCodeAt( pos ) == 83 || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 159:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 80 || info.src.charCodeAt( pos ) == 112 ) state = 123;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 79 ) || ( info.src.charCodeAt( pos ) >= 81 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 111 ) || ( info.src.charCodeAt( pos ) >= 113 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 160:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 125;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 161:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 127;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 162:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 129;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 163:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 69 ) state = 131;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 164:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 133;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 165:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 ) state = 121;
		else if( info.src.charCodeAt( pos ) == 82 ) state = 163;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || info.src.charCodeAt( pos ) == 83 || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 166:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 135;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 167:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 137;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 84 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 116 ) || ( info.src.charCodeAt( pos ) >= 118 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 168:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 68 || info.src.charCodeAt( pos ) == 100 ) state = 138;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 67 ) || ( info.src.charCodeAt( pos ) >= 69 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 99 ) || ( info.src.charCodeAt( pos ) >= 101 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 169:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 139;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 104 ) || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 170:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 ) state = 140;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 171:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 141;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 109 ) || ( info.src.charCodeAt( pos ) >= 111 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 172:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 142;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 84 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 114 ) || ( info.src.charCodeAt( pos ) >= 116 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 173:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 79 || info.src.charCodeAt( pos ) == 111 ) state = 143;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 110 ) || ( info.src.charCodeAt( pos ) >= 112 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 174:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 80 || info.src.charCodeAt( pos ) == 112 ) state = 144;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 79 ) || ( info.src.charCodeAt( pos ) >= 81 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 111 ) || ( info.src.charCodeAt( pos ) >= 113 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 175:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 24;
		match_pos = pos;
		break;

	case 176:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 148;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 177:
		if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 102 ) state = 147;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 101 ) || ( info.src.charCodeAt( pos ) >= 103 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 193;
		else state = -1;
		break;

	case 178:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 155;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 156;
		else if( info.src.charCodeAt( pos ) == 80 || info.src.charCodeAt( pos ) == 112 ) state = 157;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 79 ) || ( info.src.charCodeAt( pos ) >= 81 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 104 ) || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 111 ) || ( info.src.charCodeAt( pos ) >= 113 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 179:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 67 ) state = 158;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 66 ) || ( info.src.charCodeAt( pos ) >= 68 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 180:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 159;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 84 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 114 ) || ( info.src.charCodeAt( pos ) >= 116 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 181:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 68 || info.src.charCodeAt( pos ) == 100 ) state = 162;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 67 ) || ( info.src.charCodeAt( pos ) >= 69 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 99 ) || ( info.src.charCodeAt( pos ) >= 101 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 182:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 89 || info.src.charCodeAt( pos ) == 121 ) state = 164;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 88 ) || info.src.charCodeAt( pos ) == 90 || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 120 ) || info.src.charCodeAt( pos ) == 122 || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 183:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 69 ) state = 165;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 184:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 166;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 185:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 168;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 84 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 116 ) || ( info.src.charCodeAt( pos ) >= 118 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 186:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 79 ) state = 170;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 187:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 85 || info.src.charCodeAt( pos ) == 117 ) state = 171;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 84 ) || ( info.src.charCodeAt( pos ) >= 86 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 116 ) || ( info.src.charCodeAt( pos ) >= 118 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 188:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 69 || info.src.charCodeAt( pos ) == 101 ) state = 172;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 100 ) || ( info.src.charCodeAt( pos ) >= 102 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 189:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 173;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 104 ) || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 190:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 174;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 191:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 178;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 25;
		match_pos = pos;
		break;

	case 192:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 181;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 104 ) || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 193:
		if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 193;
		else state = -1;
		break;

	case 194:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 25;
		match_pos = pos;
		break;

	case 195:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 78 ) state = 183;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 196:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 86 ) state = 183;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 85 ) || ( info.src.charCodeAt( pos ) >= 87 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 197:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 184;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 198:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 76 || info.src.charCodeAt( pos ) == 108 ) state = 185;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 75 ) || ( info.src.charCodeAt( pos ) >= 77 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 107 ) || ( info.src.charCodeAt( pos ) >= 109 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 199:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 80 ) state = 186;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 79 ) || ( info.src.charCodeAt( pos ) >= 81 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 200:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 79 || info.src.charCodeAt( pos ) == 111 ) state = 187;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 110 ) || ( info.src.charCodeAt( pos ) >= 112 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 201:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 188;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 109 ) || ( info.src.charCodeAt( pos ) >= 111 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 202:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 189;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 203:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 190;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 71 ) || ( info.src.charCodeAt( pos ) >= 73 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 103 ) || ( info.src.charCodeAt( pos ) >= 105 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 204:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 ) state = 195;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 205:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 23;
		match_pos = pos;
		break;

	case 206:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 79 ) state = 196;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 207:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 82 ) state = 196;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 208:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 67 || info.src.charCodeAt( pos ) == 99 ) state = 198;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 66 ) || ( info.src.charCodeAt( pos ) >= 68 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 98 ) || ( info.src.charCodeAt( pos ) >= 100 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 209:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 75 || info.src.charCodeAt( pos ) == 107 ) state = 221;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 74 ) || ( info.src.charCodeAt( pos ) >= 76 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 106 ) || ( info.src.charCodeAt( pos ) >= 108 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 210:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 71 || info.src.charCodeAt( pos ) == 103 ) state = 213;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 70 ) || ( info.src.charCodeAt( pos ) >= 72 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 102 ) || ( info.src.charCodeAt( pos ) >= 104 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 211:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 83 ) state = 214;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 84 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 212:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 215;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 113 ) || ( info.src.charCodeAt( pos ) >= 115 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 213:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 72 || info.src.charCodeAt( pos ) == 104 ) state = 217;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 71 ) || ( info.src.charCodeAt( pos ) >= 73 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 103 ) || ( info.src.charCodeAt( pos ) >= 105 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 214:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 69 ) state = 199;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 68 ) || ( info.src.charCodeAt( pos ) >= 70 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 215:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 219;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 216:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 200;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 113 ) || ( info.src.charCodeAt( pos ) >= 115 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 217:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 84 || info.src.charCodeAt( pos ) == 116 ) state = 201;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 83 ) || ( info.src.charCodeAt( pos ) >= 85 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 115 ) || ( info.src.charCodeAt( pos ) >= 117 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 218:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 65 || info.src.charCodeAt( pos ) == 97 ) state = 202;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 66 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 98 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 219:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 83 || info.src.charCodeAt( pos ) == 115 ) state = 203;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 82 ) || ( info.src.charCodeAt( pos ) >= 84 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 114 ) || ( info.src.charCodeAt( pos ) >= 116 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 220:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 78 || info.src.charCodeAt( pos ) == 110 ) state = 208;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 77 ) || ( info.src.charCodeAt( pos ) >= 79 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 109 ) || ( info.src.charCodeAt( pos ) >= 111 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 221:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 71 || info.src.charCodeAt( pos ) == 103 ) state = 216;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 70 ) || ( info.src.charCodeAt( pos ) >= 72 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 102 ) || ( info.src.charCodeAt( pos ) >= 104 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 222:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 82 || info.src.charCodeAt( pos ) == 114 ) state = 218;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 81 ) || ( info.src.charCodeAt( pos ) >= 83 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 113 ) || ( info.src.charCodeAt( pos ) >= 115 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 223:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 224:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 73 || info.src.charCodeAt( pos ) == 105 ) state = 210;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 72 ) || ( info.src.charCodeAt( pos ) >= 74 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 104 ) || ( info.src.charCodeAt( pos ) >= 106 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

	case 225:
		if( info.src.charCodeAt( pos ) == 95 ) state = 91;
		else if( info.src.charCodeAt( pos ) == 46 ) state = 94;
		else if( info.src.charCodeAt( pos ) == 79 ) state = 211;
		else if( ( info.src.charCodeAt( pos ) >= 48 && info.src.charCodeAt( pos ) <= 57 ) || ( info.src.charCodeAt( pos ) >= 65 && info.src.charCodeAt( pos ) <= 78 ) || ( info.src.charCodeAt( pos ) >= 80 && info.src.charCodeAt( pos ) <= 90 ) || ( info.src.charCodeAt( pos ) >= 97 && info.src.charCodeAt( pos ) <= 122 ) || ( info.src.charCodeAt( pos ) >= 200 && info.src.charCodeAt( pos ) <= 254 ) ) state = 223;
		else state = -1;
		match = 71;
		match_pos = pos;
		break;

}


			pos++;

		}
		while( state > -1 );

	}
	while( 74 > -1 && match == 74 );

	if( match > -1 )
	{
		info.att = info.src.substr( start, match_pos - start );
		info.offset = match_pos;
		

	}
	else
	{
		info.att = new String();
		match = -1;
	}

	return match;
}


function __parse( src, err_off, err_la )
{
	var		sstack			= new Array();
	var		vstack			= new Array();
	var 	err_cnt			= 0;
	var		act;
	var		go;
	var		la;
	var		rval;
	var 	parseinfo		= new Function( "", "var offset; var src; var att;" );
	var		info			= new parseinfo();
	
/* Pop-Table */
var pop_tab = new Array(
	new Array( 0/* cfdg' */, 1 ),
	new Array( 75/* cfdg */, 2 ),
	new Array( 75/* cfdg */, 0 ),
	new Array( 76/* statement */, 1 ),
	new Array( 76/* statement */, 1 ),
	new Array( 76/* statement */, 1 ),
	new Array( 76/* statement */, 1 ),
	new Array( 76/* statement */, 1 ),
	new Array( 76/* statement */, 1 ),
	new Array( 76/* statement */, 1 ),
	new Array( 79/* inclusion */, 2 ),
	new Array( 79/* inclusion */, 2 ),
	new Array( 77/* initialization */, 2 ),
	new Array( 78/* background */, 4 ),
	new Array( 80/* tile */, 2 ),
	new Array( 81/* size */, 2 ),
	new Array( 82/* rule */, 5 ),
	new Array( 82/* rule */, 6 ),
	new Array( 83/* path */, 5 ),
	new Array( 89/* allow */, 2 ),
	new Array( 90/* deny */, 2 ),
	new Array( 91/* tiledim */, 2 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 84/* user_string */, 1 ),
	new Array( 88/* buncha_pathOps */, 2 ),
	new Array( 88/* buncha_pathOps */, 0 ),
	new Array( 92/* pathOp */, 4 ),
	new Array( 92/* pathOp */, 7 ),
	new Array( 92/* pathOp */, 6 ),
	new Array( 92/* pathOp */, 2 ),
	new Array( 92/* pathOp */, 5 ),
	new Array( 93/* points */, 2 ),
	new Array( 93/* points */, 0 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 95/* point */, 2 ),
	new Array( 87/* buncha_replacements */, 2 ),
	new Array( 87/* buncha_replacements */, 0 ),
	new Array( 97/* replacement */, 2 ),
	new Array( 97/* replacement */, 5 ),
	new Array( 97/* replacement */, 6 ),
	new Array( 86/* modification */, 3 ),
	new Array( 86/* modification */, 3 ),
	new Array( 94/* path_modification */, 3 ),
	new Array( 94/* path_modification */, 3 ),
	new Array( 99/* buncha_path_adjustments */, 2 ),
	new Array( 99/* buncha_path_adjustments */, 0 ),
	new Array( 100/* path_adjustment */, 1 ),
	new Array( 100/* path_adjustment */, 1 ),
	new Array( 100/* path_adjustment */, 1 ),
	new Array( 100/* path_adjustment */, 2 ),
	new Array( 100/* path_adjustment */, 2 ),
	new Array( 100/* path_adjustment */, 2 ),
	new Array( 100/* path_adjustment */, 4 ),
	new Array( 98/* buncha_adjustments */, 2 ),
	new Array( 98/* buncha_adjustments */, 0 ),
	new Array( 85/* buncha_color_adjustments */, 2 ),
	new Array( 85/* buncha_color_adjustments */, 0 ),
	new Array( 104/* adjustment */, 1 ),
	new Array( 104/* adjustment */, 1 ),
	new Array( 104/* adjustment */, 1 ),
	new Array( 104/* adjustment */, 1 ),
	new Array( 104/* adjustment */, 2 ),
	new Array( 104/* adjustment */, 4 ),
	new Array( 104/* adjustment */, 2 ),
	new Array( 104/* adjustment */, 2 ),
	new Array( 104/* adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 1 ),
	new Array( 105/* text_adjustment */, 1 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 1 ),
	new Array( 105/* text_adjustment */, 1 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 105/* text_adjustment */, 2 ),
	new Array( 106/* rational */, 1 ),
	new Array( 106/* rational */, 2 ),
	new Array( 106/* rational */, 2 ),
	new Array( 107/* normal_string */, 1 ),
	new Array( 107/* normal_string */, 1 ),
	new Array( 101/* geom_adjustment */, 2 ),
	new Array( 101/* geom_adjustment */, 2 ),
	new Array( 101/* geom_adjustment */, 2 ),
	new Array( 101/* geom_adjustment */, 2 ),
	new Array( 101/* geom_adjustment */, 2 ),
	new Array( 101/* geom_adjustment */, 3 ),
	new Array( 101/* geom_adjustment */, 3 ),
	new Array( 101/* geom_adjustment */, 2 ),
	new Array( 101/* geom_adjustment */, 2 ),
	new Array( 103/* shadow_adjustment */, 2 ),
	new Array( 103/* shadow_adjustment */, 2 ),
	new Array( 103/* shadow_adjustment */, 2 ),
	new Array( 103/* shadow_adjustment */, 2 ),
	new Array( 103/* shadow_adjustment */, 2 ),
	new Array( 103/* shadow_adjustment */, 2 ),
	new Array( 103/* shadow_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 3 ),
	new Array( 102/* color_adjustment */, 3 ),
	new Array( 102/* color_adjustment */, 3 ),
	new Array( 102/* color_adjustment */, 3 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 102/* color_adjustment */, 2 ),
	new Array( 96/* exp */, 1 ),
	new Array( 96/* exp */, 2 ),
	new Array( 96/* exp */, 2 ),
	new Array( 96/* exp */, 3 ),
	new Array( 96/* exp */, 3 ),
	new Array( 96/* exp */, 4 ),
	new Array( 96/* exp */, 6 ),
	new Array( 108/* exp2 */, 1 ),
	new Array( 108/* exp2 */, 3 ),
	new Array( 108/* exp2 */, 4 ),
	new Array( 108/* exp2 */, 6 ),
	new Array( 108/* exp2 */, 3 ),
	new Array( 108/* exp2 */, 3 ),
	new Array( 108/* exp2 */, 3 ),
	new Array( 108/* exp2 */, 3 ),
	new Array( 108/* exp2 */, 2 ),
	new Array( 108/* exp2 */, 2 ),
	new Array( 108/* exp2 */, 3 ),
	new Array( 108/* exp2 */, 3 )
);

/* Action-Table */
var act_tab = new Array(
	/* State 0 */ new Array( 109/* "$" */,-2 , 7/* "STARTSHAPE" */,-2 , 8/* "BACKGROUND" */,-2 , 9/* "INCLUDE" */,-2 , 10/* "TILE" */,-2 , 35/* "SIZE" */,-2 , 11/* "RULE" */,-2 , 12/* "PATH" */,-2 ),
	/* State 1 */ new Array( 7/* "STARTSHAPE" */,10 , 8/* "BACKGROUND" */,11 , 9/* "INCLUDE" */,12 , 10/* "TILE" */,13 , 35/* "SIZE" */,14 , 11/* "RULE" */,15 , 12/* "PATH" */,16 , 109/* "$" */,0 ),
	/* State 2 */ new Array( 109/* "$" */,-1 , 7/* "STARTSHAPE" */,-1 , 8/* "BACKGROUND" */,-1 , 9/* "INCLUDE" */,-1 , 10/* "TILE" */,-1 , 35/* "SIZE" */,-1 , 11/* "RULE" */,-1 , 12/* "PATH" */,-1 ),
	/* State 3 */ new Array( 109/* "$" */,-3 , 7/* "STARTSHAPE" */,-3 , 8/* "BACKGROUND" */,-3 , 9/* "INCLUDE" */,-3 , 10/* "TILE" */,-3 , 35/* "SIZE" */,-3 , 11/* "RULE" */,-3 , 12/* "PATH" */,-3 ),
	/* State 4 */ new Array( 109/* "$" */,-4 , 7/* "STARTSHAPE" */,-4 , 8/* "BACKGROUND" */,-4 , 9/* "INCLUDE" */,-4 , 10/* "TILE" */,-4 , 35/* "SIZE" */,-4 , 11/* "RULE" */,-4 , 12/* "PATH" */,-4 ),
	/* State 5 */ new Array( 109/* "$" */,-5 , 7/* "STARTSHAPE" */,-5 , 8/* "BACKGROUND" */,-5 , 9/* "INCLUDE" */,-5 , 10/* "TILE" */,-5 , 35/* "SIZE" */,-5 , 11/* "RULE" */,-5 , 12/* "PATH" */,-5 ),
	/* State 6 */ new Array( 109/* "$" */,-6 , 7/* "STARTSHAPE" */,-6 , 8/* "BACKGROUND" */,-6 , 9/* "INCLUDE" */,-6 , 10/* "TILE" */,-6 , 35/* "SIZE" */,-6 , 11/* "RULE" */,-6 , 12/* "PATH" */,-6 ),
	/* State 7 */ new Array( 109/* "$" */,-7 , 7/* "STARTSHAPE" */,-7 , 8/* "BACKGROUND" */,-7 , 9/* "INCLUDE" */,-7 , 10/* "TILE" */,-7 , 35/* "SIZE" */,-7 , 11/* "RULE" */,-7 , 12/* "PATH" */,-7 ),
	/* State 8 */ new Array( 109/* "$" */,-8 , 7/* "STARTSHAPE" */,-8 , 8/* "BACKGROUND" */,-8 , 9/* "INCLUDE" */,-8 , 10/* "TILE" */,-8 , 35/* "SIZE" */,-8 , 11/* "RULE" */,-8 , 12/* "PATH" */,-8 ),
	/* State 9 */ new Array( 109/* "$" */,-9 , 7/* "STARTSHAPE" */,-9 , 8/* "BACKGROUND" */,-9 , 9/* "INCLUDE" */,-9 , 10/* "TILE" */,-9 , 35/* "SIZE" */,-9 , 11/* "RULE" */,-9 , 12/* "PATH" */,-9 ),
	/* State 10 */ new Array( 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 11 */ new Array( 13/* "{" */,60 ),
	/* State 12 */ new Array( 73/* "FILENAME" */,61 , 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 13 */ new Array( 13/* "{" */,64 , 15/* "[" */,65 ),
	/* State 14 */ new Array( 13/* "{" */,64 , 15/* "[" */,65 ),
	/* State 15 */ new Array( 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 16 */ new Array( 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 17 */ new Array( 109/* "$" */,-12 , 7/* "STARTSHAPE" */,-12 , 8/* "BACKGROUND" */,-12 , 9/* "INCLUDE" */,-12 , 10/* "TILE" */,-12 , 35/* "SIZE" */,-12 , 11/* "RULE" */,-12 , 12/* "PATH" */,-12 ),
	/* State 18 */ new Array( 109/* "$" */,-22 , 7/* "STARTSHAPE" */,-22 , 8/* "BACKGROUND" */,-22 , 9/* "INCLUDE" */,-22 , 10/* "TILE" */,-22 , 35/* "SIZE" */,-22 , 11/* "RULE" */,-22 , 12/* "PATH" */,-22 , 13/* "{" */,-22 , 70/* "RATIONAL" */,-22 , 14/* "}" */,-22 , 20/* "ROTATE" */,-22 , 21/* "FLIP" */,-22 , 26/* "XSHIFT" */,-22 , 27/* "YSHIFT" */,-22 , 36/* "SKEW" */,-22 , 48/* "GLOBALX" */,-22 , 49/* "GLOBALY" */,-22 , 22/* "HUE" */,-22 , 23/* "SATURATION" */,-22 , 24/* "BRIGHTNESS" */,-22 , 25/* "ALPHA" */,-22 , 37/* "TARGETHUE" */,-22 , 38/* "TARGETSATURATION" */,-22 , 39/* "TARGETBRIGHTNESS" */,-22 , 40/* "TARGETALPHA" */,-22 , 62/* "SHADOWOFFSETX" */,-22 , 63/* "SHADOWOFFSETY" */,-22 , 64/* "SHADOWBLUR" */,-22 , 65/* "SHADOWHUE" */,-22 , 67/* "SHADOWBRIGHTNESS" */,-22 , 66/* "SHADOWSATURATION" */,-22 , 68/* "SHADOWALPHA" */,-22 , 34/* "ZSHIFT" */,-22 , 42/* "PARAMETERS" */,-22 , 47/* "NONPATHSTROKEWIDTH" */,-22 , 43/* "STROKEWIDTH" */,-22 , 52/* "EMPTYOUTTEXT" */,-22 , 53/* "BACKSPC" */,-22 , 51/* "PIPETEXT" */,-22 , 50/* "TEXT" */,-22 , 54/* "FONTNAME" */,-22 , 55/* "FONTSIZE" */,-22 , 56/* "FONTUNIT" */,-22 , 57/* "FONTSTYLE" */,-22 , 58/* "STROKETEXT" */,-22 , 59/* "FILLTEXT" */,-22 , 61/* "TEXTALIGN" */,-22 , 60/* "TEXTBASELINE" */,-22 , 16/* "]" */,-22 , 15/* "[" */,-22 ),
	/* State 19 */ new Array( 109/* "$" */,-23 , 7/* "STARTSHAPE" */,-23 , 8/* "BACKGROUND" */,-23 , 9/* "INCLUDE" */,-23 , 10/* "TILE" */,-23 , 35/* "SIZE" */,-23 , 11/* "RULE" */,-23 , 12/* "PATH" */,-23 , 13/* "{" */,-23 , 70/* "RATIONAL" */,-23 , 14/* "}" */,-23 , 20/* "ROTATE" */,-23 , 21/* "FLIP" */,-23 , 26/* "XSHIFT" */,-23 , 27/* "YSHIFT" */,-23 , 36/* "SKEW" */,-23 , 48/* "GLOBALX" */,-23 , 49/* "GLOBALY" */,-23 , 22/* "HUE" */,-23 , 23/* "SATURATION" */,-23 , 24/* "BRIGHTNESS" */,-23 , 25/* "ALPHA" */,-23 , 37/* "TARGETHUE" */,-23 , 38/* "TARGETSATURATION" */,-23 , 39/* "TARGETBRIGHTNESS" */,-23 , 40/* "TARGETALPHA" */,-23 , 62/* "SHADOWOFFSETX" */,-23 , 63/* "SHADOWOFFSETY" */,-23 , 64/* "SHADOWBLUR" */,-23 , 65/* "SHADOWHUE" */,-23 , 67/* "SHADOWBRIGHTNESS" */,-23 , 66/* "SHADOWSATURATION" */,-23 , 68/* "SHADOWALPHA" */,-23 , 34/* "ZSHIFT" */,-23 , 42/* "PARAMETERS" */,-23 , 47/* "NONPATHSTROKEWIDTH" */,-23 , 43/* "STROKEWIDTH" */,-23 , 52/* "EMPTYOUTTEXT" */,-23 , 53/* "BACKSPC" */,-23 , 51/* "PIPETEXT" */,-23 , 50/* "TEXT" */,-23 , 54/* "FONTNAME" */,-23 , 55/* "FONTSIZE" */,-23 , 56/* "FONTUNIT" */,-23 , 57/* "FONTSTYLE" */,-23 , 58/* "STROKETEXT" */,-23 , 59/* "FILLTEXT" */,-23 , 61/* "TEXTALIGN" */,-23 , 60/* "TEXTBASELINE" */,-23 , 16/* "]" */,-23 , 15/* "[" */,-23 ),
	/* State 20 */ new Array( 109/* "$" */,-24 , 7/* "STARTSHAPE" */,-24 , 8/* "BACKGROUND" */,-24 , 9/* "INCLUDE" */,-24 , 10/* "TILE" */,-24 , 35/* "SIZE" */,-24 , 11/* "RULE" */,-24 , 12/* "PATH" */,-24 , 13/* "{" */,-24 , 70/* "RATIONAL" */,-24 , 14/* "}" */,-24 , 20/* "ROTATE" */,-24 , 21/* "FLIP" */,-24 , 26/* "XSHIFT" */,-24 , 27/* "YSHIFT" */,-24 , 36/* "SKEW" */,-24 , 48/* "GLOBALX" */,-24 , 49/* "GLOBALY" */,-24 , 22/* "HUE" */,-24 , 23/* "SATURATION" */,-24 , 24/* "BRIGHTNESS" */,-24 , 25/* "ALPHA" */,-24 , 37/* "TARGETHUE" */,-24 , 38/* "TARGETSATURATION" */,-24 , 39/* "TARGETBRIGHTNESS" */,-24 , 40/* "TARGETALPHA" */,-24 , 62/* "SHADOWOFFSETX" */,-24 , 63/* "SHADOWOFFSETY" */,-24 , 64/* "SHADOWBLUR" */,-24 , 65/* "SHADOWHUE" */,-24 , 67/* "SHADOWBRIGHTNESS" */,-24 , 66/* "SHADOWSATURATION" */,-24 , 68/* "SHADOWALPHA" */,-24 , 34/* "ZSHIFT" */,-24 , 42/* "PARAMETERS" */,-24 , 47/* "NONPATHSTROKEWIDTH" */,-24 , 43/* "STROKEWIDTH" */,-24 , 52/* "EMPTYOUTTEXT" */,-24 , 53/* "BACKSPC" */,-24 , 51/* "PIPETEXT" */,-24 , 50/* "TEXT" */,-24 , 54/* "FONTNAME" */,-24 , 55/* "FONTSIZE" */,-24 , 56/* "FONTUNIT" */,-24 , 57/* "FONTSTYLE" */,-24 , 58/* "STROKETEXT" */,-24 , 59/* "FILLTEXT" */,-24 , 61/* "TEXTALIGN" */,-24 , 60/* "TEXTBASELINE" */,-24 , 16/* "]" */,-24 , 15/* "[" */,-24 ),
	/* State 21 */ new Array( 109/* "$" */,-25 , 7/* "STARTSHAPE" */,-25 , 8/* "BACKGROUND" */,-25 , 9/* "INCLUDE" */,-25 , 10/* "TILE" */,-25 , 35/* "SIZE" */,-25 , 11/* "RULE" */,-25 , 12/* "PATH" */,-25 , 13/* "{" */,-25 , 70/* "RATIONAL" */,-25 , 14/* "}" */,-25 , 20/* "ROTATE" */,-25 , 21/* "FLIP" */,-25 , 26/* "XSHIFT" */,-25 , 27/* "YSHIFT" */,-25 , 36/* "SKEW" */,-25 , 48/* "GLOBALX" */,-25 , 49/* "GLOBALY" */,-25 , 22/* "HUE" */,-25 , 23/* "SATURATION" */,-25 , 24/* "BRIGHTNESS" */,-25 , 25/* "ALPHA" */,-25 , 37/* "TARGETHUE" */,-25 , 38/* "TARGETSATURATION" */,-25 , 39/* "TARGETBRIGHTNESS" */,-25 , 40/* "TARGETALPHA" */,-25 , 62/* "SHADOWOFFSETX" */,-25 , 63/* "SHADOWOFFSETY" */,-25 , 64/* "SHADOWBLUR" */,-25 , 65/* "SHADOWHUE" */,-25 , 67/* "SHADOWBRIGHTNESS" */,-25 , 66/* "SHADOWSATURATION" */,-25 , 68/* "SHADOWALPHA" */,-25 , 34/* "ZSHIFT" */,-25 , 42/* "PARAMETERS" */,-25 , 47/* "NONPATHSTROKEWIDTH" */,-25 , 43/* "STROKEWIDTH" */,-25 , 52/* "EMPTYOUTTEXT" */,-25 , 53/* "BACKSPC" */,-25 , 51/* "PIPETEXT" */,-25 , 50/* "TEXT" */,-25 , 54/* "FONTNAME" */,-25 , 55/* "FONTSIZE" */,-25 , 56/* "FONTUNIT" */,-25 , 57/* "FONTSTYLE" */,-25 , 58/* "STROKETEXT" */,-25 , 59/* "FILLTEXT" */,-25 , 61/* "TEXTALIGN" */,-25 , 60/* "TEXTBASELINE" */,-25 , 16/* "]" */,-25 , 15/* "[" */,-25 ),
	/* State 22 */ new Array( 109/* "$" */,-26 , 7/* "STARTSHAPE" */,-26 , 8/* "BACKGROUND" */,-26 , 9/* "INCLUDE" */,-26 , 10/* "TILE" */,-26 , 35/* "SIZE" */,-26 , 11/* "RULE" */,-26 , 12/* "PATH" */,-26 , 13/* "{" */,-26 , 70/* "RATIONAL" */,-26 , 14/* "}" */,-26 , 20/* "ROTATE" */,-26 , 21/* "FLIP" */,-26 , 26/* "XSHIFT" */,-26 , 27/* "YSHIFT" */,-26 , 36/* "SKEW" */,-26 , 48/* "GLOBALX" */,-26 , 49/* "GLOBALY" */,-26 , 22/* "HUE" */,-26 , 23/* "SATURATION" */,-26 , 24/* "BRIGHTNESS" */,-26 , 25/* "ALPHA" */,-26 , 37/* "TARGETHUE" */,-26 , 38/* "TARGETSATURATION" */,-26 , 39/* "TARGETBRIGHTNESS" */,-26 , 40/* "TARGETALPHA" */,-26 , 62/* "SHADOWOFFSETX" */,-26 , 63/* "SHADOWOFFSETY" */,-26 , 64/* "SHADOWBLUR" */,-26 , 65/* "SHADOWHUE" */,-26 , 67/* "SHADOWBRIGHTNESS" */,-26 , 66/* "SHADOWSATURATION" */,-26 , 68/* "SHADOWALPHA" */,-26 , 34/* "ZSHIFT" */,-26 , 42/* "PARAMETERS" */,-26 , 47/* "NONPATHSTROKEWIDTH" */,-26 , 43/* "STROKEWIDTH" */,-26 , 52/* "EMPTYOUTTEXT" */,-26 , 53/* "BACKSPC" */,-26 , 51/* "PIPETEXT" */,-26 , 50/* "TEXT" */,-26 , 54/* "FONTNAME" */,-26 , 55/* "FONTSIZE" */,-26 , 56/* "FONTUNIT" */,-26 , 57/* "FONTSTYLE" */,-26 , 58/* "STROKETEXT" */,-26 , 59/* "FILLTEXT" */,-26 , 61/* "TEXTALIGN" */,-26 , 60/* "TEXTBASELINE" */,-26 , 16/* "]" */,-26 , 15/* "[" */,-26 ),
	/* State 23 */ new Array( 109/* "$" */,-27 , 7/* "STARTSHAPE" */,-27 , 8/* "BACKGROUND" */,-27 , 9/* "INCLUDE" */,-27 , 10/* "TILE" */,-27 , 35/* "SIZE" */,-27 , 11/* "RULE" */,-27 , 12/* "PATH" */,-27 , 13/* "{" */,-27 , 70/* "RATIONAL" */,-27 , 14/* "}" */,-27 , 20/* "ROTATE" */,-27 , 21/* "FLIP" */,-27 , 26/* "XSHIFT" */,-27 , 27/* "YSHIFT" */,-27 , 36/* "SKEW" */,-27 , 48/* "GLOBALX" */,-27 , 49/* "GLOBALY" */,-27 , 22/* "HUE" */,-27 , 23/* "SATURATION" */,-27 , 24/* "BRIGHTNESS" */,-27 , 25/* "ALPHA" */,-27 , 37/* "TARGETHUE" */,-27 , 38/* "TARGETSATURATION" */,-27 , 39/* "TARGETBRIGHTNESS" */,-27 , 40/* "TARGETALPHA" */,-27 , 62/* "SHADOWOFFSETX" */,-27 , 63/* "SHADOWOFFSETY" */,-27 , 64/* "SHADOWBLUR" */,-27 , 65/* "SHADOWHUE" */,-27 , 67/* "SHADOWBRIGHTNESS" */,-27 , 66/* "SHADOWSATURATION" */,-27 , 68/* "SHADOWALPHA" */,-27 , 34/* "ZSHIFT" */,-27 , 42/* "PARAMETERS" */,-27 , 47/* "NONPATHSTROKEWIDTH" */,-27 , 43/* "STROKEWIDTH" */,-27 , 52/* "EMPTYOUTTEXT" */,-27 , 53/* "BACKSPC" */,-27 , 51/* "PIPETEXT" */,-27 , 50/* "TEXT" */,-27 , 54/* "FONTNAME" */,-27 , 55/* "FONTSIZE" */,-27 , 56/* "FONTUNIT" */,-27 , 57/* "FONTSTYLE" */,-27 , 58/* "STROKETEXT" */,-27 , 59/* "FILLTEXT" */,-27 , 61/* "TEXTALIGN" */,-27 , 60/* "TEXTBASELINE" */,-27 , 16/* "]" */,-27 , 15/* "[" */,-27 ),
	/* State 24 */ new Array( 109/* "$" */,-28 , 7/* "STARTSHAPE" */,-28 , 8/* "BACKGROUND" */,-28 , 9/* "INCLUDE" */,-28 , 10/* "TILE" */,-28 , 35/* "SIZE" */,-28 , 11/* "RULE" */,-28 , 12/* "PATH" */,-28 , 13/* "{" */,-28 , 70/* "RATIONAL" */,-28 , 14/* "}" */,-28 , 20/* "ROTATE" */,-28 , 21/* "FLIP" */,-28 , 26/* "XSHIFT" */,-28 , 27/* "YSHIFT" */,-28 , 36/* "SKEW" */,-28 , 48/* "GLOBALX" */,-28 , 49/* "GLOBALY" */,-28 , 22/* "HUE" */,-28 , 23/* "SATURATION" */,-28 , 24/* "BRIGHTNESS" */,-28 , 25/* "ALPHA" */,-28 , 37/* "TARGETHUE" */,-28 , 38/* "TARGETSATURATION" */,-28 , 39/* "TARGETBRIGHTNESS" */,-28 , 40/* "TARGETALPHA" */,-28 , 62/* "SHADOWOFFSETX" */,-28 , 63/* "SHADOWOFFSETY" */,-28 , 64/* "SHADOWBLUR" */,-28 , 65/* "SHADOWHUE" */,-28 , 67/* "SHADOWBRIGHTNESS" */,-28 , 66/* "SHADOWSATURATION" */,-28 , 68/* "SHADOWALPHA" */,-28 , 34/* "ZSHIFT" */,-28 , 42/* "PARAMETERS" */,-28 , 47/* "NONPATHSTROKEWIDTH" */,-28 , 43/* "STROKEWIDTH" */,-28 , 52/* "EMPTYOUTTEXT" */,-28 , 53/* "BACKSPC" */,-28 , 51/* "PIPETEXT" */,-28 , 50/* "TEXT" */,-28 , 54/* "FONTNAME" */,-28 , 55/* "FONTSIZE" */,-28 , 56/* "FONTUNIT" */,-28 , 57/* "FONTSTYLE" */,-28 , 58/* "STROKETEXT" */,-28 , 59/* "FILLTEXT" */,-28 , 61/* "TEXTALIGN" */,-28 , 60/* "TEXTBASELINE" */,-28 , 16/* "]" */,-28 , 15/* "[" */,-28 ),
	/* State 25 */ new Array( 109/* "$" */,-29 , 7/* "STARTSHAPE" */,-29 , 8/* "BACKGROUND" */,-29 , 9/* "INCLUDE" */,-29 , 10/* "TILE" */,-29 , 35/* "SIZE" */,-29 , 11/* "RULE" */,-29 , 12/* "PATH" */,-29 , 13/* "{" */,-29 , 70/* "RATIONAL" */,-29 , 14/* "}" */,-29 , 20/* "ROTATE" */,-29 , 21/* "FLIP" */,-29 , 26/* "XSHIFT" */,-29 , 27/* "YSHIFT" */,-29 , 36/* "SKEW" */,-29 , 48/* "GLOBALX" */,-29 , 49/* "GLOBALY" */,-29 , 22/* "HUE" */,-29 , 23/* "SATURATION" */,-29 , 24/* "BRIGHTNESS" */,-29 , 25/* "ALPHA" */,-29 , 37/* "TARGETHUE" */,-29 , 38/* "TARGETSATURATION" */,-29 , 39/* "TARGETBRIGHTNESS" */,-29 , 40/* "TARGETALPHA" */,-29 , 62/* "SHADOWOFFSETX" */,-29 , 63/* "SHADOWOFFSETY" */,-29 , 64/* "SHADOWBLUR" */,-29 , 65/* "SHADOWHUE" */,-29 , 67/* "SHADOWBRIGHTNESS" */,-29 , 66/* "SHADOWSATURATION" */,-29 , 68/* "SHADOWALPHA" */,-29 , 34/* "ZSHIFT" */,-29 , 42/* "PARAMETERS" */,-29 , 47/* "NONPATHSTROKEWIDTH" */,-29 , 43/* "STROKEWIDTH" */,-29 , 52/* "EMPTYOUTTEXT" */,-29 , 53/* "BACKSPC" */,-29 , 51/* "PIPETEXT" */,-29 , 50/* "TEXT" */,-29 , 54/* "FONTNAME" */,-29 , 55/* "FONTSIZE" */,-29 , 56/* "FONTUNIT" */,-29 , 57/* "FONTSTYLE" */,-29 , 58/* "STROKETEXT" */,-29 , 59/* "FILLTEXT" */,-29 , 61/* "TEXTALIGN" */,-29 , 60/* "TEXTBASELINE" */,-29 , 16/* "]" */,-29 , 15/* "[" */,-29 ),
	/* State 26 */ new Array( 109/* "$" */,-30 , 7/* "STARTSHAPE" */,-30 , 8/* "BACKGROUND" */,-30 , 9/* "INCLUDE" */,-30 , 10/* "TILE" */,-30 , 35/* "SIZE" */,-30 , 11/* "RULE" */,-30 , 12/* "PATH" */,-30 , 13/* "{" */,-30 , 70/* "RATIONAL" */,-30 , 14/* "}" */,-30 , 20/* "ROTATE" */,-30 , 21/* "FLIP" */,-30 , 26/* "XSHIFT" */,-30 , 27/* "YSHIFT" */,-30 , 36/* "SKEW" */,-30 , 48/* "GLOBALX" */,-30 , 49/* "GLOBALY" */,-30 , 22/* "HUE" */,-30 , 23/* "SATURATION" */,-30 , 24/* "BRIGHTNESS" */,-30 , 25/* "ALPHA" */,-30 , 37/* "TARGETHUE" */,-30 , 38/* "TARGETSATURATION" */,-30 , 39/* "TARGETBRIGHTNESS" */,-30 , 40/* "TARGETALPHA" */,-30 , 62/* "SHADOWOFFSETX" */,-30 , 63/* "SHADOWOFFSETY" */,-30 , 64/* "SHADOWBLUR" */,-30 , 65/* "SHADOWHUE" */,-30 , 67/* "SHADOWBRIGHTNESS" */,-30 , 66/* "SHADOWSATURATION" */,-30 , 68/* "SHADOWALPHA" */,-30 , 34/* "ZSHIFT" */,-30 , 42/* "PARAMETERS" */,-30 , 47/* "NONPATHSTROKEWIDTH" */,-30 , 43/* "STROKEWIDTH" */,-30 , 52/* "EMPTYOUTTEXT" */,-30 , 53/* "BACKSPC" */,-30 , 51/* "PIPETEXT" */,-30 , 50/* "TEXT" */,-30 , 54/* "FONTNAME" */,-30 , 55/* "FONTSIZE" */,-30 , 56/* "FONTUNIT" */,-30 , 57/* "FONTSTYLE" */,-30 , 58/* "STROKETEXT" */,-30 , 59/* "FILLTEXT" */,-30 , 61/* "TEXTALIGN" */,-30 , 60/* "TEXTBASELINE" */,-30 , 16/* "]" */,-30 , 15/* "[" */,-30 ),
	/* State 27 */ new Array( 109/* "$" */,-31 , 7/* "STARTSHAPE" */,-31 , 8/* "BACKGROUND" */,-31 , 9/* "INCLUDE" */,-31 , 10/* "TILE" */,-31 , 35/* "SIZE" */,-31 , 11/* "RULE" */,-31 , 12/* "PATH" */,-31 , 13/* "{" */,-31 , 70/* "RATIONAL" */,-31 , 14/* "}" */,-31 , 20/* "ROTATE" */,-31 , 21/* "FLIP" */,-31 , 26/* "XSHIFT" */,-31 , 27/* "YSHIFT" */,-31 , 36/* "SKEW" */,-31 , 48/* "GLOBALX" */,-31 , 49/* "GLOBALY" */,-31 , 22/* "HUE" */,-31 , 23/* "SATURATION" */,-31 , 24/* "BRIGHTNESS" */,-31 , 25/* "ALPHA" */,-31 , 37/* "TARGETHUE" */,-31 , 38/* "TARGETSATURATION" */,-31 , 39/* "TARGETBRIGHTNESS" */,-31 , 40/* "TARGETALPHA" */,-31 , 62/* "SHADOWOFFSETX" */,-31 , 63/* "SHADOWOFFSETY" */,-31 , 64/* "SHADOWBLUR" */,-31 , 65/* "SHADOWHUE" */,-31 , 67/* "SHADOWBRIGHTNESS" */,-31 , 66/* "SHADOWSATURATION" */,-31 , 68/* "SHADOWALPHA" */,-31 , 34/* "ZSHIFT" */,-31 , 42/* "PARAMETERS" */,-31 , 47/* "NONPATHSTROKEWIDTH" */,-31 , 43/* "STROKEWIDTH" */,-31 , 52/* "EMPTYOUTTEXT" */,-31 , 53/* "BACKSPC" */,-31 , 51/* "PIPETEXT" */,-31 , 50/* "TEXT" */,-31 , 54/* "FONTNAME" */,-31 , 55/* "FONTSIZE" */,-31 , 56/* "FONTUNIT" */,-31 , 57/* "FONTSTYLE" */,-31 , 58/* "STROKETEXT" */,-31 , 59/* "FILLTEXT" */,-31 , 61/* "TEXTALIGN" */,-31 , 60/* "TEXTBASELINE" */,-31 , 16/* "]" */,-31 , 15/* "[" */,-31 ),
	/* State 28 */ new Array( 109/* "$" */,-32 , 7/* "STARTSHAPE" */,-32 , 8/* "BACKGROUND" */,-32 , 9/* "INCLUDE" */,-32 , 10/* "TILE" */,-32 , 35/* "SIZE" */,-32 , 11/* "RULE" */,-32 , 12/* "PATH" */,-32 , 13/* "{" */,-32 , 70/* "RATIONAL" */,-32 , 14/* "}" */,-32 , 20/* "ROTATE" */,-32 , 21/* "FLIP" */,-32 , 26/* "XSHIFT" */,-32 , 27/* "YSHIFT" */,-32 , 36/* "SKEW" */,-32 , 48/* "GLOBALX" */,-32 , 49/* "GLOBALY" */,-32 , 22/* "HUE" */,-32 , 23/* "SATURATION" */,-32 , 24/* "BRIGHTNESS" */,-32 , 25/* "ALPHA" */,-32 , 37/* "TARGETHUE" */,-32 , 38/* "TARGETSATURATION" */,-32 , 39/* "TARGETBRIGHTNESS" */,-32 , 40/* "TARGETALPHA" */,-32 , 62/* "SHADOWOFFSETX" */,-32 , 63/* "SHADOWOFFSETY" */,-32 , 64/* "SHADOWBLUR" */,-32 , 65/* "SHADOWHUE" */,-32 , 67/* "SHADOWBRIGHTNESS" */,-32 , 66/* "SHADOWSATURATION" */,-32 , 68/* "SHADOWALPHA" */,-32 , 34/* "ZSHIFT" */,-32 , 42/* "PARAMETERS" */,-32 , 47/* "NONPATHSTROKEWIDTH" */,-32 , 43/* "STROKEWIDTH" */,-32 , 52/* "EMPTYOUTTEXT" */,-32 , 53/* "BACKSPC" */,-32 , 51/* "PIPETEXT" */,-32 , 50/* "TEXT" */,-32 , 54/* "FONTNAME" */,-32 , 55/* "FONTSIZE" */,-32 , 56/* "FONTUNIT" */,-32 , 57/* "FONTSTYLE" */,-32 , 58/* "STROKETEXT" */,-32 , 59/* "FILLTEXT" */,-32 , 61/* "TEXTALIGN" */,-32 , 60/* "TEXTBASELINE" */,-32 , 16/* "]" */,-32 , 15/* "[" */,-32 ),
	/* State 29 */ new Array( 109/* "$" */,-33 , 7/* "STARTSHAPE" */,-33 , 8/* "BACKGROUND" */,-33 , 9/* "INCLUDE" */,-33 , 10/* "TILE" */,-33 , 35/* "SIZE" */,-33 , 11/* "RULE" */,-33 , 12/* "PATH" */,-33 , 13/* "{" */,-33 , 70/* "RATIONAL" */,-33 , 14/* "}" */,-33 , 20/* "ROTATE" */,-33 , 21/* "FLIP" */,-33 , 26/* "XSHIFT" */,-33 , 27/* "YSHIFT" */,-33 , 36/* "SKEW" */,-33 , 48/* "GLOBALX" */,-33 , 49/* "GLOBALY" */,-33 , 22/* "HUE" */,-33 , 23/* "SATURATION" */,-33 , 24/* "BRIGHTNESS" */,-33 , 25/* "ALPHA" */,-33 , 37/* "TARGETHUE" */,-33 , 38/* "TARGETSATURATION" */,-33 , 39/* "TARGETBRIGHTNESS" */,-33 , 40/* "TARGETALPHA" */,-33 , 62/* "SHADOWOFFSETX" */,-33 , 63/* "SHADOWOFFSETY" */,-33 , 64/* "SHADOWBLUR" */,-33 , 65/* "SHADOWHUE" */,-33 , 67/* "SHADOWBRIGHTNESS" */,-33 , 66/* "SHADOWSATURATION" */,-33 , 68/* "SHADOWALPHA" */,-33 , 34/* "ZSHIFT" */,-33 , 42/* "PARAMETERS" */,-33 , 47/* "NONPATHSTROKEWIDTH" */,-33 , 43/* "STROKEWIDTH" */,-33 , 52/* "EMPTYOUTTEXT" */,-33 , 53/* "BACKSPC" */,-33 , 51/* "PIPETEXT" */,-33 , 50/* "TEXT" */,-33 , 54/* "FONTNAME" */,-33 , 55/* "FONTSIZE" */,-33 , 56/* "FONTUNIT" */,-33 , 57/* "FONTSTYLE" */,-33 , 58/* "STROKETEXT" */,-33 , 59/* "FILLTEXT" */,-33 , 61/* "TEXTALIGN" */,-33 , 60/* "TEXTBASELINE" */,-33 , 16/* "]" */,-33 , 15/* "[" */,-33 ),
	/* State 30 */ new Array( 109/* "$" */,-34 , 7/* "STARTSHAPE" */,-34 , 8/* "BACKGROUND" */,-34 , 9/* "INCLUDE" */,-34 , 10/* "TILE" */,-34 , 35/* "SIZE" */,-34 , 11/* "RULE" */,-34 , 12/* "PATH" */,-34 , 13/* "{" */,-34 , 70/* "RATIONAL" */,-34 , 14/* "}" */,-34 , 20/* "ROTATE" */,-34 , 21/* "FLIP" */,-34 , 26/* "XSHIFT" */,-34 , 27/* "YSHIFT" */,-34 , 36/* "SKEW" */,-34 , 48/* "GLOBALX" */,-34 , 49/* "GLOBALY" */,-34 , 22/* "HUE" */,-34 , 23/* "SATURATION" */,-34 , 24/* "BRIGHTNESS" */,-34 , 25/* "ALPHA" */,-34 , 37/* "TARGETHUE" */,-34 , 38/* "TARGETSATURATION" */,-34 , 39/* "TARGETBRIGHTNESS" */,-34 , 40/* "TARGETALPHA" */,-34 , 62/* "SHADOWOFFSETX" */,-34 , 63/* "SHADOWOFFSETY" */,-34 , 64/* "SHADOWBLUR" */,-34 , 65/* "SHADOWHUE" */,-34 , 67/* "SHADOWBRIGHTNESS" */,-34 , 66/* "SHADOWSATURATION" */,-34 , 68/* "SHADOWALPHA" */,-34 , 34/* "ZSHIFT" */,-34 , 42/* "PARAMETERS" */,-34 , 47/* "NONPATHSTROKEWIDTH" */,-34 , 43/* "STROKEWIDTH" */,-34 , 52/* "EMPTYOUTTEXT" */,-34 , 53/* "BACKSPC" */,-34 , 51/* "PIPETEXT" */,-34 , 50/* "TEXT" */,-34 , 54/* "FONTNAME" */,-34 , 55/* "FONTSIZE" */,-34 , 56/* "FONTUNIT" */,-34 , 57/* "FONTSTYLE" */,-34 , 58/* "STROKETEXT" */,-34 , 59/* "FILLTEXT" */,-34 , 61/* "TEXTALIGN" */,-34 , 60/* "TEXTBASELINE" */,-34 , 16/* "]" */,-34 , 15/* "[" */,-34 ),
	/* State 31 */ new Array( 109/* "$" */,-35 , 7/* "STARTSHAPE" */,-35 , 8/* "BACKGROUND" */,-35 , 9/* "INCLUDE" */,-35 , 10/* "TILE" */,-35 , 35/* "SIZE" */,-35 , 11/* "RULE" */,-35 , 12/* "PATH" */,-35 , 13/* "{" */,-35 , 70/* "RATIONAL" */,-35 , 14/* "}" */,-35 , 20/* "ROTATE" */,-35 , 21/* "FLIP" */,-35 , 26/* "XSHIFT" */,-35 , 27/* "YSHIFT" */,-35 , 36/* "SKEW" */,-35 , 48/* "GLOBALX" */,-35 , 49/* "GLOBALY" */,-35 , 22/* "HUE" */,-35 , 23/* "SATURATION" */,-35 , 24/* "BRIGHTNESS" */,-35 , 25/* "ALPHA" */,-35 , 37/* "TARGETHUE" */,-35 , 38/* "TARGETSATURATION" */,-35 , 39/* "TARGETBRIGHTNESS" */,-35 , 40/* "TARGETALPHA" */,-35 , 62/* "SHADOWOFFSETX" */,-35 , 63/* "SHADOWOFFSETY" */,-35 , 64/* "SHADOWBLUR" */,-35 , 65/* "SHADOWHUE" */,-35 , 67/* "SHADOWBRIGHTNESS" */,-35 , 66/* "SHADOWSATURATION" */,-35 , 68/* "SHADOWALPHA" */,-35 , 34/* "ZSHIFT" */,-35 , 42/* "PARAMETERS" */,-35 , 47/* "NONPATHSTROKEWIDTH" */,-35 , 43/* "STROKEWIDTH" */,-35 , 52/* "EMPTYOUTTEXT" */,-35 , 53/* "BACKSPC" */,-35 , 51/* "PIPETEXT" */,-35 , 50/* "TEXT" */,-35 , 54/* "FONTNAME" */,-35 , 55/* "FONTSIZE" */,-35 , 56/* "FONTUNIT" */,-35 , 57/* "FONTSTYLE" */,-35 , 58/* "STROKETEXT" */,-35 , 59/* "FILLTEXT" */,-35 , 61/* "TEXTALIGN" */,-35 , 60/* "TEXTBASELINE" */,-35 , 16/* "]" */,-35 , 15/* "[" */,-35 ),
	/* State 32 */ new Array( 109/* "$" */,-36 , 7/* "STARTSHAPE" */,-36 , 8/* "BACKGROUND" */,-36 , 9/* "INCLUDE" */,-36 , 10/* "TILE" */,-36 , 35/* "SIZE" */,-36 , 11/* "RULE" */,-36 , 12/* "PATH" */,-36 , 13/* "{" */,-36 , 70/* "RATIONAL" */,-36 , 14/* "}" */,-36 , 20/* "ROTATE" */,-36 , 21/* "FLIP" */,-36 , 26/* "XSHIFT" */,-36 , 27/* "YSHIFT" */,-36 , 36/* "SKEW" */,-36 , 48/* "GLOBALX" */,-36 , 49/* "GLOBALY" */,-36 , 22/* "HUE" */,-36 , 23/* "SATURATION" */,-36 , 24/* "BRIGHTNESS" */,-36 , 25/* "ALPHA" */,-36 , 37/* "TARGETHUE" */,-36 , 38/* "TARGETSATURATION" */,-36 , 39/* "TARGETBRIGHTNESS" */,-36 , 40/* "TARGETALPHA" */,-36 , 62/* "SHADOWOFFSETX" */,-36 , 63/* "SHADOWOFFSETY" */,-36 , 64/* "SHADOWBLUR" */,-36 , 65/* "SHADOWHUE" */,-36 , 67/* "SHADOWBRIGHTNESS" */,-36 , 66/* "SHADOWSATURATION" */,-36 , 68/* "SHADOWALPHA" */,-36 , 34/* "ZSHIFT" */,-36 , 42/* "PARAMETERS" */,-36 , 47/* "NONPATHSTROKEWIDTH" */,-36 , 43/* "STROKEWIDTH" */,-36 , 52/* "EMPTYOUTTEXT" */,-36 , 53/* "BACKSPC" */,-36 , 51/* "PIPETEXT" */,-36 , 50/* "TEXT" */,-36 , 54/* "FONTNAME" */,-36 , 55/* "FONTSIZE" */,-36 , 56/* "FONTUNIT" */,-36 , 57/* "FONTSTYLE" */,-36 , 58/* "STROKETEXT" */,-36 , 59/* "FILLTEXT" */,-36 , 61/* "TEXTALIGN" */,-36 , 60/* "TEXTBASELINE" */,-36 , 16/* "]" */,-36 , 15/* "[" */,-36 ),
	/* State 33 */ new Array( 109/* "$" */,-37 , 7/* "STARTSHAPE" */,-37 , 8/* "BACKGROUND" */,-37 , 9/* "INCLUDE" */,-37 , 10/* "TILE" */,-37 , 35/* "SIZE" */,-37 , 11/* "RULE" */,-37 , 12/* "PATH" */,-37 , 13/* "{" */,-37 , 70/* "RATIONAL" */,-37 , 14/* "}" */,-37 , 20/* "ROTATE" */,-37 , 21/* "FLIP" */,-37 , 26/* "XSHIFT" */,-37 , 27/* "YSHIFT" */,-37 , 36/* "SKEW" */,-37 , 48/* "GLOBALX" */,-37 , 49/* "GLOBALY" */,-37 , 22/* "HUE" */,-37 , 23/* "SATURATION" */,-37 , 24/* "BRIGHTNESS" */,-37 , 25/* "ALPHA" */,-37 , 37/* "TARGETHUE" */,-37 , 38/* "TARGETSATURATION" */,-37 , 39/* "TARGETBRIGHTNESS" */,-37 , 40/* "TARGETALPHA" */,-37 , 62/* "SHADOWOFFSETX" */,-37 , 63/* "SHADOWOFFSETY" */,-37 , 64/* "SHADOWBLUR" */,-37 , 65/* "SHADOWHUE" */,-37 , 67/* "SHADOWBRIGHTNESS" */,-37 , 66/* "SHADOWSATURATION" */,-37 , 68/* "SHADOWALPHA" */,-37 , 34/* "ZSHIFT" */,-37 , 42/* "PARAMETERS" */,-37 , 47/* "NONPATHSTROKEWIDTH" */,-37 , 43/* "STROKEWIDTH" */,-37 , 52/* "EMPTYOUTTEXT" */,-37 , 53/* "BACKSPC" */,-37 , 51/* "PIPETEXT" */,-37 , 50/* "TEXT" */,-37 , 54/* "FONTNAME" */,-37 , 55/* "FONTSIZE" */,-37 , 56/* "FONTUNIT" */,-37 , 57/* "FONTSTYLE" */,-37 , 58/* "STROKETEXT" */,-37 , 59/* "FILLTEXT" */,-37 , 61/* "TEXTALIGN" */,-37 , 60/* "TEXTBASELINE" */,-37 , 16/* "]" */,-37 , 15/* "[" */,-37 ),
	/* State 34 */ new Array( 109/* "$" */,-38 , 7/* "STARTSHAPE" */,-38 , 8/* "BACKGROUND" */,-38 , 9/* "INCLUDE" */,-38 , 10/* "TILE" */,-38 , 35/* "SIZE" */,-38 , 11/* "RULE" */,-38 , 12/* "PATH" */,-38 , 13/* "{" */,-38 , 70/* "RATIONAL" */,-38 , 14/* "}" */,-38 , 20/* "ROTATE" */,-38 , 21/* "FLIP" */,-38 , 26/* "XSHIFT" */,-38 , 27/* "YSHIFT" */,-38 , 36/* "SKEW" */,-38 , 48/* "GLOBALX" */,-38 , 49/* "GLOBALY" */,-38 , 22/* "HUE" */,-38 , 23/* "SATURATION" */,-38 , 24/* "BRIGHTNESS" */,-38 , 25/* "ALPHA" */,-38 , 37/* "TARGETHUE" */,-38 , 38/* "TARGETSATURATION" */,-38 , 39/* "TARGETBRIGHTNESS" */,-38 , 40/* "TARGETALPHA" */,-38 , 62/* "SHADOWOFFSETX" */,-38 , 63/* "SHADOWOFFSETY" */,-38 , 64/* "SHADOWBLUR" */,-38 , 65/* "SHADOWHUE" */,-38 , 67/* "SHADOWBRIGHTNESS" */,-38 , 66/* "SHADOWSATURATION" */,-38 , 68/* "SHADOWALPHA" */,-38 , 34/* "ZSHIFT" */,-38 , 42/* "PARAMETERS" */,-38 , 47/* "NONPATHSTROKEWIDTH" */,-38 , 43/* "STROKEWIDTH" */,-38 , 52/* "EMPTYOUTTEXT" */,-38 , 53/* "BACKSPC" */,-38 , 51/* "PIPETEXT" */,-38 , 50/* "TEXT" */,-38 , 54/* "FONTNAME" */,-38 , 55/* "FONTSIZE" */,-38 , 56/* "FONTUNIT" */,-38 , 57/* "FONTSTYLE" */,-38 , 58/* "STROKETEXT" */,-38 , 59/* "FILLTEXT" */,-38 , 61/* "TEXTALIGN" */,-38 , 60/* "TEXTBASELINE" */,-38 , 16/* "]" */,-38 , 15/* "[" */,-38 ),
	/* State 35 */ new Array( 109/* "$" */,-39 , 7/* "STARTSHAPE" */,-39 , 8/* "BACKGROUND" */,-39 , 9/* "INCLUDE" */,-39 , 10/* "TILE" */,-39 , 35/* "SIZE" */,-39 , 11/* "RULE" */,-39 , 12/* "PATH" */,-39 , 13/* "{" */,-39 , 70/* "RATIONAL" */,-39 , 14/* "}" */,-39 , 20/* "ROTATE" */,-39 , 21/* "FLIP" */,-39 , 26/* "XSHIFT" */,-39 , 27/* "YSHIFT" */,-39 , 36/* "SKEW" */,-39 , 48/* "GLOBALX" */,-39 , 49/* "GLOBALY" */,-39 , 22/* "HUE" */,-39 , 23/* "SATURATION" */,-39 , 24/* "BRIGHTNESS" */,-39 , 25/* "ALPHA" */,-39 , 37/* "TARGETHUE" */,-39 , 38/* "TARGETSATURATION" */,-39 , 39/* "TARGETBRIGHTNESS" */,-39 , 40/* "TARGETALPHA" */,-39 , 62/* "SHADOWOFFSETX" */,-39 , 63/* "SHADOWOFFSETY" */,-39 , 64/* "SHADOWBLUR" */,-39 , 65/* "SHADOWHUE" */,-39 , 67/* "SHADOWBRIGHTNESS" */,-39 , 66/* "SHADOWSATURATION" */,-39 , 68/* "SHADOWALPHA" */,-39 , 34/* "ZSHIFT" */,-39 , 42/* "PARAMETERS" */,-39 , 47/* "NONPATHSTROKEWIDTH" */,-39 , 43/* "STROKEWIDTH" */,-39 , 52/* "EMPTYOUTTEXT" */,-39 , 53/* "BACKSPC" */,-39 , 51/* "PIPETEXT" */,-39 , 50/* "TEXT" */,-39 , 54/* "FONTNAME" */,-39 , 55/* "FONTSIZE" */,-39 , 56/* "FONTUNIT" */,-39 , 57/* "FONTSTYLE" */,-39 , 58/* "STROKETEXT" */,-39 , 59/* "FILLTEXT" */,-39 , 61/* "TEXTALIGN" */,-39 , 60/* "TEXTBASELINE" */,-39 , 16/* "]" */,-39 , 15/* "[" */,-39 ),
	/* State 36 */ new Array( 109/* "$" */,-40 , 7/* "STARTSHAPE" */,-40 , 8/* "BACKGROUND" */,-40 , 9/* "INCLUDE" */,-40 , 10/* "TILE" */,-40 , 35/* "SIZE" */,-40 , 11/* "RULE" */,-40 , 12/* "PATH" */,-40 , 13/* "{" */,-40 , 70/* "RATIONAL" */,-40 , 14/* "}" */,-40 , 20/* "ROTATE" */,-40 , 21/* "FLIP" */,-40 , 26/* "XSHIFT" */,-40 , 27/* "YSHIFT" */,-40 , 36/* "SKEW" */,-40 , 48/* "GLOBALX" */,-40 , 49/* "GLOBALY" */,-40 , 22/* "HUE" */,-40 , 23/* "SATURATION" */,-40 , 24/* "BRIGHTNESS" */,-40 , 25/* "ALPHA" */,-40 , 37/* "TARGETHUE" */,-40 , 38/* "TARGETSATURATION" */,-40 , 39/* "TARGETBRIGHTNESS" */,-40 , 40/* "TARGETALPHA" */,-40 , 62/* "SHADOWOFFSETX" */,-40 , 63/* "SHADOWOFFSETY" */,-40 , 64/* "SHADOWBLUR" */,-40 , 65/* "SHADOWHUE" */,-40 , 67/* "SHADOWBRIGHTNESS" */,-40 , 66/* "SHADOWSATURATION" */,-40 , 68/* "SHADOWALPHA" */,-40 , 34/* "ZSHIFT" */,-40 , 42/* "PARAMETERS" */,-40 , 47/* "NONPATHSTROKEWIDTH" */,-40 , 43/* "STROKEWIDTH" */,-40 , 52/* "EMPTYOUTTEXT" */,-40 , 53/* "BACKSPC" */,-40 , 51/* "PIPETEXT" */,-40 , 50/* "TEXT" */,-40 , 54/* "FONTNAME" */,-40 , 55/* "FONTSIZE" */,-40 , 56/* "FONTUNIT" */,-40 , 57/* "FONTSTYLE" */,-40 , 58/* "STROKETEXT" */,-40 , 59/* "FILLTEXT" */,-40 , 61/* "TEXTALIGN" */,-40 , 60/* "TEXTBASELINE" */,-40 , 16/* "]" */,-40 , 15/* "[" */,-40 ),
	/* State 37 */ new Array( 109/* "$" */,-41 , 7/* "STARTSHAPE" */,-41 , 8/* "BACKGROUND" */,-41 , 9/* "INCLUDE" */,-41 , 10/* "TILE" */,-41 , 35/* "SIZE" */,-41 , 11/* "RULE" */,-41 , 12/* "PATH" */,-41 , 13/* "{" */,-41 , 70/* "RATIONAL" */,-41 , 14/* "}" */,-41 , 20/* "ROTATE" */,-41 , 21/* "FLIP" */,-41 , 26/* "XSHIFT" */,-41 , 27/* "YSHIFT" */,-41 , 36/* "SKEW" */,-41 , 48/* "GLOBALX" */,-41 , 49/* "GLOBALY" */,-41 , 22/* "HUE" */,-41 , 23/* "SATURATION" */,-41 , 24/* "BRIGHTNESS" */,-41 , 25/* "ALPHA" */,-41 , 37/* "TARGETHUE" */,-41 , 38/* "TARGETSATURATION" */,-41 , 39/* "TARGETBRIGHTNESS" */,-41 , 40/* "TARGETALPHA" */,-41 , 62/* "SHADOWOFFSETX" */,-41 , 63/* "SHADOWOFFSETY" */,-41 , 64/* "SHADOWBLUR" */,-41 , 65/* "SHADOWHUE" */,-41 , 67/* "SHADOWBRIGHTNESS" */,-41 , 66/* "SHADOWSATURATION" */,-41 , 68/* "SHADOWALPHA" */,-41 , 34/* "ZSHIFT" */,-41 , 42/* "PARAMETERS" */,-41 , 47/* "NONPATHSTROKEWIDTH" */,-41 , 43/* "STROKEWIDTH" */,-41 , 52/* "EMPTYOUTTEXT" */,-41 , 53/* "BACKSPC" */,-41 , 51/* "PIPETEXT" */,-41 , 50/* "TEXT" */,-41 , 54/* "FONTNAME" */,-41 , 55/* "FONTSIZE" */,-41 , 56/* "FONTUNIT" */,-41 , 57/* "FONTSTYLE" */,-41 , 58/* "STROKETEXT" */,-41 , 59/* "FILLTEXT" */,-41 , 61/* "TEXTALIGN" */,-41 , 60/* "TEXTBASELINE" */,-41 , 16/* "]" */,-41 , 15/* "[" */,-41 ),
	/* State 38 */ new Array( 109/* "$" */,-42 , 7/* "STARTSHAPE" */,-42 , 8/* "BACKGROUND" */,-42 , 9/* "INCLUDE" */,-42 , 10/* "TILE" */,-42 , 35/* "SIZE" */,-42 , 11/* "RULE" */,-42 , 12/* "PATH" */,-42 , 13/* "{" */,-42 , 70/* "RATIONAL" */,-42 , 14/* "}" */,-42 , 20/* "ROTATE" */,-42 , 21/* "FLIP" */,-42 , 26/* "XSHIFT" */,-42 , 27/* "YSHIFT" */,-42 , 36/* "SKEW" */,-42 , 48/* "GLOBALX" */,-42 , 49/* "GLOBALY" */,-42 , 22/* "HUE" */,-42 , 23/* "SATURATION" */,-42 , 24/* "BRIGHTNESS" */,-42 , 25/* "ALPHA" */,-42 , 37/* "TARGETHUE" */,-42 , 38/* "TARGETSATURATION" */,-42 , 39/* "TARGETBRIGHTNESS" */,-42 , 40/* "TARGETALPHA" */,-42 , 62/* "SHADOWOFFSETX" */,-42 , 63/* "SHADOWOFFSETY" */,-42 , 64/* "SHADOWBLUR" */,-42 , 65/* "SHADOWHUE" */,-42 , 67/* "SHADOWBRIGHTNESS" */,-42 , 66/* "SHADOWSATURATION" */,-42 , 68/* "SHADOWALPHA" */,-42 , 34/* "ZSHIFT" */,-42 , 42/* "PARAMETERS" */,-42 , 47/* "NONPATHSTROKEWIDTH" */,-42 , 43/* "STROKEWIDTH" */,-42 , 52/* "EMPTYOUTTEXT" */,-42 , 53/* "BACKSPC" */,-42 , 51/* "PIPETEXT" */,-42 , 50/* "TEXT" */,-42 , 54/* "FONTNAME" */,-42 , 55/* "FONTSIZE" */,-42 , 56/* "FONTUNIT" */,-42 , 57/* "FONTSTYLE" */,-42 , 58/* "STROKETEXT" */,-42 , 59/* "FILLTEXT" */,-42 , 61/* "TEXTALIGN" */,-42 , 60/* "TEXTBASELINE" */,-42 , 16/* "]" */,-42 , 15/* "[" */,-42 ),
	/* State 39 */ new Array( 109/* "$" */,-43 , 7/* "STARTSHAPE" */,-43 , 8/* "BACKGROUND" */,-43 , 9/* "INCLUDE" */,-43 , 10/* "TILE" */,-43 , 35/* "SIZE" */,-43 , 11/* "RULE" */,-43 , 12/* "PATH" */,-43 , 13/* "{" */,-43 , 70/* "RATIONAL" */,-43 , 14/* "}" */,-43 , 20/* "ROTATE" */,-43 , 21/* "FLIP" */,-43 , 26/* "XSHIFT" */,-43 , 27/* "YSHIFT" */,-43 , 36/* "SKEW" */,-43 , 48/* "GLOBALX" */,-43 , 49/* "GLOBALY" */,-43 , 22/* "HUE" */,-43 , 23/* "SATURATION" */,-43 , 24/* "BRIGHTNESS" */,-43 , 25/* "ALPHA" */,-43 , 37/* "TARGETHUE" */,-43 , 38/* "TARGETSATURATION" */,-43 , 39/* "TARGETBRIGHTNESS" */,-43 , 40/* "TARGETALPHA" */,-43 , 62/* "SHADOWOFFSETX" */,-43 , 63/* "SHADOWOFFSETY" */,-43 , 64/* "SHADOWBLUR" */,-43 , 65/* "SHADOWHUE" */,-43 , 67/* "SHADOWBRIGHTNESS" */,-43 , 66/* "SHADOWSATURATION" */,-43 , 68/* "SHADOWALPHA" */,-43 , 34/* "ZSHIFT" */,-43 , 42/* "PARAMETERS" */,-43 , 47/* "NONPATHSTROKEWIDTH" */,-43 , 43/* "STROKEWIDTH" */,-43 , 52/* "EMPTYOUTTEXT" */,-43 , 53/* "BACKSPC" */,-43 , 51/* "PIPETEXT" */,-43 , 50/* "TEXT" */,-43 , 54/* "FONTNAME" */,-43 , 55/* "FONTSIZE" */,-43 , 56/* "FONTUNIT" */,-43 , 57/* "FONTSTYLE" */,-43 , 58/* "STROKETEXT" */,-43 , 59/* "FILLTEXT" */,-43 , 61/* "TEXTALIGN" */,-43 , 60/* "TEXTBASELINE" */,-43 , 16/* "]" */,-43 , 15/* "[" */,-43 ),
	/* State 40 */ new Array( 109/* "$" */,-44 , 7/* "STARTSHAPE" */,-44 , 8/* "BACKGROUND" */,-44 , 9/* "INCLUDE" */,-44 , 10/* "TILE" */,-44 , 35/* "SIZE" */,-44 , 11/* "RULE" */,-44 , 12/* "PATH" */,-44 , 13/* "{" */,-44 , 70/* "RATIONAL" */,-44 , 14/* "}" */,-44 , 20/* "ROTATE" */,-44 , 21/* "FLIP" */,-44 , 26/* "XSHIFT" */,-44 , 27/* "YSHIFT" */,-44 , 36/* "SKEW" */,-44 , 48/* "GLOBALX" */,-44 , 49/* "GLOBALY" */,-44 , 22/* "HUE" */,-44 , 23/* "SATURATION" */,-44 , 24/* "BRIGHTNESS" */,-44 , 25/* "ALPHA" */,-44 , 37/* "TARGETHUE" */,-44 , 38/* "TARGETSATURATION" */,-44 , 39/* "TARGETBRIGHTNESS" */,-44 , 40/* "TARGETALPHA" */,-44 , 62/* "SHADOWOFFSETX" */,-44 , 63/* "SHADOWOFFSETY" */,-44 , 64/* "SHADOWBLUR" */,-44 , 65/* "SHADOWHUE" */,-44 , 67/* "SHADOWBRIGHTNESS" */,-44 , 66/* "SHADOWSATURATION" */,-44 , 68/* "SHADOWALPHA" */,-44 , 34/* "ZSHIFT" */,-44 , 42/* "PARAMETERS" */,-44 , 47/* "NONPATHSTROKEWIDTH" */,-44 , 43/* "STROKEWIDTH" */,-44 , 52/* "EMPTYOUTTEXT" */,-44 , 53/* "BACKSPC" */,-44 , 51/* "PIPETEXT" */,-44 , 50/* "TEXT" */,-44 , 54/* "FONTNAME" */,-44 , 55/* "FONTSIZE" */,-44 , 56/* "FONTUNIT" */,-44 , 57/* "FONTSTYLE" */,-44 , 58/* "STROKETEXT" */,-44 , 59/* "FILLTEXT" */,-44 , 61/* "TEXTALIGN" */,-44 , 60/* "TEXTBASELINE" */,-44 , 16/* "]" */,-44 , 15/* "[" */,-44 ),
	/* State 41 */ new Array( 109/* "$" */,-45 , 7/* "STARTSHAPE" */,-45 , 8/* "BACKGROUND" */,-45 , 9/* "INCLUDE" */,-45 , 10/* "TILE" */,-45 , 35/* "SIZE" */,-45 , 11/* "RULE" */,-45 , 12/* "PATH" */,-45 , 13/* "{" */,-45 , 70/* "RATIONAL" */,-45 , 14/* "}" */,-45 , 20/* "ROTATE" */,-45 , 21/* "FLIP" */,-45 , 26/* "XSHIFT" */,-45 , 27/* "YSHIFT" */,-45 , 36/* "SKEW" */,-45 , 48/* "GLOBALX" */,-45 , 49/* "GLOBALY" */,-45 , 22/* "HUE" */,-45 , 23/* "SATURATION" */,-45 , 24/* "BRIGHTNESS" */,-45 , 25/* "ALPHA" */,-45 , 37/* "TARGETHUE" */,-45 , 38/* "TARGETSATURATION" */,-45 , 39/* "TARGETBRIGHTNESS" */,-45 , 40/* "TARGETALPHA" */,-45 , 62/* "SHADOWOFFSETX" */,-45 , 63/* "SHADOWOFFSETY" */,-45 , 64/* "SHADOWBLUR" */,-45 , 65/* "SHADOWHUE" */,-45 , 67/* "SHADOWBRIGHTNESS" */,-45 , 66/* "SHADOWSATURATION" */,-45 , 68/* "SHADOWALPHA" */,-45 , 34/* "ZSHIFT" */,-45 , 42/* "PARAMETERS" */,-45 , 47/* "NONPATHSTROKEWIDTH" */,-45 , 43/* "STROKEWIDTH" */,-45 , 52/* "EMPTYOUTTEXT" */,-45 , 53/* "BACKSPC" */,-45 , 51/* "PIPETEXT" */,-45 , 50/* "TEXT" */,-45 , 54/* "FONTNAME" */,-45 , 55/* "FONTSIZE" */,-45 , 56/* "FONTUNIT" */,-45 , 57/* "FONTSTYLE" */,-45 , 58/* "STROKETEXT" */,-45 , 59/* "FILLTEXT" */,-45 , 61/* "TEXTALIGN" */,-45 , 60/* "TEXTBASELINE" */,-45 , 16/* "]" */,-45 , 15/* "[" */,-45 ),
	/* State 42 */ new Array( 109/* "$" */,-46 , 7/* "STARTSHAPE" */,-46 , 8/* "BACKGROUND" */,-46 , 9/* "INCLUDE" */,-46 , 10/* "TILE" */,-46 , 35/* "SIZE" */,-46 , 11/* "RULE" */,-46 , 12/* "PATH" */,-46 , 13/* "{" */,-46 , 70/* "RATIONAL" */,-46 , 14/* "}" */,-46 , 20/* "ROTATE" */,-46 , 21/* "FLIP" */,-46 , 26/* "XSHIFT" */,-46 , 27/* "YSHIFT" */,-46 , 36/* "SKEW" */,-46 , 48/* "GLOBALX" */,-46 , 49/* "GLOBALY" */,-46 , 22/* "HUE" */,-46 , 23/* "SATURATION" */,-46 , 24/* "BRIGHTNESS" */,-46 , 25/* "ALPHA" */,-46 , 37/* "TARGETHUE" */,-46 , 38/* "TARGETSATURATION" */,-46 , 39/* "TARGETBRIGHTNESS" */,-46 , 40/* "TARGETALPHA" */,-46 , 62/* "SHADOWOFFSETX" */,-46 , 63/* "SHADOWOFFSETY" */,-46 , 64/* "SHADOWBLUR" */,-46 , 65/* "SHADOWHUE" */,-46 , 67/* "SHADOWBRIGHTNESS" */,-46 , 66/* "SHADOWSATURATION" */,-46 , 68/* "SHADOWALPHA" */,-46 , 34/* "ZSHIFT" */,-46 , 42/* "PARAMETERS" */,-46 , 47/* "NONPATHSTROKEWIDTH" */,-46 , 43/* "STROKEWIDTH" */,-46 , 52/* "EMPTYOUTTEXT" */,-46 , 53/* "BACKSPC" */,-46 , 51/* "PIPETEXT" */,-46 , 50/* "TEXT" */,-46 , 54/* "FONTNAME" */,-46 , 55/* "FONTSIZE" */,-46 , 56/* "FONTUNIT" */,-46 , 57/* "FONTSTYLE" */,-46 , 58/* "STROKETEXT" */,-46 , 59/* "FILLTEXT" */,-46 , 61/* "TEXTALIGN" */,-46 , 60/* "TEXTBASELINE" */,-46 , 16/* "]" */,-46 , 15/* "[" */,-46 ),
	/* State 43 */ new Array( 109/* "$" */,-47 , 7/* "STARTSHAPE" */,-47 , 8/* "BACKGROUND" */,-47 , 9/* "INCLUDE" */,-47 , 10/* "TILE" */,-47 , 35/* "SIZE" */,-47 , 11/* "RULE" */,-47 , 12/* "PATH" */,-47 , 13/* "{" */,-47 , 70/* "RATIONAL" */,-47 , 14/* "}" */,-47 , 20/* "ROTATE" */,-47 , 21/* "FLIP" */,-47 , 26/* "XSHIFT" */,-47 , 27/* "YSHIFT" */,-47 , 36/* "SKEW" */,-47 , 48/* "GLOBALX" */,-47 , 49/* "GLOBALY" */,-47 , 22/* "HUE" */,-47 , 23/* "SATURATION" */,-47 , 24/* "BRIGHTNESS" */,-47 , 25/* "ALPHA" */,-47 , 37/* "TARGETHUE" */,-47 , 38/* "TARGETSATURATION" */,-47 , 39/* "TARGETBRIGHTNESS" */,-47 , 40/* "TARGETALPHA" */,-47 , 62/* "SHADOWOFFSETX" */,-47 , 63/* "SHADOWOFFSETY" */,-47 , 64/* "SHADOWBLUR" */,-47 , 65/* "SHADOWHUE" */,-47 , 67/* "SHADOWBRIGHTNESS" */,-47 , 66/* "SHADOWSATURATION" */,-47 , 68/* "SHADOWALPHA" */,-47 , 34/* "ZSHIFT" */,-47 , 42/* "PARAMETERS" */,-47 , 47/* "NONPATHSTROKEWIDTH" */,-47 , 43/* "STROKEWIDTH" */,-47 , 52/* "EMPTYOUTTEXT" */,-47 , 53/* "BACKSPC" */,-47 , 51/* "PIPETEXT" */,-47 , 50/* "TEXT" */,-47 , 54/* "FONTNAME" */,-47 , 55/* "FONTSIZE" */,-47 , 56/* "FONTUNIT" */,-47 , 57/* "FONTSTYLE" */,-47 , 58/* "STROKETEXT" */,-47 , 59/* "FILLTEXT" */,-47 , 61/* "TEXTALIGN" */,-47 , 60/* "TEXTBASELINE" */,-47 , 16/* "]" */,-47 , 15/* "[" */,-47 ),
	/* State 44 */ new Array( 109/* "$" */,-48 , 7/* "STARTSHAPE" */,-48 , 8/* "BACKGROUND" */,-48 , 9/* "INCLUDE" */,-48 , 10/* "TILE" */,-48 , 35/* "SIZE" */,-48 , 11/* "RULE" */,-48 , 12/* "PATH" */,-48 , 13/* "{" */,-48 , 70/* "RATIONAL" */,-48 , 14/* "}" */,-48 , 20/* "ROTATE" */,-48 , 21/* "FLIP" */,-48 , 26/* "XSHIFT" */,-48 , 27/* "YSHIFT" */,-48 , 36/* "SKEW" */,-48 , 48/* "GLOBALX" */,-48 , 49/* "GLOBALY" */,-48 , 22/* "HUE" */,-48 , 23/* "SATURATION" */,-48 , 24/* "BRIGHTNESS" */,-48 , 25/* "ALPHA" */,-48 , 37/* "TARGETHUE" */,-48 , 38/* "TARGETSATURATION" */,-48 , 39/* "TARGETBRIGHTNESS" */,-48 , 40/* "TARGETALPHA" */,-48 , 62/* "SHADOWOFFSETX" */,-48 , 63/* "SHADOWOFFSETY" */,-48 , 64/* "SHADOWBLUR" */,-48 , 65/* "SHADOWHUE" */,-48 , 67/* "SHADOWBRIGHTNESS" */,-48 , 66/* "SHADOWSATURATION" */,-48 , 68/* "SHADOWALPHA" */,-48 , 34/* "ZSHIFT" */,-48 , 42/* "PARAMETERS" */,-48 , 47/* "NONPATHSTROKEWIDTH" */,-48 , 43/* "STROKEWIDTH" */,-48 , 52/* "EMPTYOUTTEXT" */,-48 , 53/* "BACKSPC" */,-48 , 51/* "PIPETEXT" */,-48 , 50/* "TEXT" */,-48 , 54/* "FONTNAME" */,-48 , 55/* "FONTSIZE" */,-48 , 56/* "FONTUNIT" */,-48 , 57/* "FONTSTYLE" */,-48 , 58/* "STROKETEXT" */,-48 , 59/* "FILLTEXT" */,-48 , 61/* "TEXTALIGN" */,-48 , 60/* "TEXTBASELINE" */,-48 , 16/* "]" */,-48 , 15/* "[" */,-48 ),
	/* State 45 */ new Array( 109/* "$" */,-49 , 7/* "STARTSHAPE" */,-49 , 8/* "BACKGROUND" */,-49 , 9/* "INCLUDE" */,-49 , 10/* "TILE" */,-49 , 35/* "SIZE" */,-49 , 11/* "RULE" */,-49 , 12/* "PATH" */,-49 , 13/* "{" */,-49 , 70/* "RATIONAL" */,-49 , 14/* "}" */,-49 , 20/* "ROTATE" */,-49 , 21/* "FLIP" */,-49 , 26/* "XSHIFT" */,-49 , 27/* "YSHIFT" */,-49 , 36/* "SKEW" */,-49 , 48/* "GLOBALX" */,-49 , 49/* "GLOBALY" */,-49 , 22/* "HUE" */,-49 , 23/* "SATURATION" */,-49 , 24/* "BRIGHTNESS" */,-49 , 25/* "ALPHA" */,-49 , 37/* "TARGETHUE" */,-49 , 38/* "TARGETSATURATION" */,-49 , 39/* "TARGETBRIGHTNESS" */,-49 , 40/* "TARGETALPHA" */,-49 , 62/* "SHADOWOFFSETX" */,-49 , 63/* "SHADOWOFFSETY" */,-49 , 64/* "SHADOWBLUR" */,-49 , 65/* "SHADOWHUE" */,-49 , 67/* "SHADOWBRIGHTNESS" */,-49 , 66/* "SHADOWSATURATION" */,-49 , 68/* "SHADOWALPHA" */,-49 , 34/* "ZSHIFT" */,-49 , 42/* "PARAMETERS" */,-49 , 47/* "NONPATHSTROKEWIDTH" */,-49 , 43/* "STROKEWIDTH" */,-49 , 52/* "EMPTYOUTTEXT" */,-49 , 53/* "BACKSPC" */,-49 , 51/* "PIPETEXT" */,-49 , 50/* "TEXT" */,-49 , 54/* "FONTNAME" */,-49 , 55/* "FONTSIZE" */,-49 , 56/* "FONTUNIT" */,-49 , 57/* "FONTSTYLE" */,-49 , 58/* "STROKETEXT" */,-49 , 59/* "FILLTEXT" */,-49 , 61/* "TEXTALIGN" */,-49 , 60/* "TEXTBASELINE" */,-49 , 16/* "]" */,-49 , 15/* "[" */,-49 ),
	/* State 46 */ new Array( 109/* "$" */,-50 , 7/* "STARTSHAPE" */,-50 , 8/* "BACKGROUND" */,-50 , 9/* "INCLUDE" */,-50 , 10/* "TILE" */,-50 , 35/* "SIZE" */,-50 , 11/* "RULE" */,-50 , 12/* "PATH" */,-50 , 13/* "{" */,-50 , 70/* "RATIONAL" */,-50 , 14/* "}" */,-50 , 20/* "ROTATE" */,-50 , 21/* "FLIP" */,-50 , 26/* "XSHIFT" */,-50 , 27/* "YSHIFT" */,-50 , 36/* "SKEW" */,-50 , 48/* "GLOBALX" */,-50 , 49/* "GLOBALY" */,-50 , 22/* "HUE" */,-50 , 23/* "SATURATION" */,-50 , 24/* "BRIGHTNESS" */,-50 , 25/* "ALPHA" */,-50 , 37/* "TARGETHUE" */,-50 , 38/* "TARGETSATURATION" */,-50 , 39/* "TARGETBRIGHTNESS" */,-50 , 40/* "TARGETALPHA" */,-50 , 62/* "SHADOWOFFSETX" */,-50 , 63/* "SHADOWOFFSETY" */,-50 , 64/* "SHADOWBLUR" */,-50 , 65/* "SHADOWHUE" */,-50 , 67/* "SHADOWBRIGHTNESS" */,-50 , 66/* "SHADOWSATURATION" */,-50 , 68/* "SHADOWALPHA" */,-50 , 34/* "ZSHIFT" */,-50 , 42/* "PARAMETERS" */,-50 , 47/* "NONPATHSTROKEWIDTH" */,-50 , 43/* "STROKEWIDTH" */,-50 , 52/* "EMPTYOUTTEXT" */,-50 , 53/* "BACKSPC" */,-50 , 51/* "PIPETEXT" */,-50 , 50/* "TEXT" */,-50 , 54/* "FONTNAME" */,-50 , 55/* "FONTSIZE" */,-50 , 56/* "FONTUNIT" */,-50 , 57/* "FONTSTYLE" */,-50 , 58/* "STROKETEXT" */,-50 , 59/* "FILLTEXT" */,-50 , 61/* "TEXTALIGN" */,-50 , 60/* "TEXTBASELINE" */,-50 , 16/* "]" */,-50 , 15/* "[" */,-50 ),
	/* State 47 */ new Array( 109/* "$" */,-51 , 7/* "STARTSHAPE" */,-51 , 8/* "BACKGROUND" */,-51 , 9/* "INCLUDE" */,-51 , 10/* "TILE" */,-51 , 35/* "SIZE" */,-51 , 11/* "RULE" */,-51 , 12/* "PATH" */,-51 , 13/* "{" */,-51 , 70/* "RATIONAL" */,-51 , 14/* "}" */,-51 , 20/* "ROTATE" */,-51 , 21/* "FLIP" */,-51 , 26/* "XSHIFT" */,-51 , 27/* "YSHIFT" */,-51 , 36/* "SKEW" */,-51 , 48/* "GLOBALX" */,-51 , 49/* "GLOBALY" */,-51 , 22/* "HUE" */,-51 , 23/* "SATURATION" */,-51 , 24/* "BRIGHTNESS" */,-51 , 25/* "ALPHA" */,-51 , 37/* "TARGETHUE" */,-51 , 38/* "TARGETSATURATION" */,-51 , 39/* "TARGETBRIGHTNESS" */,-51 , 40/* "TARGETALPHA" */,-51 , 62/* "SHADOWOFFSETX" */,-51 , 63/* "SHADOWOFFSETY" */,-51 , 64/* "SHADOWBLUR" */,-51 , 65/* "SHADOWHUE" */,-51 , 67/* "SHADOWBRIGHTNESS" */,-51 , 66/* "SHADOWSATURATION" */,-51 , 68/* "SHADOWALPHA" */,-51 , 34/* "ZSHIFT" */,-51 , 42/* "PARAMETERS" */,-51 , 47/* "NONPATHSTROKEWIDTH" */,-51 , 43/* "STROKEWIDTH" */,-51 , 52/* "EMPTYOUTTEXT" */,-51 , 53/* "BACKSPC" */,-51 , 51/* "PIPETEXT" */,-51 , 50/* "TEXT" */,-51 , 54/* "FONTNAME" */,-51 , 55/* "FONTSIZE" */,-51 , 56/* "FONTUNIT" */,-51 , 57/* "FONTSTYLE" */,-51 , 58/* "STROKETEXT" */,-51 , 59/* "FILLTEXT" */,-51 , 61/* "TEXTALIGN" */,-51 , 60/* "TEXTBASELINE" */,-51 , 16/* "]" */,-51 , 15/* "[" */,-51 ),
	/* State 48 */ new Array( 109/* "$" */,-52 , 7/* "STARTSHAPE" */,-52 , 8/* "BACKGROUND" */,-52 , 9/* "INCLUDE" */,-52 , 10/* "TILE" */,-52 , 35/* "SIZE" */,-52 , 11/* "RULE" */,-52 , 12/* "PATH" */,-52 , 13/* "{" */,-52 , 70/* "RATIONAL" */,-52 , 14/* "}" */,-52 , 20/* "ROTATE" */,-52 , 21/* "FLIP" */,-52 , 26/* "XSHIFT" */,-52 , 27/* "YSHIFT" */,-52 , 36/* "SKEW" */,-52 , 48/* "GLOBALX" */,-52 , 49/* "GLOBALY" */,-52 , 22/* "HUE" */,-52 , 23/* "SATURATION" */,-52 , 24/* "BRIGHTNESS" */,-52 , 25/* "ALPHA" */,-52 , 37/* "TARGETHUE" */,-52 , 38/* "TARGETSATURATION" */,-52 , 39/* "TARGETBRIGHTNESS" */,-52 , 40/* "TARGETALPHA" */,-52 , 62/* "SHADOWOFFSETX" */,-52 , 63/* "SHADOWOFFSETY" */,-52 , 64/* "SHADOWBLUR" */,-52 , 65/* "SHADOWHUE" */,-52 , 67/* "SHADOWBRIGHTNESS" */,-52 , 66/* "SHADOWSATURATION" */,-52 , 68/* "SHADOWALPHA" */,-52 , 34/* "ZSHIFT" */,-52 , 42/* "PARAMETERS" */,-52 , 47/* "NONPATHSTROKEWIDTH" */,-52 , 43/* "STROKEWIDTH" */,-52 , 52/* "EMPTYOUTTEXT" */,-52 , 53/* "BACKSPC" */,-52 , 51/* "PIPETEXT" */,-52 , 50/* "TEXT" */,-52 , 54/* "FONTNAME" */,-52 , 55/* "FONTSIZE" */,-52 , 56/* "FONTUNIT" */,-52 , 57/* "FONTSTYLE" */,-52 , 58/* "STROKETEXT" */,-52 , 59/* "FILLTEXT" */,-52 , 61/* "TEXTALIGN" */,-52 , 60/* "TEXTBASELINE" */,-52 , 16/* "]" */,-52 , 15/* "[" */,-52 ),
	/* State 49 */ new Array( 109/* "$" */,-53 , 7/* "STARTSHAPE" */,-53 , 8/* "BACKGROUND" */,-53 , 9/* "INCLUDE" */,-53 , 10/* "TILE" */,-53 , 35/* "SIZE" */,-53 , 11/* "RULE" */,-53 , 12/* "PATH" */,-53 , 13/* "{" */,-53 , 70/* "RATIONAL" */,-53 , 14/* "}" */,-53 , 20/* "ROTATE" */,-53 , 21/* "FLIP" */,-53 , 26/* "XSHIFT" */,-53 , 27/* "YSHIFT" */,-53 , 36/* "SKEW" */,-53 , 48/* "GLOBALX" */,-53 , 49/* "GLOBALY" */,-53 , 22/* "HUE" */,-53 , 23/* "SATURATION" */,-53 , 24/* "BRIGHTNESS" */,-53 , 25/* "ALPHA" */,-53 , 37/* "TARGETHUE" */,-53 , 38/* "TARGETSATURATION" */,-53 , 39/* "TARGETBRIGHTNESS" */,-53 , 40/* "TARGETALPHA" */,-53 , 62/* "SHADOWOFFSETX" */,-53 , 63/* "SHADOWOFFSETY" */,-53 , 64/* "SHADOWBLUR" */,-53 , 65/* "SHADOWHUE" */,-53 , 67/* "SHADOWBRIGHTNESS" */,-53 , 66/* "SHADOWSATURATION" */,-53 , 68/* "SHADOWALPHA" */,-53 , 34/* "ZSHIFT" */,-53 , 42/* "PARAMETERS" */,-53 , 47/* "NONPATHSTROKEWIDTH" */,-53 , 43/* "STROKEWIDTH" */,-53 , 52/* "EMPTYOUTTEXT" */,-53 , 53/* "BACKSPC" */,-53 , 51/* "PIPETEXT" */,-53 , 50/* "TEXT" */,-53 , 54/* "FONTNAME" */,-53 , 55/* "FONTSIZE" */,-53 , 56/* "FONTUNIT" */,-53 , 57/* "FONTSTYLE" */,-53 , 58/* "STROKETEXT" */,-53 , 59/* "FILLTEXT" */,-53 , 61/* "TEXTALIGN" */,-53 , 60/* "TEXTBASELINE" */,-53 , 16/* "]" */,-53 , 15/* "[" */,-53 ),
	/* State 50 */ new Array( 109/* "$" */,-54 , 7/* "STARTSHAPE" */,-54 , 8/* "BACKGROUND" */,-54 , 9/* "INCLUDE" */,-54 , 10/* "TILE" */,-54 , 35/* "SIZE" */,-54 , 11/* "RULE" */,-54 , 12/* "PATH" */,-54 , 13/* "{" */,-54 , 70/* "RATIONAL" */,-54 , 14/* "}" */,-54 , 20/* "ROTATE" */,-54 , 21/* "FLIP" */,-54 , 26/* "XSHIFT" */,-54 , 27/* "YSHIFT" */,-54 , 36/* "SKEW" */,-54 , 48/* "GLOBALX" */,-54 , 49/* "GLOBALY" */,-54 , 22/* "HUE" */,-54 , 23/* "SATURATION" */,-54 , 24/* "BRIGHTNESS" */,-54 , 25/* "ALPHA" */,-54 , 37/* "TARGETHUE" */,-54 , 38/* "TARGETSATURATION" */,-54 , 39/* "TARGETBRIGHTNESS" */,-54 , 40/* "TARGETALPHA" */,-54 , 62/* "SHADOWOFFSETX" */,-54 , 63/* "SHADOWOFFSETY" */,-54 , 64/* "SHADOWBLUR" */,-54 , 65/* "SHADOWHUE" */,-54 , 67/* "SHADOWBRIGHTNESS" */,-54 , 66/* "SHADOWSATURATION" */,-54 , 68/* "SHADOWALPHA" */,-54 , 34/* "ZSHIFT" */,-54 , 42/* "PARAMETERS" */,-54 , 47/* "NONPATHSTROKEWIDTH" */,-54 , 43/* "STROKEWIDTH" */,-54 , 52/* "EMPTYOUTTEXT" */,-54 , 53/* "BACKSPC" */,-54 , 51/* "PIPETEXT" */,-54 , 50/* "TEXT" */,-54 , 54/* "FONTNAME" */,-54 , 55/* "FONTSIZE" */,-54 , 56/* "FONTUNIT" */,-54 , 57/* "FONTSTYLE" */,-54 , 58/* "STROKETEXT" */,-54 , 59/* "FILLTEXT" */,-54 , 61/* "TEXTALIGN" */,-54 , 60/* "TEXTBASELINE" */,-54 , 16/* "]" */,-54 , 15/* "[" */,-54 ),
	/* State 51 */ new Array( 109/* "$" */,-55 , 7/* "STARTSHAPE" */,-55 , 8/* "BACKGROUND" */,-55 , 9/* "INCLUDE" */,-55 , 10/* "TILE" */,-55 , 35/* "SIZE" */,-55 , 11/* "RULE" */,-55 , 12/* "PATH" */,-55 , 13/* "{" */,-55 , 70/* "RATIONAL" */,-55 , 14/* "}" */,-55 , 20/* "ROTATE" */,-55 , 21/* "FLIP" */,-55 , 26/* "XSHIFT" */,-55 , 27/* "YSHIFT" */,-55 , 36/* "SKEW" */,-55 , 48/* "GLOBALX" */,-55 , 49/* "GLOBALY" */,-55 , 22/* "HUE" */,-55 , 23/* "SATURATION" */,-55 , 24/* "BRIGHTNESS" */,-55 , 25/* "ALPHA" */,-55 , 37/* "TARGETHUE" */,-55 , 38/* "TARGETSATURATION" */,-55 , 39/* "TARGETBRIGHTNESS" */,-55 , 40/* "TARGETALPHA" */,-55 , 62/* "SHADOWOFFSETX" */,-55 , 63/* "SHADOWOFFSETY" */,-55 , 64/* "SHADOWBLUR" */,-55 , 65/* "SHADOWHUE" */,-55 , 67/* "SHADOWBRIGHTNESS" */,-55 , 66/* "SHADOWSATURATION" */,-55 , 68/* "SHADOWALPHA" */,-55 , 34/* "ZSHIFT" */,-55 , 42/* "PARAMETERS" */,-55 , 47/* "NONPATHSTROKEWIDTH" */,-55 , 43/* "STROKEWIDTH" */,-55 , 52/* "EMPTYOUTTEXT" */,-55 , 53/* "BACKSPC" */,-55 , 51/* "PIPETEXT" */,-55 , 50/* "TEXT" */,-55 , 54/* "FONTNAME" */,-55 , 55/* "FONTSIZE" */,-55 , 56/* "FONTUNIT" */,-55 , 57/* "FONTSTYLE" */,-55 , 58/* "STROKETEXT" */,-55 , 59/* "FILLTEXT" */,-55 , 61/* "TEXTALIGN" */,-55 , 60/* "TEXTBASELINE" */,-55 , 16/* "]" */,-55 , 15/* "[" */,-55 ),
	/* State 52 */ new Array( 109/* "$" */,-56 , 7/* "STARTSHAPE" */,-56 , 8/* "BACKGROUND" */,-56 , 9/* "INCLUDE" */,-56 , 10/* "TILE" */,-56 , 35/* "SIZE" */,-56 , 11/* "RULE" */,-56 , 12/* "PATH" */,-56 , 13/* "{" */,-56 , 70/* "RATIONAL" */,-56 , 14/* "}" */,-56 , 20/* "ROTATE" */,-56 , 21/* "FLIP" */,-56 , 26/* "XSHIFT" */,-56 , 27/* "YSHIFT" */,-56 , 36/* "SKEW" */,-56 , 48/* "GLOBALX" */,-56 , 49/* "GLOBALY" */,-56 , 22/* "HUE" */,-56 , 23/* "SATURATION" */,-56 , 24/* "BRIGHTNESS" */,-56 , 25/* "ALPHA" */,-56 , 37/* "TARGETHUE" */,-56 , 38/* "TARGETSATURATION" */,-56 , 39/* "TARGETBRIGHTNESS" */,-56 , 40/* "TARGETALPHA" */,-56 , 62/* "SHADOWOFFSETX" */,-56 , 63/* "SHADOWOFFSETY" */,-56 , 64/* "SHADOWBLUR" */,-56 , 65/* "SHADOWHUE" */,-56 , 67/* "SHADOWBRIGHTNESS" */,-56 , 66/* "SHADOWSATURATION" */,-56 , 68/* "SHADOWALPHA" */,-56 , 34/* "ZSHIFT" */,-56 , 42/* "PARAMETERS" */,-56 , 47/* "NONPATHSTROKEWIDTH" */,-56 , 43/* "STROKEWIDTH" */,-56 , 52/* "EMPTYOUTTEXT" */,-56 , 53/* "BACKSPC" */,-56 , 51/* "PIPETEXT" */,-56 , 50/* "TEXT" */,-56 , 54/* "FONTNAME" */,-56 , 55/* "FONTSIZE" */,-56 , 56/* "FONTUNIT" */,-56 , 57/* "FONTSTYLE" */,-56 , 58/* "STROKETEXT" */,-56 , 59/* "FILLTEXT" */,-56 , 61/* "TEXTALIGN" */,-56 , 60/* "TEXTBASELINE" */,-56 , 16/* "]" */,-56 , 15/* "[" */,-56 ),
	/* State 53 */ new Array( 109/* "$" */,-57 , 7/* "STARTSHAPE" */,-57 , 8/* "BACKGROUND" */,-57 , 9/* "INCLUDE" */,-57 , 10/* "TILE" */,-57 , 35/* "SIZE" */,-57 , 11/* "RULE" */,-57 , 12/* "PATH" */,-57 , 13/* "{" */,-57 , 70/* "RATIONAL" */,-57 , 14/* "}" */,-57 , 20/* "ROTATE" */,-57 , 21/* "FLIP" */,-57 , 26/* "XSHIFT" */,-57 , 27/* "YSHIFT" */,-57 , 36/* "SKEW" */,-57 , 48/* "GLOBALX" */,-57 , 49/* "GLOBALY" */,-57 , 22/* "HUE" */,-57 , 23/* "SATURATION" */,-57 , 24/* "BRIGHTNESS" */,-57 , 25/* "ALPHA" */,-57 , 37/* "TARGETHUE" */,-57 , 38/* "TARGETSATURATION" */,-57 , 39/* "TARGETBRIGHTNESS" */,-57 , 40/* "TARGETALPHA" */,-57 , 62/* "SHADOWOFFSETX" */,-57 , 63/* "SHADOWOFFSETY" */,-57 , 64/* "SHADOWBLUR" */,-57 , 65/* "SHADOWHUE" */,-57 , 67/* "SHADOWBRIGHTNESS" */,-57 , 66/* "SHADOWSATURATION" */,-57 , 68/* "SHADOWALPHA" */,-57 , 34/* "ZSHIFT" */,-57 , 42/* "PARAMETERS" */,-57 , 47/* "NONPATHSTROKEWIDTH" */,-57 , 43/* "STROKEWIDTH" */,-57 , 52/* "EMPTYOUTTEXT" */,-57 , 53/* "BACKSPC" */,-57 , 51/* "PIPETEXT" */,-57 , 50/* "TEXT" */,-57 , 54/* "FONTNAME" */,-57 , 55/* "FONTSIZE" */,-57 , 56/* "FONTUNIT" */,-57 , 57/* "FONTSTYLE" */,-57 , 58/* "STROKETEXT" */,-57 , 59/* "FILLTEXT" */,-57 , 61/* "TEXTALIGN" */,-57 , 60/* "TEXTBASELINE" */,-57 , 16/* "]" */,-57 , 15/* "[" */,-57 ),
	/* State 54 */ new Array( 109/* "$" */,-58 , 7/* "STARTSHAPE" */,-58 , 8/* "BACKGROUND" */,-58 , 9/* "INCLUDE" */,-58 , 10/* "TILE" */,-58 , 35/* "SIZE" */,-58 , 11/* "RULE" */,-58 , 12/* "PATH" */,-58 , 13/* "{" */,-58 , 70/* "RATIONAL" */,-58 , 14/* "}" */,-58 , 20/* "ROTATE" */,-58 , 21/* "FLIP" */,-58 , 26/* "XSHIFT" */,-58 , 27/* "YSHIFT" */,-58 , 36/* "SKEW" */,-58 , 48/* "GLOBALX" */,-58 , 49/* "GLOBALY" */,-58 , 22/* "HUE" */,-58 , 23/* "SATURATION" */,-58 , 24/* "BRIGHTNESS" */,-58 , 25/* "ALPHA" */,-58 , 37/* "TARGETHUE" */,-58 , 38/* "TARGETSATURATION" */,-58 , 39/* "TARGETBRIGHTNESS" */,-58 , 40/* "TARGETALPHA" */,-58 , 62/* "SHADOWOFFSETX" */,-58 , 63/* "SHADOWOFFSETY" */,-58 , 64/* "SHADOWBLUR" */,-58 , 65/* "SHADOWHUE" */,-58 , 67/* "SHADOWBRIGHTNESS" */,-58 , 66/* "SHADOWSATURATION" */,-58 , 68/* "SHADOWALPHA" */,-58 , 34/* "ZSHIFT" */,-58 , 42/* "PARAMETERS" */,-58 , 47/* "NONPATHSTROKEWIDTH" */,-58 , 43/* "STROKEWIDTH" */,-58 , 52/* "EMPTYOUTTEXT" */,-58 , 53/* "BACKSPC" */,-58 , 51/* "PIPETEXT" */,-58 , 50/* "TEXT" */,-58 , 54/* "FONTNAME" */,-58 , 55/* "FONTSIZE" */,-58 , 56/* "FONTUNIT" */,-58 , 57/* "FONTSTYLE" */,-58 , 58/* "STROKETEXT" */,-58 , 59/* "FILLTEXT" */,-58 , 61/* "TEXTALIGN" */,-58 , 60/* "TEXTBASELINE" */,-58 , 16/* "]" */,-58 , 15/* "[" */,-58 ),
	/* State 55 */ new Array( 109/* "$" */,-59 , 7/* "STARTSHAPE" */,-59 , 8/* "BACKGROUND" */,-59 , 9/* "INCLUDE" */,-59 , 10/* "TILE" */,-59 , 35/* "SIZE" */,-59 , 11/* "RULE" */,-59 , 12/* "PATH" */,-59 , 13/* "{" */,-59 , 70/* "RATIONAL" */,-59 , 14/* "}" */,-59 , 20/* "ROTATE" */,-59 , 21/* "FLIP" */,-59 , 26/* "XSHIFT" */,-59 , 27/* "YSHIFT" */,-59 , 36/* "SKEW" */,-59 , 48/* "GLOBALX" */,-59 , 49/* "GLOBALY" */,-59 , 22/* "HUE" */,-59 , 23/* "SATURATION" */,-59 , 24/* "BRIGHTNESS" */,-59 , 25/* "ALPHA" */,-59 , 37/* "TARGETHUE" */,-59 , 38/* "TARGETSATURATION" */,-59 , 39/* "TARGETBRIGHTNESS" */,-59 , 40/* "TARGETALPHA" */,-59 , 62/* "SHADOWOFFSETX" */,-59 , 63/* "SHADOWOFFSETY" */,-59 , 64/* "SHADOWBLUR" */,-59 , 65/* "SHADOWHUE" */,-59 , 67/* "SHADOWBRIGHTNESS" */,-59 , 66/* "SHADOWSATURATION" */,-59 , 68/* "SHADOWALPHA" */,-59 , 34/* "ZSHIFT" */,-59 , 42/* "PARAMETERS" */,-59 , 47/* "NONPATHSTROKEWIDTH" */,-59 , 43/* "STROKEWIDTH" */,-59 , 52/* "EMPTYOUTTEXT" */,-59 , 53/* "BACKSPC" */,-59 , 51/* "PIPETEXT" */,-59 , 50/* "TEXT" */,-59 , 54/* "FONTNAME" */,-59 , 55/* "FONTSIZE" */,-59 , 56/* "FONTUNIT" */,-59 , 57/* "FONTSTYLE" */,-59 , 58/* "STROKETEXT" */,-59 , 59/* "FILLTEXT" */,-59 , 61/* "TEXTALIGN" */,-59 , 60/* "TEXTBASELINE" */,-59 , 16/* "]" */,-59 , 15/* "[" */,-59 ),
	/* State 56 */ new Array( 109/* "$" */,-60 , 7/* "STARTSHAPE" */,-60 , 8/* "BACKGROUND" */,-60 , 9/* "INCLUDE" */,-60 , 10/* "TILE" */,-60 , 35/* "SIZE" */,-60 , 11/* "RULE" */,-60 , 12/* "PATH" */,-60 , 13/* "{" */,-60 , 70/* "RATIONAL" */,-60 , 14/* "}" */,-60 , 20/* "ROTATE" */,-60 , 21/* "FLIP" */,-60 , 26/* "XSHIFT" */,-60 , 27/* "YSHIFT" */,-60 , 36/* "SKEW" */,-60 , 48/* "GLOBALX" */,-60 , 49/* "GLOBALY" */,-60 , 22/* "HUE" */,-60 , 23/* "SATURATION" */,-60 , 24/* "BRIGHTNESS" */,-60 , 25/* "ALPHA" */,-60 , 37/* "TARGETHUE" */,-60 , 38/* "TARGETSATURATION" */,-60 , 39/* "TARGETBRIGHTNESS" */,-60 , 40/* "TARGETALPHA" */,-60 , 62/* "SHADOWOFFSETX" */,-60 , 63/* "SHADOWOFFSETY" */,-60 , 64/* "SHADOWBLUR" */,-60 , 65/* "SHADOWHUE" */,-60 , 67/* "SHADOWBRIGHTNESS" */,-60 , 66/* "SHADOWSATURATION" */,-60 , 68/* "SHADOWALPHA" */,-60 , 34/* "ZSHIFT" */,-60 , 42/* "PARAMETERS" */,-60 , 47/* "NONPATHSTROKEWIDTH" */,-60 , 43/* "STROKEWIDTH" */,-60 , 52/* "EMPTYOUTTEXT" */,-60 , 53/* "BACKSPC" */,-60 , 51/* "PIPETEXT" */,-60 , 50/* "TEXT" */,-60 , 54/* "FONTNAME" */,-60 , 55/* "FONTSIZE" */,-60 , 56/* "FONTUNIT" */,-60 , 57/* "FONTSTYLE" */,-60 , 58/* "STROKETEXT" */,-60 , 59/* "FILLTEXT" */,-60 , 61/* "TEXTALIGN" */,-60 , 60/* "TEXTBASELINE" */,-60 , 16/* "]" */,-60 , 15/* "[" */,-60 ),
	/* State 57 */ new Array( 109/* "$" */,-61 , 7/* "STARTSHAPE" */,-61 , 8/* "BACKGROUND" */,-61 , 9/* "INCLUDE" */,-61 , 10/* "TILE" */,-61 , 35/* "SIZE" */,-61 , 11/* "RULE" */,-61 , 12/* "PATH" */,-61 , 13/* "{" */,-61 , 70/* "RATIONAL" */,-61 , 14/* "}" */,-61 , 20/* "ROTATE" */,-61 , 21/* "FLIP" */,-61 , 26/* "XSHIFT" */,-61 , 27/* "YSHIFT" */,-61 , 36/* "SKEW" */,-61 , 48/* "GLOBALX" */,-61 , 49/* "GLOBALY" */,-61 , 22/* "HUE" */,-61 , 23/* "SATURATION" */,-61 , 24/* "BRIGHTNESS" */,-61 , 25/* "ALPHA" */,-61 , 37/* "TARGETHUE" */,-61 , 38/* "TARGETSATURATION" */,-61 , 39/* "TARGETBRIGHTNESS" */,-61 , 40/* "TARGETALPHA" */,-61 , 62/* "SHADOWOFFSETX" */,-61 , 63/* "SHADOWOFFSETY" */,-61 , 64/* "SHADOWBLUR" */,-61 , 65/* "SHADOWHUE" */,-61 , 67/* "SHADOWBRIGHTNESS" */,-61 , 66/* "SHADOWSATURATION" */,-61 , 68/* "SHADOWALPHA" */,-61 , 34/* "ZSHIFT" */,-61 , 42/* "PARAMETERS" */,-61 , 47/* "NONPATHSTROKEWIDTH" */,-61 , 43/* "STROKEWIDTH" */,-61 , 52/* "EMPTYOUTTEXT" */,-61 , 53/* "BACKSPC" */,-61 , 51/* "PIPETEXT" */,-61 , 50/* "TEXT" */,-61 , 54/* "FONTNAME" */,-61 , 55/* "FONTSIZE" */,-61 , 56/* "FONTUNIT" */,-61 , 57/* "FONTSTYLE" */,-61 , 58/* "STROKETEXT" */,-61 , 59/* "FILLTEXT" */,-61 , 61/* "TEXTALIGN" */,-61 , 60/* "TEXTBASELINE" */,-61 , 16/* "]" */,-61 , 15/* "[" */,-61 ),
	/* State 58 */ new Array( 109/* "$" */,-62 , 7/* "STARTSHAPE" */,-62 , 8/* "BACKGROUND" */,-62 , 9/* "INCLUDE" */,-62 , 10/* "TILE" */,-62 , 35/* "SIZE" */,-62 , 11/* "RULE" */,-62 , 12/* "PATH" */,-62 , 13/* "{" */,-62 , 70/* "RATIONAL" */,-62 , 14/* "}" */,-62 , 20/* "ROTATE" */,-62 , 21/* "FLIP" */,-62 , 26/* "XSHIFT" */,-62 , 27/* "YSHIFT" */,-62 , 36/* "SKEW" */,-62 , 48/* "GLOBALX" */,-62 , 49/* "GLOBALY" */,-62 , 22/* "HUE" */,-62 , 23/* "SATURATION" */,-62 , 24/* "BRIGHTNESS" */,-62 , 25/* "ALPHA" */,-62 , 37/* "TARGETHUE" */,-62 , 38/* "TARGETSATURATION" */,-62 , 39/* "TARGETBRIGHTNESS" */,-62 , 40/* "TARGETALPHA" */,-62 , 62/* "SHADOWOFFSETX" */,-62 , 63/* "SHADOWOFFSETY" */,-62 , 64/* "SHADOWBLUR" */,-62 , 65/* "SHADOWHUE" */,-62 , 67/* "SHADOWBRIGHTNESS" */,-62 , 66/* "SHADOWSATURATION" */,-62 , 68/* "SHADOWALPHA" */,-62 , 34/* "ZSHIFT" */,-62 , 42/* "PARAMETERS" */,-62 , 47/* "NONPATHSTROKEWIDTH" */,-62 , 43/* "STROKEWIDTH" */,-62 , 52/* "EMPTYOUTTEXT" */,-62 , 53/* "BACKSPC" */,-62 , 51/* "PIPETEXT" */,-62 , 50/* "TEXT" */,-62 , 54/* "FONTNAME" */,-62 , 55/* "FONTSIZE" */,-62 , 56/* "FONTUNIT" */,-62 , 57/* "FONTSTYLE" */,-62 , 58/* "STROKETEXT" */,-62 , 59/* "FILLTEXT" */,-62 , 61/* "TEXTALIGN" */,-62 , 60/* "TEXTBASELINE" */,-62 , 16/* "]" */,-62 , 15/* "[" */,-62 ),
	/* State 59 */ new Array( 109/* "$" */,-63 , 7/* "STARTSHAPE" */,-63 , 8/* "BACKGROUND" */,-63 , 9/* "INCLUDE" */,-63 , 10/* "TILE" */,-63 , 35/* "SIZE" */,-63 , 11/* "RULE" */,-63 , 12/* "PATH" */,-63 , 13/* "{" */,-63 , 70/* "RATIONAL" */,-63 , 14/* "}" */,-63 , 20/* "ROTATE" */,-63 , 21/* "FLIP" */,-63 , 26/* "XSHIFT" */,-63 , 27/* "YSHIFT" */,-63 , 36/* "SKEW" */,-63 , 48/* "GLOBALX" */,-63 , 49/* "GLOBALY" */,-63 , 22/* "HUE" */,-63 , 23/* "SATURATION" */,-63 , 24/* "BRIGHTNESS" */,-63 , 25/* "ALPHA" */,-63 , 37/* "TARGETHUE" */,-63 , 38/* "TARGETSATURATION" */,-63 , 39/* "TARGETBRIGHTNESS" */,-63 , 40/* "TARGETALPHA" */,-63 , 62/* "SHADOWOFFSETX" */,-63 , 63/* "SHADOWOFFSETY" */,-63 , 64/* "SHADOWBLUR" */,-63 , 65/* "SHADOWHUE" */,-63 , 67/* "SHADOWBRIGHTNESS" */,-63 , 66/* "SHADOWSATURATION" */,-63 , 68/* "SHADOWALPHA" */,-63 , 34/* "ZSHIFT" */,-63 , 42/* "PARAMETERS" */,-63 , 47/* "NONPATHSTROKEWIDTH" */,-63 , 43/* "STROKEWIDTH" */,-63 , 52/* "EMPTYOUTTEXT" */,-63 , 53/* "BACKSPC" */,-63 , 51/* "PIPETEXT" */,-63 , 50/* "TEXT" */,-63 , 54/* "FONTNAME" */,-63 , 55/* "FONTSIZE" */,-63 , 56/* "FONTUNIT" */,-63 , 57/* "FONTSTYLE" */,-63 , 58/* "STROKETEXT" */,-63 , 59/* "FILLTEXT" */,-63 , 61/* "TEXTALIGN" */,-63 , 60/* "TEXTBASELINE" */,-63 , 16/* "]" */,-63 , 15/* "[" */,-63 ),
	/* State 60 */ new Array( 14/* "}" */,-104 , 22/* "HUE" */,-104 , 23/* "SATURATION" */,-104 , 24/* "BRIGHTNESS" */,-104 , 25/* "ALPHA" */,-104 , 37/* "TARGETHUE" */,-104 , 38/* "TARGETSATURATION" */,-104 , 39/* "TARGETBRIGHTNESS" */,-104 , 40/* "TARGETALPHA" */,-104 ),
	/* State 61 */ new Array( 109/* "$" */,-11 , 7/* "STARTSHAPE" */,-11 , 8/* "BACKGROUND" */,-11 , 9/* "INCLUDE" */,-11 , 10/* "TILE" */,-11 , 35/* "SIZE" */,-11 , 11/* "RULE" */,-11 , 12/* "PATH" */,-11 ),
	/* State 62 */ new Array( 109/* "$" */,-10 , 7/* "STARTSHAPE" */,-10 , 8/* "BACKGROUND" */,-10 , 9/* "INCLUDE" */,-10 , 10/* "TILE" */,-10 , 35/* "SIZE" */,-10 , 11/* "RULE" */,-10 , 12/* "PATH" */,-10 ),
	/* State 63 */ new Array( 109/* "$" */,-14 , 7/* "STARTSHAPE" */,-14 , 8/* "BACKGROUND" */,-14 , 9/* "INCLUDE" */,-14 , 10/* "TILE" */,-14 , 35/* "SIZE" */,-14 , 11/* "RULE" */,-14 , 12/* "PATH" */,-14 ),
	/* State 64 */ new Array( 14/* "}" */,-102 , 20/* "ROTATE" */,-102 , 21/* "FLIP" */,-102 , 26/* "XSHIFT" */,-102 , 27/* "YSHIFT" */,-102 , 35/* "SIZE" */,-102 , 36/* "SKEW" */,-102 , 48/* "GLOBALX" */,-102 , 49/* "GLOBALY" */,-102 , 22/* "HUE" */,-102 , 23/* "SATURATION" */,-102 , 24/* "BRIGHTNESS" */,-102 , 25/* "ALPHA" */,-102 , 37/* "TARGETHUE" */,-102 , 38/* "TARGETSATURATION" */,-102 , 39/* "TARGETBRIGHTNESS" */,-102 , 40/* "TARGETALPHA" */,-102 , 62/* "SHADOWOFFSETX" */,-102 , 63/* "SHADOWOFFSETY" */,-102 , 64/* "SHADOWBLUR" */,-102 , 65/* "SHADOWHUE" */,-102 , 67/* "SHADOWBRIGHTNESS" */,-102 , 66/* "SHADOWSATURATION" */,-102 , 68/* "SHADOWALPHA" */,-102 , 34/* "ZSHIFT" */,-102 , 42/* "PARAMETERS" */,-102 , 47/* "NONPATHSTROKEWIDTH" */,-102 , 43/* "STROKEWIDTH" */,-102 , 52/* "EMPTYOUTTEXT" */,-102 , 53/* "BACKSPC" */,-102 , 51/* "PIPETEXT" */,-102 , 50/* "TEXT" */,-102 , 54/* "FONTNAME" */,-102 , 55/* "FONTSIZE" */,-102 , 56/* "FONTUNIT" */,-102 , 57/* "FONTSTYLE" */,-102 , 58/* "STROKETEXT" */,-102 , 59/* "FILLTEXT" */,-102 , 61/* "TEXTALIGN" */,-102 , 60/* "TEXTBASELINE" */,-102 ),
	/* State 65 */ new Array( 16/* "]" */,-102 , 20/* "ROTATE" */,-102 , 21/* "FLIP" */,-102 , 26/* "XSHIFT" */,-102 , 27/* "YSHIFT" */,-102 , 35/* "SIZE" */,-102 , 36/* "SKEW" */,-102 , 48/* "GLOBALX" */,-102 , 49/* "GLOBALY" */,-102 , 22/* "HUE" */,-102 , 23/* "SATURATION" */,-102 , 24/* "BRIGHTNESS" */,-102 , 25/* "ALPHA" */,-102 , 37/* "TARGETHUE" */,-102 , 38/* "TARGETSATURATION" */,-102 , 39/* "TARGETBRIGHTNESS" */,-102 , 40/* "TARGETALPHA" */,-102 , 62/* "SHADOWOFFSETX" */,-102 , 63/* "SHADOWOFFSETY" */,-102 , 64/* "SHADOWBLUR" */,-102 , 65/* "SHADOWHUE" */,-102 , 67/* "SHADOWBRIGHTNESS" */,-102 , 66/* "SHADOWSATURATION" */,-102 , 68/* "SHADOWALPHA" */,-102 , 34/* "ZSHIFT" */,-102 , 42/* "PARAMETERS" */,-102 , 47/* "NONPATHSTROKEWIDTH" */,-102 , 43/* "STROKEWIDTH" */,-102 , 52/* "EMPTYOUTTEXT" */,-102 , 53/* "BACKSPC" */,-102 , 51/* "PIPETEXT" */,-102 , 50/* "TEXT" */,-102 , 54/* "FONTNAME" */,-102 , 55/* "FONTSIZE" */,-102 , 56/* "FONTUNIT" */,-102 , 57/* "FONTSTYLE" */,-102 , 58/* "STROKETEXT" */,-102 , 59/* "FILLTEXT" */,-102 , 61/* "TEXTALIGN" */,-102 , 60/* "TEXTBASELINE" */,-102 ),
	/* State 66 */ new Array( 109/* "$" */,-15 , 7/* "STARTSHAPE" */,-15 , 8/* "BACKGROUND" */,-15 , 9/* "INCLUDE" */,-15 , 10/* "TILE" */,-15 , 35/* "SIZE" */,-15 , 11/* "RULE" */,-15 , 12/* "PATH" */,-15 ),
	/* State 67 */ new Array( 13/* "{" */,72 , 70/* "RATIONAL" */,73 ),
	/* State 68 */ new Array( 13/* "{" */,74 ),
	/* State 69 */ new Array( 14/* "}" */,76 , 22/* "HUE" */,77 , 23/* "SATURATION" */,78 , 24/* "BRIGHTNESS" */,79 , 25/* "ALPHA" */,80 , 37/* "TARGETHUE" */,81 , 38/* "TARGETSATURATION" */,82 , 39/* "TARGETBRIGHTNESS" */,83 , 40/* "TARGETALPHA" */,84 ),
	/* State 70 */ new Array( 14/* "}" */,86 , 34/* "ZSHIFT" */,91 , 35/* "SIZE" */,92 , 42/* "PARAMETERS" */,93 , 47/* "NONPATHSTROKEWIDTH" */,94 , 43/* "STROKEWIDTH" */,95 , 52/* "EMPTYOUTTEXT" */,96 , 53/* "BACKSPC" */,97 , 51/* "PIPETEXT" */,98 , 50/* "TEXT" */,99 , 54/* "FONTNAME" */,100 , 55/* "FONTSIZE" */,101 , 56/* "FONTUNIT" */,102 , 57/* "FONTSTYLE" */,103 , 58/* "STROKETEXT" */,104 , 59/* "FILLTEXT" */,105 , 61/* "TEXTALIGN" */,106 , 60/* "TEXTBASELINE" */,107 , 20/* "ROTATE" */,108 , 21/* "FLIP" */,109 , 26/* "XSHIFT" */,110 , 27/* "YSHIFT" */,111 , 36/* "SKEW" */,112 , 48/* "GLOBALX" */,113 , 49/* "GLOBALY" */,114 , 22/* "HUE" */,77 , 23/* "SATURATION" */,78 , 24/* "BRIGHTNESS" */,79 , 25/* "ALPHA" */,80 , 37/* "TARGETHUE" */,81 , 38/* "TARGETSATURATION" */,82 , 39/* "TARGETBRIGHTNESS" */,83 , 40/* "TARGETALPHA" */,84 , 62/* "SHADOWOFFSETX" */,115 , 63/* "SHADOWOFFSETY" */,116 , 64/* "SHADOWBLUR" */,117 , 65/* "SHADOWHUE" */,118 , 67/* "SHADOWBRIGHTNESS" */,119 , 66/* "SHADOWSATURATION" */,120 , 68/* "SHADOWALPHA" */,121 ),
	/* State 71 */ new Array( 16/* "]" */,122 , 34/* "ZSHIFT" */,91 , 35/* "SIZE" */,92 , 42/* "PARAMETERS" */,93 , 47/* "NONPATHSTROKEWIDTH" */,94 , 43/* "STROKEWIDTH" */,95 , 52/* "EMPTYOUTTEXT" */,96 , 53/* "BACKSPC" */,97 , 51/* "PIPETEXT" */,98 , 50/* "TEXT" */,99 , 54/* "FONTNAME" */,100 , 55/* "FONTSIZE" */,101 , 56/* "FONTUNIT" */,102 , 57/* "FONTSTYLE" */,103 , 58/* "STROKETEXT" */,104 , 59/* "FILLTEXT" */,105 , 61/* "TEXTALIGN" */,106 , 60/* "TEXTBASELINE" */,107 , 20/* "ROTATE" */,108 , 21/* "FLIP" */,109 , 26/* "XSHIFT" */,110 , 27/* "YSHIFT" */,111 , 36/* "SKEW" */,112 , 48/* "GLOBALX" */,113 , 49/* "GLOBALY" */,114 , 22/* "HUE" */,77 , 23/* "SATURATION" */,78 , 24/* "BRIGHTNESS" */,79 , 25/* "ALPHA" */,80 , 37/* "TARGETHUE" */,81 , 38/* "TARGETSATURATION" */,82 , 39/* "TARGETBRIGHTNESS" */,83 , 40/* "TARGETALPHA" */,84 , 62/* "SHADOWOFFSETX" */,115 , 63/* "SHADOWOFFSETY" */,116 , 64/* "SHADOWBLUR" */,117 , 65/* "SHADOWHUE" */,118 , 67/* "SHADOWBRIGHTNESS" */,119 , 66/* "SHADOWSATURATION" */,120 , 68/* "SHADOWALPHA" */,121 ),
	/* State 72 */ new Array( 14/* "}" */,-84 , 71/* "STRING" */,-84 , 20/* "ROTATE" */,-84 , 21/* "FLIP" */,-84 , 22/* "HUE" */,-84 , 23/* "SATURATION" */,-84 , 24/* "BRIGHTNESS" */,-84 , 25/* "ALPHA" */,-84 , 26/* "XSHIFT" */,-84 , 27/* "YSHIFT" */,-84 , 28/* "XCTRL1" */,-84 , 29/* "YCTRL1" */,-84 , 30/* "XRADIUS" */,-84 , 31/* "YRADIUS" */,-84 , 32/* "XCTRL2" */,-84 , 33/* "YCTRL2" */,-84 , 34/* "ZSHIFT" */,-84 , 35/* "SIZE" */,-84 , 36/* "SKEW" */,-84 , 42/* "PARAMETERS" */,-84 , 43/* "STROKEWIDTH" */,-84 , 47/* "NONPATHSTROKEWIDTH" */,-84 , 46/* "TILEDIM" */,-84 , 50/* "TEXT" */,-84 , 52/* "EMPTYOUTTEXT" */,-84 , 53/* "BACKSPC" */,-84 , 54/* "FONTNAME" */,-84 , 55/* "FONTSIZE" */,-84 , 56/* "FONTUNIT" */,-84 , 57/* "FONTSTYLE" */,-84 , 58/* "STROKETEXT" */,-84 , 59/* "FILLTEXT" */,-84 , 60/* "TEXTBASELINE" */,-84 , 61/* "TEXTALIGN" */,-84 , 48/* "GLOBALX" */,-84 , 49/* "GLOBALY" */,-84 , 62/* "SHADOWOFFSETX" */,-84 , 63/* "SHADOWOFFSETY" */,-84 , 64/* "SHADOWBLUR" */,-84 , 65/* "SHADOWHUE" */,-84 , 66/* "SHADOWSATURATION" */,-84 , 67/* "SHADOWBRIGHTNESS" */,-84 , 68/* "SHADOWALPHA" */,-84 , 70/* "RATIONAL" */,-84 ),
	/* State 73 */ new Array( 13/* "{" */,124 ),
	/* State 74 */ new Array( 14/* "}" */,-65 , 69/* "PATHOP" */,-65 , 70/* "RATIONAL" */,-65 , 71/* "STRING" */,-65 ),
	/* State 75 */ new Array( 14/* "}" */,-103 , 22/* "HUE" */,-103 , 23/* "SATURATION" */,-103 , 24/* "BRIGHTNESS" */,-103 , 25/* "ALPHA" */,-103 , 37/* "TARGETHUE" */,-103 , 38/* "TARGETSATURATION" */,-103 , 39/* "TARGETBRIGHTNESS" */,-103 , 40/* "TARGETALPHA" */,-103 ),
	/* State 76 */ new Array( 109/* "$" */,-13 , 7/* "STARTSHAPE" */,-13 , 8/* "BACKGROUND" */,-13 , 9/* "INCLUDE" */,-13 , 10/* "TILE" */,-13 , 35/* "SIZE" */,-13 , 11/* "RULE" */,-13 , 12/* "PATH" */,-13 ),
	/* State 77 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 78 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 79 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 80 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 81 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 82 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 83 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 84 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 85 */ new Array( 14/* "}" */,-101 , 20/* "ROTATE" */,-101 , 21/* "FLIP" */,-101 , 26/* "XSHIFT" */,-101 , 27/* "YSHIFT" */,-101 , 35/* "SIZE" */,-101 , 36/* "SKEW" */,-101 , 48/* "GLOBALX" */,-101 , 49/* "GLOBALY" */,-101 , 22/* "HUE" */,-101 , 23/* "SATURATION" */,-101 , 24/* "BRIGHTNESS" */,-101 , 25/* "ALPHA" */,-101 , 37/* "TARGETHUE" */,-101 , 38/* "TARGETSATURATION" */,-101 , 39/* "TARGETBRIGHTNESS" */,-101 , 40/* "TARGETALPHA" */,-101 , 62/* "SHADOWOFFSETX" */,-101 , 63/* "SHADOWOFFSETY" */,-101 , 64/* "SHADOWBLUR" */,-101 , 65/* "SHADOWHUE" */,-101 , 67/* "SHADOWBRIGHTNESS" */,-101 , 66/* "SHADOWSATURATION" */,-101 , 68/* "SHADOWALPHA" */,-101 , 34/* "ZSHIFT" */,-101 , 42/* "PARAMETERS" */,-101 , 47/* "NONPATHSTROKEWIDTH" */,-101 , 43/* "STROKEWIDTH" */,-101 , 52/* "EMPTYOUTTEXT" */,-101 , 53/* "BACKSPC" */,-101 , 51/* "PIPETEXT" */,-101 , 50/* "TEXT" */,-101 , 54/* "FONTNAME" */,-101 , 55/* "FONTSIZE" */,-101 , 56/* "FONTUNIT" */,-101 , 57/* "FONTSTYLE" */,-101 , 58/* "STROKETEXT" */,-101 , 59/* "FILLTEXT" */,-101 , 61/* "TEXTALIGN" */,-101 , 60/* "TEXTBASELINE" */,-101 , 16/* "]" */,-101 ),
	/* State 86 */ new Array( 109/* "$" */,-88 , 7/* "STARTSHAPE" */,-88 , 8/* "BACKGROUND" */,-88 , 9/* "INCLUDE" */,-88 , 10/* "TILE" */,-88 , 35/* "SIZE" */,-88 , 11/* "RULE" */,-88 , 12/* "PATH" */,-88 , 14/* "}" */,-88 , 71/* "STRING" */,-88 , 20/* "ROTATE" */,-88 , 21/* "FLIP" */,-88 , 22/* "HUE" */,-88 , 23/* "SATURATION" */,-88 , 24/* "BRIGHTNESS" */,-88 , 25/* "ALPHA" */,-88 , 26/* "XSHIFT" */,-88 , 27/* "YSHIFT" */,-88 , 28/* "XCTRL1" */,-88 , 29/* "YCTRL1" */,-88 , 30/* "XRADIUS" */,-88 , 31/* "YRADIUS" */,-88 , 32/* "XCTRL2" */,-88 , 33/* "YCTRL2" */,-88 , 34/* "ZSHIFT" */,-88 , 36/* "SKEW" */,-88 , 42/* "PARAMETERS" */,-88 , 43/* "STROKEWIDTH" */,-88 , 47/* "NONPATHSTROKEWIDTH" */,-88 , 46/* "TILEDIM" */,-88 , 50/* "TEXT" */,-88 , 52/* "EMPTYOUTTEXT" */,-88 , 53/* "BACKSPC" */,-88 , 54/* "FONTNAME" */,-88 , 55/* "FONTSIZE" */,-88 , 56/* "FONTUNIT" */,-88 , 57/* "FONTSTYLE" */,-88 , 58/* "STROKETEXT" */,-88 , 59/* "FILLTEXT" */,-88 , 60/* "TEXTBASELINE" */,-88 , 61/* "TEXTALIGN" */,-88 , 48/* "GLOBALX" */,-88 , 49/* "GLOBALY" */,-88 , 62/* "SHADOWOFFSETX" */,-88 , 63/* "SHADOWOFFSETY" */,-88 , 64/* "SHADOWBLUR" */,-88 , 65/* "SHADOWHUE" */,-88 , 66/* "SHADOWSATURATION" */,-88 , 67/* "SHADOWBRIGHTNESS" */,-88 , 68/* "SHADOWALPHA" */,-88 , 70/* "RATIONAL" */,-88 , 13/* "{" */,-88 ),
	/* State 87 */ new Array( 14/* "}" */,-105 , 20/* "ROTATE" */,-105 , 21/* "FLIP" */,-105 , 26/* "XSHIFT" */,-105 , 27/* "YSHIFT" */,-105 , 35/* "SIZE" */,-105 , 36/* "SKEW" */,-105 , 48/* "GLOBALX" */,-105 , 49/* "GLOBALY" */,-105 , 22/* "HUE" */,-105 , 23/* "SATURATION" */,-105 , 24/* "BRIGHTNESS" */,-105 , 25/* "ALPHA" */,-105 , 37/* "TARGETHUE" */,-105 , 38/* "TARGETSATURATION" */,-105 , 39/* "TARGETBRIGHTNESS" */,-105 , 40/* "TARGETALPHA" */,-105 , 62/* "SHADOWOFFSETX" */,-105 , 63/* "SHADOWOFFSETY" */,-105 , 64/* "SHADOWBLUR" */,-105 , 65/* "SHADOWHUE" */,-105 , 67/* "SHADOWBRIGHTNESS" */,-105 , 66/* "SHADOWSATURATION" */,-105 , 68/* "SHADOWALPHA" */,-105 , 34/* "ZSHIFT" */,-105 , 42/* "PARAMETERS" */,-105 , 47/* "NONPATHSTROKEWIDTH" */,-105 , 43/* "STROKEWIDTH" */,-105 , 52/* "EMPTYOUTTEXT" */,-105 , 53/* "BACKSPC" */,-105 , 51/* "PIPETEXT" */,-105 , 50/* "TEXT" */,-105 , 54/* "FONTNAME" */,-105 , 55/* "FONTSIZE" */,-105 , 56/* "FONTUNIT" */,-105 , 57/* "FONTSTYLE" */,-105 , 58/* "STROKETEXT" */,-105 , 59/* "FILLTEXT" */,-105 , 61/* "TEXTALIGN" */,-105 , 60/* "TEXTBASELINE" */,-105 , 16/* "]" */,-105 ),
	/* State 88 */ new Array( 14/* "}" */,-106 , 20/* "ROTATE" */,-106 , 21/* "FLIP" */,-106 , 26/* "XSHIFT" */,-106 , 27/* "YSHIFT" */,-106 , 35/* "SIZE" */,-106 , 36/* "SKEW" */,-106 , 48/* "GLOBALX" */,-106 , 49/* "GLOBALY" */,-106 , 22/* "HUE" */,-106 , 23/* "SATURATION" */,-106 , 24/* "BRIGHTNESS" */,-106 , 25/* "ALPHA" */,-106 , 37/* "TARGETHUE" */,-106 , 38/* "TARGETSATURATION" */,-106 , 39/* "TARGETBRIGHTNESS" */,-106 , 40/* "TARGETALPHA" */,-106 , 62/* "SHADOWOFFSETX" */,-106 , 63/* "SHADOWOFFSETY" */,-106 , 64/* "SHADOWBLUR" */,-106 , 65/* "SHADOWHUE" */,-106 , 67/* "SHADOWBRIGHTNESS" */,-106 , 66/* "SHADOWSATURATION" */,-106 , 68/* "SHADOWALPHA" */,-106 , 34/* "ZSHIFT" */,-106 , 42/* "PARAMETERS" */,-106 , 47/* "NONPATHSTROKEWIDTH" */,-106 , 43/* "STROKEWIDTH" */,-106 , 52/* "EMPTYOUTTEXT" */,-106 , 53/* "BACKSPC" */,-106 , 51/* "PIPETEXT" */,-106 , 50/* "TEXT" */,-106 , 54/* "FONTNAME" */,-106 , 55/* "FONTSIZE" */,-106 , 56/* "FONTUNIT" */,-106 , 57/* "FONTSTYLE" */,-106 , 58/* "STROKETEXT" */,-106 , 59/* "FILLTEXT" */,-106 , 61/* "TEXTALIGN" */,-106 , 60/* "TEXTBASELINE" */,-106 , 16/* "]" */,-106 ),
	/* State 89 */ new Array( 14/* "}" */,-107 , 20/* "ROTATE" */,-107 , 21/* "FLIP" */,-107 , 26/* "XSHIFT" */,-107 , 27/* "YSHIFT" */,-107 , 35/* "SIZE" */,-107 , 36/* "SKEW" */,-107 , 48/* "GLOBALX" */,-107 , 49/* "GLOBALY" */,-107 , 22/* "HUE" */,-107 , 23/* "SATURATION" */,-107 , 24/* "BRIGHTNESS" */,-107 , 25/* "ALPHA" */,-107 , 37/* "TARGETHUE" */,-107 , 38/* "TARGETSATURATION" */,-107 , 39/* "TARGETBRIGHTNESS" */,-107 , 40/* "TARGETALPHA" */,-107 , 62/* "SHADOWOFFSETX" */,-107 , 63/* "SHADOWOFFSETY" */,-107 , 64/* "SHADOWBLUR" */,-107 , 65/* "SHADOWHUE" */,-107 , 67/* "SHADOWBRIGHTNESS" */,-107 , 66/* "SHADOWSATURATION" */,-107 , 68/* "SHADOWALPHA" */,-107 , 34/* "ZSHIFT" */,-107 , 42/* "PARAMETERS" */,-107 , 47/* "NONPATHSTROKEWIDTH" */,-107 , 43/* "STROKEWIDTH" */,-107 , 52/* "EMPTYOUTTEXT" */,-107 , 53/* "BACKSPC" */,-107 , 51/* "PIPETEXT" */,-107 , 50/* "TEXT" */,-107 , 54/* "FONTNAME" */,-107 , 55/* "FONTSIZE" */,-107 , 56/* "FONTUNIT" */,-107 , 57/* "FONTSTYLE" */,-107 , 58/* "STROKETEXT" */,-107 , 59/* "FILLTEXT" */,-107 , 61/* "TEXTALIGN" */,-107 , 60/* "TEXTBASELINE" */,-107 , 16/* "]" */,-107 ),
	/* State 90 */ new Array( 14/* "}" */,-108 , 20/* "ROTATE" */,-108 , 21/* "FLIP" */,-108 , 26/* "XSHIFT" */,-108 , 27/* "YSHIFT" */,-108 , 35/* "SIZE" */,-108 , 36/* "SKEW" */,-108 , 48/* "GLOBALX" */,-108 , 49/* "GLOBALY" */,-108 , 22/* "HUE" */,-108 , 23/* "SATURATION" */,-108 , 24/* "BRIGHTNESS" */,-108 , 25/* "ALPHA" */,-108 , 37/* "TARGETHUE" */,-108 , 38/* "TARGETSATURATION" */,-108 , 39/* "TARGETBRIGHTNESS" */,-108 , 40/* "TARGETALPHA" */,-108 , 62/* "SHADOWOFFSETX" */,-108 , 63/* "SHADOWOFFSETY" */,-108 , 64/* "SHADOWBLUR" */,-108 , 65/* "SHADOWHUE" */,-108 , 67/* "SHADOWBRIGHTNESS" */,-108 , 66/* "SHADOWSATURATION" */,-108 , 68/* "SHADOWALPHA" */,-108 , 34/* "ZSHIFT" */,-108 , 42/* "PARAMETERS" */,-108 , 47/* "NONPATHSTROKEWIDTH" */,-108 , 43/* "STROKEWIDTH" */,-108 , 52/* "EMPTYOUTTEXT" */,-108 , 53/* "BACKSPC" */,-108 , 51/* "PIPETEXT" */,-108 , 50/* "TEXT" */,-108 , 54/* "FONTNAME" */,-108 , 55/* "FONTSIZE" */,-108 , 56/* "FONTUNIT" */,-108 , 57/* "FONTSTYLE" */,-108 , 58/* "STROKETEXT" */,-108 , 59/* "FILLTEXT" */,-108 , 61/* "TEXTALIGN" */,-108 , 60/* "TEXTBASELINE" */,-108 , 16/* "]" */,-108 ),
	/* State 91 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 92 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 93 */ new Array( 71/* "STRING" */,141 ),
	/* State 94 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 95 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 96 */ new Array( 14/* "}" */,-114 , 20/* "ROTATE" */,-114 , 21/* "FLIP" */,-114 , 26/* "XSHIFT" */,-114 , 27/* "YSHIFT" */,-114 , 35/* "SIZE" */,-114 , 36/* "SKEW" */,-114 , 48/* "GLOBALX" */,-114 , 49/* "GLOBALY" */,-114 , 22/* "HUE" */,-114 , 23/* "SATURATION" */,-114 , 24/* "BRIGHTNESS" */,-114 , 25/* "ALPHA" */,-114 , 37/* "TARGETHUE" */,-114 , 38/* "TARGETSATURATION" */,-114 , 39/* "TARGETBRIGHTNESS" */,-114 , 40/* "TARGETALPHA" */,-114 , 62/* "SHADOWOFFSETX" */,-114 , 63/* "SHADOWOFFSETY" */,-114 , 64/* "SHADOWBLUR" */,-114 , 65/* "SHADOWHUE" */,-114 , 67/* "SHADOWBRIGHTNESS" */,-114 , 66/* "SHADOWSATURATION" */,-114 , 68/* "SHADOWALPHA" */,-114 , 34/* "ZSHIFT" */,-114 , 42/* "PARAMETERS" */,-114 , 47/* "NONPATHSTROKEWIDTH" */,-114 , 43/* "STROKEWIDTH" */,-114 , 52/* "EMPTYOUTTEXT" */,-114 , 53/* "BACKSPC" */,-114 , 51/* "PIPETEXT" */,-114 , 50/* "TEXT" */,-114 , 54/* "FONTNAME" */,-114 , 55/* "FONTSIZE" */,-114 , 56/* "FONTUNIT" */,-114 , 57/* "FONTSTYLE" */,-114 , 58/* "STROKETEXT" */,-114 , 59/* "FILLTEXT" */,-114 , 61/* "TEXTALIGN" */,-114 , 60/* "TEXTBASELINE" */,-114 , 16/* "]" */,-114 ),
	/* State 97 */ new Array( 14/* "}" */,-115 , 20/* "ROTATE" */,-115 , 21/* "FLIP" */,-115 , 26/* "XSHIFT" */,-115 , 27/* "YSHIFT" */,-115 , 35/* "SIZE" */,-115 , 36/* "SKEW" */,-115 , 48/* "GLOBALX" */,-115 , 49/* "GLOBALY" */,-115 , 22/* "HUE" */,-115 , 23/* "SATURATION" */,-115 , 24/* "BRIGHTNESS" */,-115 , 25/* "ALPHA" */,-115 , 37/* "TARGETHUE" */,-115 , 38/* "TARGETSATURATION" */,-115 , 39/* "TARGETBRIGHTNESS" */,-115 , 40/* "TARGETALPHA" */,-115 , 62/* "SHADOWOFFSETX" */,-115 , 63/* "SHADOWOFFSETY" */,-115 , 64/* "SHADOWBLUR" */,-115 , 65/* "SHADOWHUE" */,-115 , 67/* "SHADOWBRIGHTNESS" */,-115 , 66/* "SHADOWSATURATION" */,-115 , 68/* "SHADOWALPHA" */,-115 , 34/* "ZSHIFT" */,-115 , 42/* "PARAMETERS" */,-115 , 47/* "NONPATHSTROKEWIDTH" */,-115 , 43/* "STROKEWIDTH" */,-115 , 52/* "EMPTYOUTTEXT" */,-115 , 53/* "BACKSPC" */,-115 , 51/* "PIPETEXT" */,-115 , 50/* "TEXT" */,-115 , 54/* "FONTNAME" */,-115 , 55/* "FONTSIZE" */,-115 , 56/* "FONTUNIT" */,-115 , 57/* "FONTSTYLE" */,-115 , 58/* "STROKETEXT" */,-115 , 59/* "FILLTEXT" */,-115 , 61/* "TEXTALIGN" */,-115 , 60/* "TEXTBASELINE" */,-115 , 16/* "]" */,-115 ),
	/* State 98 */ new Array( 70/* "RATIONAL" */,145 , 1/* "-" */,146 , 2/* "+" */,147 ),
	/* State 99 */ new Array( 72/* "NORMALSTRING" */,150 , 70/* "RATIONAL" */,145 , 1/* "-" */,146 , 2/* "+" */,147 , 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 100 */ new Array( 72/* "NORMALSTRING" */,152 ),
	/* State 101 */ new Array( 70/* "RATIONAL" */,153 ),
	/* State 102 */ new Array( 71/* "STRING" */,154 ),
	/* State 103 */ new Array( 71/* "STRING" */,155 ),
	/* State 104 */ new Array( 14/* "}" */,-123 , 20/* "ROTATE" */,-123 , 21/* "FLIP" */,-123 , 26/* "XSHIFT" */,-123 , 27/* "YSHIFT" */,-123 , 35/* "SIZE" */,-123 , 36/* "SKEW" */,-123 , 48/* "GLOBALX" */,-123 , 49/* "GLOBALY" */,-123 , 22/* "HUE" */,-123 , 23/* "SATURATION" */,-123 , 24/* "BRIGHTNESS" */,-123 , 25/* "ALPHA" */,-123 , 37/* "TARGETHUE" */,-123 , 38/* "TARGETSATURATION" */,-123 , 39/* "TARGETBRIGHTNESS" */,-123 , 40/* "TARGETALPHA" */,-123 , 62/* "SHADOWOFFSETX" */,-123 , 63/* "SHADOWOFFSETY" */,-123 , 64/* "SHADOWBLUR" */,-123 , 65/* "SHADOWHUE" */,-123 , 67/* "SHADOWBRIGHTNESS" */,-123 , 66/* "SHADOWSATURATION" */,-123 , 68/* "SHADOWALPHA" */,-123 , 34/* "ZSHIFT" */,-123 , 42/* "PARAMETERS" */,-123 , 47/* "NONPATHSTROKEWIDTH" */,-123 , 43/* "STROKEWIDTH" */,-123 , 52/* "EMPTYOUTTEXT" */,-123 , 53/* "BACKSPC" */,-123 , 51/* "PIPETEXT" */,-123 , 50/* "TEXT" */,-123 , 54/* "FONTNAME" */,-123 , 55/* "FONTSIZE" */,-123 , 56/* "FONTUNIT" */,-123 , 57/* "FONTSTYLE" */,-123 , 58/* "STROKETEXT" */,-123 , 59/* "FILLTEXT" */,-123 , 61/* "TEXTALIGN" */,-123 , 60/* "TEXTBASELINE" */,-123 , 16/* "]" */,-123 ),
	/* State 105 */ new Array( 14/* "}" */,-124 , 20/* "ROTATE" */,-124 , 21/* "FLIP" */,-124 , 26/* "XSHIFT" */,-124 , 27/* "YSHIFT" */,-124 , 35/* "SIZE" */,-124 , 36/* "SKEW" */,-124 , 48/* "GLOBALX" */,-124 , 49/* "GLOBALY" */,-124 , 22/* "HUE" */,-124 , 23/* "SATURATION" */,-124 , 24/* "BRIGHTNESS" */,-124 , 25/* "ALPHA" */,-124 , 37/* "TARGETHUE" */,-124 , 38/* "TARGETSATURATION" */,-124 , 39/* "TARGETBRIGHTNESS" */,-124 , 40/* "TARGETALPHA" */,-124 , 62/* "SHADOWOFFSETX" */,-124 , 63/* "SHADOWOFFSETY" */,-124 , 64/* "SHADOWBLUR" */,-124 , 65/* "SHADOWHUE" */,-124 , 67/* "SHADOWBRIGHTNESS" */,-124 , 66/* "SHADOWSATURATION" */,-124 , 68/* "SHADOWALPHA" */,-124 , 34/* "ZSHIFT" */,-124 , 42/* "PARAMETERS" */,-124 , 47/* "NONPATHSTROKEWIDTH" */,-124 , 43/* "STROKEWIDTH" */,-124 , 52/* "EMPTYOUTTEXT" */,-124 , 53/* "BACKSPC" */,-124 , 51/* "PIPETEXT" */,-124 , 50/* "TEXT" */,-124 , 54/* "FONTNAME" */,-124 , 55/* "FONTSIZE" */,-124 , 56/* "FONTUNIT" */,-124 , 57/* "FONTSTYLE" */,-124 , 58/* "STROKETEXT" */,-124 , 59/* "FILLTEXT" */,-124 , 61/* "TEXTALIGN" */,-124 , 60/* "TEXTBASELINE" */,-124 , 16/* "]" */,-124 ),
	/* State 106 */ new Array( 71/* "STRING" */,156 ),
	/* State 107 */ new Array( 71/* "STRING" */,157 ),
	/* State 108 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 109 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 110 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 111 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 112 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 113 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 114 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 115 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 116 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 117 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 118 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 119 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 120 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 121 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 122 */ new Array( 109/* "$" */,-89 , 7/* "STARTSHAPE" */,-89 , 8/* "BACKGROUND" */,-89 , 9/* "INCLUDE" */,-89 , 10/* "TILE" */,-89 , 35/* "SIZE" */,-89 , 11/* "RULE" */,-89 , 12/* "PATH" */,-89 , 14/* "}" */,-89 , 71/* "STRING" */,-89 , 20/* "ROTATE" */,-89 , 21/* "FLIP" */,-89 , 22/* "HUE" */,-89 , 23/* "SATURATION" */,-89 , 24/* "BRIGHTNESS" */,-89 , 25/* "ALPHA" */,-89 , 26/* "XSHIFT" */,-89 , 27/* "YSHIFT" */,-89 , 28/* "XCTRL1" */,-89 , 29/* "YCTRL1" */,-89 , 30/* "XRADIUS" */,-89 , 31/* "YRADIUS" */,-89 , 32/* "XCTRL2" */,-89 , 33/* "YCTRL2" */,-89 , 34/* "ZSHIFT" */,-89 , 36/* "SKEW" */,-89 , 42/* "PARAMETERS" */,-89 , 43/* "STROKEWIDTH" */,-89 , 47/* "NONPATHSTROKEWIDTH" */,-89 , 46/* "TILEDIM" */,-89 , 50/* "TEXT" */,-89 , 52/* "EMPTYOUTTEXT" */,-89 , 53/* "BACKSPC" */,-89 , 54/* "FONTNAME" */,-89 , 55/* "FONTSIZE" */,-89 , 56/* "FONTUNIT" */,-89 , 57/* "FONTSTYLE" */,-89 , 58/* "STROKETEXT" */,-89 , 59/* "FILLTEXT" */,-89 , 60/* "TEXTBASELINE" */,-89 , 61/* "TEXTALIGN" */,-89 , 48/* "GLOBALX" */,-89 , 49/* "GLOBALY" */,-89 , 62/* "SHADOWOFFSETX" */,-89 , 63/* "SHADOWOFFSETY" */,-89 , 64/* "SHADOWBLUR" */,-89 , 65/* "SHADOWHUE" */,-89 , 66/* "SHADOWSATURATION" */,-89 , 67/* "SHADOWBRIGHTNESS" */,-89 , 68/* "SHADOWALPHA" */,-89 , 70/* "RATIONAL" */,-89 , 13/* "{" */,-89 ),
	/* State 123 */ new Array( 14/* "}" */,173 , 70/* "RATIONAL" */,175 , 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 124 */ new Array( 14/* "}" */,-84 , 71/* "STRING" */,-84 , 20/* "ROTATE" */,-84 , 21/* "FLIP" */,-84 , 22/* "HUE" */,-84 , 23/* "SATURATION" */,-84 , 24/* "BRIGHTNESS" */,-84 , 25/* "ALPHA" */,-84 , 26/* "XSHIFT" */,-84 , 27/* "YSHIFT" */,-84 , 28/* "XCTRL1" */,-84 , 29/* "YCTRL1" */,-84 , 30/* "XRADIUS" */,-84 , 31/* "YRADIUS" */,-84 , 32/* "XCTRL2" */,-84 , 33/* "YCTRL2" */,-84 , 34/* "ZSHIFT" */,-84 , 35/* "SIZE" */,-84 , 36/* "SKEW" */,-84 , 42/* "PARAMETERS" */,-84 , 43/* "STROKEWIDTH" */,-84 , 47/* "NONPATHSTROKEWIDTH" */,-84 , 46/* "TILEDIM" */,-84 , 50/* "TEXT" */,-84 , 52/* "EMPTYOUTTEXT" */,-84 , 53/* "BACKSPC" */,-84 , 54/* "FONTNAME" */,-84 , 55/* "FONTSIZE" */,-84 , 56/* "FONTUNIT" */,-84 , 57/* "FONTSTYLE" */,-84 , 58/* "STROKETEXT" */,-84 , 59/* "FILLTEXT" */,-84 , 60/* "TEXTBASELINE" */,-84 , 61/* "TEXTALIGN" */,-84 , 48/* "GLOBALX" */,-84 , 49/* "GLOBALY" */,-84 , 62/* "SHADOWOFFSETX" */,-84 , 63/* "SHADOWOFFSETY" */,-84 , 64/* "SHADOWBLUR" */,-84 , 65/* "SHADOWHUE" */,-84 , 66/* "SHADOWSATURATION" */,-84 , 67/* "SHADOWBRIGHTNESS" */,-84 , 68/* "SHADOWALPHA" */,-84 , 70/* "RATIONAL" */,-84 ),
	/* State 125 */ new Array( 14/* "}" */,178 , 69/* "PATHOP" */,179 , 70/* "RATIONAL" */,180 , 71/* "STRING" */,181 ),
	/* State 126 */ new Array( 41/* "|" */,182 , 14/* "}" */,-148 , 22/* "HUE" */,-148 , 23/* "SATURATION" */,-148 , 24/* "BRIGHTNESS" */,-148 , 25/* "ALPHA" */,-148 , 37/* "TARGETHUE" */,-148 , 38/* "TARGETSATURATION" */,-148 , 39/* "TARGETBRIGHTNESS" */,-148 , 40/* "TARGETALPHA" */,-148 , 20/* "ROTATE" */,-148 , 21/* "FLIP" */,-148 , 26/* "XSHIFT" */,-148 , 27/* "YSHIFT" */,-148 , 35/* "SIZE" */,-148 , 36/* "SKEW" */,-148 , 48/* "GLOBALX" */,-148 , 49/* "GLOBALY" */,-148 , 62/* "SHADOWOFFSETX" */,-148 , 63/* "SHADOWOFFSETY" */,-148 , 64/* "SHADOWBLUR" */,-148 , 65/* "SHADOWHUE" */,-148 , 67/* "SHADOWBRIGHTNESS" */,-148 , 66/* "SHADOWSATURATION" */,-148 , 68/* "SHADOWALPHA" */,-148 , 34/* "ZSHIFT" */,-148 , 42/* "PARAMETERS" */,-148 , 47/* "NONPATHSTROKEWIDTH" */,-148 , 43/* "STROKEWIDTH" */,-148 , 52/* "EMPTYOUTTEXT" */,-148 , 53/* "BACKSPC" */,-148 , 51/* "PIPETEXT" */,-148 , 50/* "TEXT" */,-148 , 54/* "FONTNAME" */,-148 , 55/* "FONTSIZE" */,-148 , 56/* "FONTUNIT" */,-148 , 57/* "FONTSTYLE" */,-148 , 58/* "STROKETEXT" */,-148 , 59/* "FILLTEXT" */,-148 , 61/* "TEXTALIGN" */,-148 , 60/* "TEXTBASELINE" */,-148 , 16/* "]" */,-148 ),
	/* State 127 */ new Array( 14/* "}" */,-160 , 22/* "HUE" */,-160 , 23/* "SATURATION" */,-160 , 24/* "BRIGHTNESS" */,-160 , 25/* "ALPHA" */,-160 , 37/* "TARGETHUE" */,-160 , 38/* "TARGETSATURATION" */,-160 , 39/* "TARGETBRIGHTNESS" */,-160 , 40/* "TARGETALPHA" */,-160 , 20/* "ROTATE" */,-160 , 21/* "FLIP" */,-160 , 26/* "XSHIFT" */,-160 , 27/* "YSHIFT" */,-160 , 35/* "SIZE" */,-160 , 36/* "SKEW" */,-160 , 48/* "GLOBALX" */,-160 , 49/* "GLOBALY" */,-160 , 62/* "SHADOWOFFSETX" */,-160 , 63/* "SHADOWOFFSETY" */,-160 , 64/* "SHADOWBLUR" */,-160 , 65/* "SHADOWHUE" */,-160 , 67/* "SHADOWBRIGHTNESS" */,-160 , 66/* "SHADOWSATURATION" */,-160 , 68/* "SHADOWALPHA" */,-160 , 34/* "ZSHIFT" */,-160 , 42/* "PARAMETERS" */,-160 , 47/* "NONPATHSTROKEWIDTH" */,-160 , 43/* "STROKEWIDTH" */,-160 , 52/* "EMPTYOUTTEXT" */,-160 , 53/* "BACKSPC" */,-160 , 51/* "PIPETEXT" */,-160 , 50/* "TEXT" */,-160 , 54/* "FONTNAME" */,-160 , 55/* "FONTSIZE" */,-160 , 56/* "FONTUNIT" */,-160 , 57/* "FONTSTYLE" */,-160 , 58/* "STROKETEXT" */,-160 , 59/* "FILLTEXT" */,-160 , 61/* "TEXTALIGN" */,-160 , 60/* "TEXTBASELINE" */,-160 , 16/* "]" */,-160 , 41/* "|" */,-160 , 70/* "RATIONAL" */,-160 , 1/* "-" */,-160 , 2/* "+" */,-160 , 17/* "(" */,-160 , 71/* "STRING" */,-160 , 28/* "XCTRL1" */,-160 , 32/* "XCTRL2" */,-160 , 29/* "YCTRL1" */,-160 , 33/* "YCTRL2" */,-160 , 30/* "XRADIUS" */,-160 , 31/* "YRADIUS" */,-160 ),
	/* State 128 */ new Array( 70/* "RATIONAL" */,183 ),
	/* State 129 */ new Array( 70/* "RATIONAL" */,184 ),
	/* State 130 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 131 */ new Array( 17/* "(" */,191 ),
	/* State 132 */ new Array( 41/* "|" */,192 , 14/* "}" */,-149 , 22/* "HUE" */,-149 , 23/* "SATURATION" */,-149 , 24/* "BRIGHTNESS" */,-149 , 25/* "ALPHA" */,-149 , 37/* "TARGETHUE" */,-149 , 38/* "TARGETSATURATION" */,-149 , 39/* "TARGETBRIGHTNESS" */,-149 , 40/* "TARGETALPHA" */,-149 , 20/* "ROTATE" */,-149 , 21/* "FLIP" */,-149 , 26/* "XSHIFT" */,-149 , 27/* "YSHIFT" */,-149 , 35/* "SIZE" */,-149 , 36/* "SKEW" */,-149 , 48/* "GLOBALX" */,-149 , 49/* "GLOBALY" */,-149 , 62/* "SHADOWOFFSETX" */,-149 , 63/* "SHADOWOFFSETY" */,-149 , 64/* "SHADOWBLUR" */,-149 , 65/* "SHADOWHUE" */,-149 , 67/* "SHADOWBRIGHTNESS" */,-149 , 66/* "SHADOWSATURATION" */,-149 , 68/* "SHADOWALPHA" */,-149 , 34/* "ZSHIFT" */,-149 , 42/* "PARAMETERS" */,-149 , 47/* "NONPATHSTROKEWIDTH" */,-149 , 43/* "STROKEWIDTH" */,-149 , 52/* "EMPTYOUTTEXT" */,-149 , 53/* "BACKSPC" */,-149 , 51/* "PIPETEXT" */,-149 , 50/* "TEXT" */,-149 , 54/* "FONTNAME" */,-149 , 55/* "FONTSIZE" */,-149 , 56/* "FONTUNIT" */,-149 , 57/* "FONTSTYLE" */,-149 , 58/* "STROKETEXT" */,-149 , 59/* "FILLTEXT" */,-149 , 61/* "TEXTALIGN" */,-149 , 60/* "TEXTBASELINE" */,-149 , 16/* "]" */,-149 ),
	/* State 133 */ new Array( 41/* "|" */,193 , 14/* "}" */,-150 , 22/* "HUE" */,-150 , 23/* "SATURATION" */,-150 , 24/* "BRIGHTNESS" */,-150 , 25/* "ALPHA" */,-150 , 37/* "TARGETHUE" */,-150 , 38/* "TARGETSATURATION" */,-150 , 39/* "TARGETBRIGHTNESS" */,-150 , 40/* "TARGETALPHA" */,-150 , 20/* "ROTATE" */,-150 , 21/* "FLIP" */,-150 , 26/* "XSHIFT" */,-150 , 27/* "YSHIFT" */,-150 , 35/* "SIZE" */,-150 , 36/* "SKEW" */,-150 , 48/* "GLOBALX" */,-150 , 49/* "GLOBALY" */,-150 , 62/* "SHADOWOFFSETX" */,-150 , 63/* "SHADOWOFFSETY" */,-150 , 64/* "SHADOWBLUR" */,-150 , 65/* "SHADOWHUE" */,-150 , 67/* "SHADOWBRIGHTNESS" */,-150 , 66/* "SHADOWSATURATION" */,-150 , 68/* "SHADOWALPHA" */,-150 , 34/* "ZSHIFT" */,-150 , 42/* "PARAMETERS" */,-150 , 47/* "NONPATHSTROKEWIDTH" */,-150 , 43/* "STROKEWIDTH" */,-150 , 52/* "EMPTYOUTTEXT" */,-150 , 53/* "BACKSPC" */,-150 , 51/* "PIPETEXT" */,-150 , 50/* "TEXT" */,-150 , 54/* "FONTNAME" */,-150 , 55/* "FONTSIZE" */,-150 , 56/* "FONTUNIT" */,-150 , 57/* "FONTSTYLE" */,-150 , 58/* "STROKETEXT" */,-150 , 59/* "FILLTEXT" */,-150 , 61/* "TEXTALIGN" */,-150 , 60/* "TEXTBASELINE" */,-150 , 16/* "]" */,-150 ),
	/* State 134 */ new Array( 41/* "|" */,194 , 14/* "}" */,-151 , 22/* "HUE" */,-151 , 23/* "SATURATION" */,-151 , 24/* "BRIGHTNESS" */,-151 , 25/* "ALPHA" */,-151 , 37/* "TARGETHUE" */,-151 , 38/* "TARGETSATURATION" */,-151 , 39/* "TARGETBRIGHTNESS" */,-151 , 40/* "TARGETALPHA" */,-151 , 20/* "ROTATE" */,-151 , 21/* "FLIP" */,-151 , 26/* "XSHIFT" */,-151 , 27/* "YSHIFT" */,-151 , 35/* "SIZE" */,-151 , 36/* "SKEW" */,-151 , 48/* "GLOBALX" */,-151 , 49/* "GLOBALY" */,-151 , 62/* "SHADOWOFFSETX" */,-151 , 63/* "SHADOWOFFSETY" */,-151 , 64/* "SHADOWBLUR" */,-151 , 65/* "SHADOWHUE" */,-151 , 67/* "SHADOWBRIGHTNESS" */,-151 , 66/* "SHADOWSATURATION" */,-151 , 68/* "SHADOWALPHA" */,-151 , 34/* "ZSHIFT" */,-151 , 42/* "PARAMETERS" */,-151 , 47/* "NONPATHSTROKEWIDTH" */,-151 , 43/* "STROKEWIDTH" */,-151 , 52/* "EMPTYOUTTEXT" */,-151 , 53/* "BACKSPC" */,-151 , 51/* "PIPETEXT" */,-151 , 50/* "TEXT" */,-151 , 54/* "FONTNAME" */,-151 , 55/* "FONTSIZE" */,-151 , 56/* "FONTUNIT" */,-151 , 57/* "FONTSTYLE" */,-151 , 58/* "STROKETEXT" */,-151 , 59/* "FILLTEXT" */,-151 , 61/* "TEXTALIGN" */,-151 , 60/* "TEXTBASELINE" */,-151 , 16/* "]" */,-151 ),
	/* State 135 */ new Array( 14/* "}" */,-156 , 22/* "HUE" */,-156 , 23/* "SATURATION" */,-156 , 24/* "BRIGHTNESS" */,-156 , 25/* "ALPHA" */,-156 , 37/* "TARGETHUE" */,-156 , 38/* "TARGETSATURATION" */,-156 , 39/* "TARGETBRIGHTNESS" */,-156 , 40/* "TARGETALPHA" */,-156 , 20/* "ROTATE" */,-156 , 21/* "FLIP" */,-156 , 26/* "XSHIFT" */,-156 , 27/* "YSHIFT" */,-156 , 35/* "SIZE" */,-156 , 36/* "SKEW" */,-156 , 48/* "GLOBALX" */,-156 , 49/* "GLOBALY" */,-156 , 62/* "SHADOWOFFSETX" */,-156 , 63/* "SHADOWOFFSETY" */,-156 , 64/* "SHADOWBLUR" */,-156 , 65/* "SHADOWHUE" */,-156 , 67/* "SHADOWBRIGHTNESS" */,-156 , 66/* "SHADOWSATURATION" */,-156 , 68/* "SHADOWALPHA" */,-156 , 34/* "ZSHIFT" */,-156 , 42/* "PARAMETERS" */,-156 , 47/* "NONPATHSTROKEWIDTH" */,-156 , 43/* "STROKEWIDTH" */,-156 , 52/* "EMPTYOUTTEXT" */,-156 , 53/* "BACKSPC" */,-156 , 51/* "PIPETEXT" */,-156 , 50/* "TEXT" */,-156 , 54/* "FONTNAME" */,-156 , 55/* "FONTSIZE" */,-156 , 56/* "FONTUNIT" */,-156 , 57/* "FONTSTYLE" */,-156 , 58/* "STROKETEXT" */,-156 , 59/* "FILLTEXT" */,-156 , 61/* "TEXTALIGN" */,-156 , 60/* "TEXTBASELINE" */,-156 , 16/* "]" */,-156 ),
	/* State 136 */ new Array( 14/* "}" */,-157 , 22/* "HUE" */,-157 , 23/* "SATURATION" */,-157 , 24/* "BRIGHTNESS" */,-157 , 25/* "ALPHA" */,-157 , 37/* "TARGETHUE" */,-157 , 38/* "TARGETSATURATION" */,-157 , 39/* "TARGETBRIGHTNESS" */,-157 , 40/* "TARGETALPHA" */,-157 , 20/* "ROTATE" */,-157 , 21/* "FLIP" */,-157 , 26/* "XSHIFT" */,-157 , 27/* "YSHIFT" */,-157 , 35/* "SIZE" */,-157 , 36/* "SKEW" */,-157 , 48/* "GLOBALX" */,-157 , 49/* "GLOBALY" */,-157 , 62/* "SHADOWOFFSETX" */,-157 , 63/* "SHADOWOFFSETY" */,-157 , 64/* "SHADOWBLUR" */,-157 , 65/* "SHADOWHUE" */,-157 , 67/* "SHADOWBRIGHTNESS" */,-157 , 66/* "SHADOWSATURATION" */,-157 , 68/* "SHADOWALPHA" */,-157 , 34/* "ZSHIFT" */,-157 , 42/* "PARAMETERS" */,-157 , 47/* "NONPATHSTROKEWIDTH" */,-157 , 43/* "STROKEWIDTH" */,-157 , 52/* "EMPTYOUTTEXT" */,-157 , 53/* "BACKSPC" */,-157 , 51/* "PIPETEXT" */,-157 , 50/* "TEXT" */,-157 , 54/* "FONTNAME" */,-157 , 55/* "FONTSIZE" */,-157 , 56/* "FONTUNIT" */,-157 , 57/* "FONTSTYLE" */,-157 , 58/* "STROKETEXT" */,-157 , 59/* "FILLTEXT" */,-157 , 61/* "TEXTALIGN" */,-157 , 60/* "TEXTBASELINE" */,-157 , 16/* "]" */,-157 ),
	/* State 137 */ new Array( 14/* "}" */,-158 , 22/* "HUE" */,-158 , 23/* "SATURATION" */,-158 , 24/* "BRIGHTNESS" */,-158 , 25/* "ALPHA" */,-158 , 37/* "TARGETHUE" */,-158 , 38/* "TARGETSATURATION" */,-158 , 39/* "TARGETBRIGHTNESS" */,-158 , 40/* "TARGETALPHA" */,-158 , 20/* "ROTATE" */,-158 , 21/* "FLIP" */,-158 , 26/* "XSHIFT" */,-158 , 27/* "YSHIFT" */,-158 , 35/* "SIZE" */,-158 , 36/* "SKEW" */,-158 , 48/* "GLOBALX" */,-158 , 49/* "GLOBALY" */,-158 , 62/* "SHADOWOFFSETX" */,-158 , 63/* "SHADOWOFFSETY" */,-158 , 64/* "SHADOWBLUR" */,-158 , 65/* "SHADOWHUE" */,-158 , 67/* "SHADOWBRIGHTNESS" */,-158 , 66/* "SHADOWSATURATION" */,-158 , 68/* "SHADOWALPHA" */,-158 , 34/* "ZSHIFT" */,-158 , 42/* "PARAMETERS" */,-158 , 47/* "NONPATHSTROKEWIDTH" */,-158 , 43/* "STROKEWIDTH" */,-158 , 52/* "EMPTYOUTTEXT" */,-158 , 53/* "BACKSPC" */,-158 , 51/* "PIPETEXT" */,-158 , 50/* "TEXT" */,-158 , 54/* "FONTNAME" */,-158 , 55/* "FONTSIZE" */,-158 , 56/* "FONTUNIT" */,-158 , 57/* "FONTSTYLE" */,-158 , 58/* "STROKETEXT" */,-158 , 59/* "FILLTEXT" */,-158 , 61/* "TEXTALIGN" */,-158 , 60/* "TEXTBASELINE" */,-158 , 16/* "]" */,-158 ),
	/* State 138 */ new Array( 14/* "}" */,-159 , 22/* "HUE" */,-159 , 23/* "SATURATION" */,-159 , 24/* "BRIGHTNESS" */,-159 , 25/* "ALPHA" */,-159 , 37/* "TARGETHUE" */,-159 , 38/* "TARGETSATURATION" */,-159 , 39/* "TARGETBRIGHTNESS" */,-159 , 40/* "TARGETALPHA" */,-159 , 20/* "ROTATE" */,-159 , 21/* "FLIP" */,-159 , 26/* "XSHIFT" */,-159 , 27/* "YSHIFT" */,-159 , 35/* "SIZE" */,-159 , 36/* "SKEW" */,-159 , 48/* "GLOBALX" */,-159 , 49/* "GLOBALY" */,-159 , 62/* "SHADOWOFFSETX" */,-159 , 63/* "SHADOWOFFSETY" */,-159 , 64/* "SHADOWBLUR" */,-159 , 65/* "SHADOWHUE" */,-159 , 67/* "SHADOWBRIGHTNESS" */,-159 , 66/* "SHADOWSATURATION" */,-159 , 68/* "SHADOWALPHA" */,-159 , 34/* "ZSHIFT" */,-159 , 42/* "PARAMETERS" */,-159 , 47/* "NONPATHSTROKEWIDTH" */,-159 , 43/* "STROKEWIDTH" */,-159 , 52/* "EMPTYOUTTEXT" */,-159 , 53/* "BACKSPC" */,-159 , 51/* "PIPETEXT" */,-159 , 50/* "TEXT" */,-159 , 54/* "FONTNAME" */,-159 , 55/* "FONTSIZE" */,-159 , 56/* "FONTUNIT" */,-159 , 57/* "FONTSTYLE" */,-159 , 58/* "STROKETEXT" */,-159 , 59/* "FILLTEXT" */,-159 , 61/* "TEXTALIGN" */,-159 , 60/* "TEXTBASELINE" */,-159 , 16/* "]" */,-159 ),
	/* State 139 */ new Array( 14/* "}" */,-109 , 20/* "ROTATE" */,-109 , 21/* "FLIP" */,-109 , 26/* "XSHIFT" */,-109 , 27/* "YSHIFT" */,-109 , 35/* "SIZE" */,-109 , 36/* "SKEW" */,-109 , 48/* "GLOBALX" */,-109 , 49/* "GLOBALY" */,-109 , 22/* "HUE" */,-109 , 23/* "SATURATION" */,-109 , 24/* "BRIGHTNESS" */,-109 , 25/* "ALPHA" */,-109 , 37/* "TARGETHUE" */,-109 , 38/* "TARGETSATURATION" */,-109 , 39/* "TARGETBRIGHTNESS" */,-109 , 40/* "TARGETALPHA" */,-109 , 62/* "SHADOWOFFSETX" */,-109 , 63/* "SHADOWOFFSETY" */,-109 , 64/* "SHADOWBLUR" */,-109 , 65/* "SHADOWHUE" */,-109 , 67/* "SHADOWBRIGHTNESS" */,-109 , 66/* "SHADOWSATURATION" */,-109 , 68/* "SHADOWALPHA" */,-109 , 34/* "ZSHIFT" */,-109 , 42/* "PARAMETERS" */,-109 , 47/* "NONPATHSTROKEWIDTH" */,-109 , 43/* "STROKEWIDTH" */,-109 , 52/* "EMPTYOUTTEXT" */,-109 , 53/* "BACKSPC" */,-109 , 51/* "PIPETEXT" */,-109 , 50/* "TEXT" */,-109 , 54/* "FONTNAME" */,-109 , 55/* "FONTSIZE" */,-109 , 56/* "FONTUNIT" */,-109 , 57/* "FONTSTYLE" */,-109 , 58/* "STROKETEXT" */,-109 , 59/* "FILLTEXT" */,-109 , 61/* "TEXTALIGN" */,-109 , 60/* "TEXTBASELINE" */,-109 , 16/* "]" */,-109 ),
	/* State 140 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 , 14/* "}" */,-136 , 20/* "ROTATE" */,-136 , 21/* "FLIP" */,-136 , 26/* "XSHIFT" */,-136 , 27/* "YSHIFT" */,-136 , 35/* "SIZE" */,-136 , 36/* "SKEW" */,-136 , 48/* "GLOBALX" */,-136 , 49/* "GLOBALY" */,-136 , 22/* "HUE" */,-136 , 23/* "SATURATION" */,-136 , 24/* "BRIGHTNESS" */,-136 , 25/* "ALPHA" */,-136 , 37/* "TARGETHUE" */,-136 , 38/* "TARGETSATURATION" */,-136 , 39/* "TARGETBRIGHTNESS" */,-136 , 40/* "TARGETALPHA" */,-136 , 62/* "SHADOWOFFSETX" */,-136 , 63/* "SHADOWOFFSETY" */,-136 , 64/* "SHADOWBLUR" */,-136 , 65/* "SHADOWHUE" */,-136 , 67/* "SHADOWBRIGHTNESS" */,-136 , 66/* "SHADOWSATURATION" */,-136 , 68/* "SHADOWALPHA" */,-136 , 34/* "ZSHIFT" */,-136 , 42/* "PARAMETERS" */,-136 , 47/* "NONPATHSTROKEWIDTH" */,-136 , 43/* "STROKEWIDTH" */,-136 , 52/* "EMPTYOUTTEXT" */,-136 , 53/* "BACKSPC" */,-136 , 51/* "PIPETEXT" */,-136 , 50/* "TEXT" */,-136 , 54/* "FONTNAME" */,-136 , 55/* "FONTSIZE" */,-136 , 56/* "FONTUNIT" */,-136 , 57/* "FONTSTYLE" */,-136 , 58/* "STROKETEXT" */,-136 , 59/* "FILLTEXT" */,-136 , 61/* "TEXTALIGN" */,-136 , 60/* "TEXTBASELINE" */,-136 , 16/* "]" */,-136 ),
	/* State 141 */ new Array( 14/* "}" */,-111 , 20/* "ROTATE" */,-111 , 21/* "FLIP" */,-111 , 26/* "XSHIFT" */,-111 , 27/* "YSHIFT" */,-111 , 35/* "SIZE" */,-111 , 36/* "SKEW" */,-111 , 48/* "GLOBALX" */,-111 , 49/* "GLOBALY" */,-111 , 22/* "HUE" */,-111 , 23/* "SATURATION" */,-111 , 24/* "BRIGHTNESS" */,-111 , 25/* "ALPHA" */,-111 , 37/* "TARGETHUE" */,-111 , 38/* "TARGETSATURATION" */,-111 , 39/* "TARGETBRIGHTNESS" */,-111 , 40/* "TARGETALPHA" */,-111 , 62/* "SHADOWOFFSETX" */,-111 , 63/* "SHADOWOFFSETY" */,-111 , 64/* "SHADOWBLUR" */,-111 , 65/* "SHADOWHUE" */,-111 , 67/* "SHADOWBRIGHTNESS" */,-111 , 66/* "SHADOWSATURATION" */,-111 , 68/* "SHADOWALPHA" */,-111 , 34/* "ZSHIFT" */,-111 , 42/* "PARAMETERS" */,-111 , 47/* "NONPATHSTROKEWIDTH" */,-111 , 43/* "STROKEWIDTH" */,-111 , 52/* "EMPTYOUTTEXT" */,-111 , 53/* "BACKSPC" */,-111 , 51/* "PIPETEXT" */,-111 , 50/* "TEXT" */,-111 , 54/* "FONTNAME" */,-111 , 55/* "FONTSIZE" */,-111 , 56/* "FONTUNIT" */,-111 , 57/* "FONTSTYLE" */,-111 , 58/* "STROKETEXT" */,-111 , 59/* "FILLTEXT" */,-111 , 61/* "TEXTALIGN" */,-111 , 60/* "TEXTBASELINE" */,-111 , 16/* "]" */,-111 ),
	/* State 142 */ new Array( 14/* "}" */,-112 , 20/* "ROTATE" */,-112 , 21/* "FLIP" */,-112 , 26/* "XSHIFT" */,-112 , 27/* "YSHIFT" */,-112 , 35/* "SIZE" */,-112 , 36/* "SKEW" */,-112 , 48/* "GLOBALX" */,-112 , 49/* "GLOBALY" */,-112 , 22/* "HUE" */,-112 , 23/* "SATURATION" */,-112 , 24/* "BRIGHTNESS" */,-112 , 25/* "ALPHA" */,-112 , 37/* "TARGETHUE" */,-112 , 38/* "TARGETSATURATION" */,-112 , 39/* "TARGETBRIGHTNESS" */,-112 , 40/* "TARGETALPHA" */,-112 , 62/* "SHADOWOFFSETX" */,-112 , 63/* "SHADOWOFFSETY" */,-112 , 64/* "SHADOWBLUR" */,-112 , 65/* "SHADOWHUE" */,-112 , 67/* "SHADOWBRIGHTNESS" */,-112 , 66/* "SHADOWSATURATION" */,-112 , 68/* "SHADOWALPHA" */,-112 , 34/* "ZSHIFT" */,-112 , 42/* "PARAMETERS" */,-112 , 47/* "NONPATHSTROKEWIDTH" */,-112 , 43/* "STROKEWIDTH" */,-112 , 52/* "EMPTYOUTTEXT" */,-112 , 53/* "BACKSPC" */,-112 , 51/* "PIPETEXT" */,-112 , 50/* "TEXT" */,-112 , 54/* "FONTNAME" */,-112 , 55/* "FONTSIZE" */,-112 , 56/* "FONTUNIT" */,-112 , 57/* "FONTSTYLE" */,-112 , 58/* "STROKETEXT" */,-112 , 59/* "FILLTEXT" */,-112 , 61/* "TEXTALIGN" */,-112 , 60/* "TEXTBASELINE" */,-112 , 16/* "]" */,-112 ),
	/* State 143 */ new Array( 14/* "}" */,-113 , 20/* "ROTATE" */,-113 , 21/* "FLIP" */,-113 , 26/* "XSHIFT" */,-113 , 27/* "YSHIFT" */,-113 , 35/* "SIZE" */,-113 , 36/* "SKEW" */,-113 , 48/* "GLOBALX" */,-113 , 49/* "GLOBALY" */,-113 , 22/* "HUE" */,-113 , 23/* "SATURATION" */,-113 , 24/* "BRIGHTNESS" */,-113 , 25/* "ALPHA" */,-113 , 37/* "TARGETHUE" */,-113 , 38/* "TARGETSATURATION" */,-113 , 39/* "TARGETBRIGHTNESS" */,-113 , 40/* "TARGETALPHA" */,-113 , 62/* "SHADOWOFFSETX" */,-113 , 63/* "SHADOWOFFSETY" */,-113 , 64/* "SHADOWBLUR" */,-113 , 65/* "SHADOWHUE" */,-113 , 67/* "SHADOWBRIGHTNESS" */,-113 , 66/* "SHADOWSATURATION" */,-113 , 68/* "SHADOWALPHA" */,-113 , 34/* "ZSHIFT" */,-113 , 42/* "PARAMETERS" */,-113 , 47/* "NONPATHSTROKEWIDTH" */,-113 , 43/* "STROKEWIDTH" */,-113 , 52/* "EMPTYOUTTEXT" */,-113 , 53/* "BACKSPC" */,-113 , 51/* "PIPETEXT" */,-113 , 50/* "TEXT" */,-113 , 54/* "FONTNAME" */,-113 , 55/* "FONTSIZE" */,-113 , 56/* "FONTUNIT" */,-113 , 57/* "FONTSTYLE" */,-113 , 58/* "STROKETEXT" */,-113 , 59/* "FILLTEXT" */,-113 , 61/* "TEXTALIGN" */,-113 , 60/* "TEXTBASELINE" */,-113 , 16/* "]" */,-113 ),
	/* State 144 */ new Array( 14/* "}" */,-116 , 20/* "ROTATE" */,-116 , 21/* "FLIP" */,-116 , 26/* "XSHIFT" */,-116 , 27/* "YSHIFT" */,-116 , 35/* "SIZE" */,-116 , 36/* "SKEW" */,-116 , 48/* "GLOBALX" */,-116 , 49/* "GLOBALY" */,-116 , 22/* "HUE" */,-116 , 23/* "SATURATION" */,-116 , 24/* "BRIGHTNESS" */,-116 , 25/* "ALPHA" */,-116 , 37/* "TARGETHUE" */,-116 , 38/* "TARGETSATURATION" */,-116 , 39/* "TARGETBRIGHTNESS" */,-116 , 40/* "TARGETALPHA" */,-116 , 62/* "SHADOWOFFSETX" */,-116 , 63/* "SHADOWOFFSETY" */,-116 , 64/* "SHADOWBLUR" */,-116 , 65/* "SHADOWHUE" */,-116 , 67/* "SHADOWBRIGHTNESS" */,-116 , 66/* "SHADOWSATURATION" */,-116 , 68/* "SHADOWALPHA" */,-116 , 34/* "ZSHIFT" */,-116 , 42/* "PARAMETERS" */,-116 , 47/* "NONPATHSTROKEWIDTH" */,-116 , 43/* "STROKEWIDTH" */,-116 , 52/* "EMPTYOUTTEXT" */,-116 , 53/* "BACKSPC" */,-116 , 51/* "PIPETEXT" */,-116 , 50/* "TEXT" */,-116 , 54/* "FONTNAME" */,-116 , 55/* "FONTSIZE" */,-116 , 56/* "FONTUNIT" */,-116 , 57/* "FONTSTYLE" */,-116 , 58/* "STROKETEXT" */,-116 , 59/* "FILLTEXT" */,-116 , 61/* "TEXTALIGN" */,-116 , 60/* "TEXTBASELINE" */,-116 , 16/* "]" */,-116 ),
	/* State 145 */ new Array( 14/* "}" */,-127 , 20/* "ROTATE" */,-127 , 21/* "FLIP" */,-127 , 26/* "XSHIFT" */,-127 , 27/* "YSHIFT" */,-127 , 35/* "SIZE" */,-127 , 36/* "SKEW" */,-127 , 48/* "GLOBALX" */,-127 , 49/* "GLOBALY" */,-127 , 22/* "HUE" */,-127 , 23/* "SATURATION" */,-127 , 24/* "BRIGHTNESS" */,-127 , 25/* "ALPHA" */,-127 , 37/* "TARGETHUE" */,-127 , 38/* "TARGETSATURATION" */,-127 , 39/* "TARGETBRIGHTNESS" */,-127 , 40/* "TARGETALPHA" */,-127 , 62/* "SHADOWOFFSETX" */,-127 , 63/* "SHADOWOFFSETY" */,-127 , 64/* "SHADOWBLUR" */,-127 , 65/* "SHADOWHUE" */,-127 , 67/* "SHADOWBRIGHTNESS" */,-127 , 66/* "SHADOWSATURATION" */,-127 , 68/* "SHADOWALPHA" */,-127 , 34/* "ZSHIFT" */,-127 , 42/* "PARAMETERS" */,-127 , 47/* "NONPATHSTROKEWIDTH" */,-127 , 43/* "STROKEWIDTH" */,-127 , 52/* "EMPTYOUTTEXT" */,-127 , 53/* "BACKSPC" */,-127 , 51/* "PIPETEXT" */,-127 , 50/* "TEXT" */,-127 , 54/* "FONTNAME" */,-127 , 55/* "FONTSIZE" */,-127 , 56/* "FONTUNIT" */,-127 , 57/* "FONTSTYLE" */,-127 , 58/* "STROKETEXT" */,-127 , 59/* "FILLTEXT" */,-127 , 61/* "TEXTALIGN" */,-127 , 60/* "TEXTBASELINE" */,-127 , 16/* "]" */,-127 ),
	/* State 146 */ new Array( 70/* "RATIONAL" */,196 ),
	/* State 147 */ new Array( 70/* "RATIONAL" */,197 ),
	/* State 148 */ new Array( 14/* "}" */,-118 , 20/* "ROTATE" */,-118 , 21/* "FLIP" */,-118 , 26/* "XSHIFT" */,-118 , 27/* "YSHIFT" */,-118 , 35/* "SIZE" */,-118 , 36/* "SKEW" */,-118 , 48/* "GLOBALX" */,-118 , 49/* "GLOBALY" */,-118 , 22/* "HUE" */,-118 , 23/* "SATURATION" */,-118 , 24/* "BRIGHTNESS" */,-118 , 25/* "ALPHA" */,-118 , 37/* "TARGETHUE" */,-118 , 38/* "TARGETSATURATION" */,-118 , 39/* "TARGETBRIGHTNESS" */,-118 , 40/* "TARGETALPHA" */,-118 , 62/* "SHADOWOFFSETX" */,-118 , 63/* "SHADOWOFFSETY" */,-118 , 64/* "SHADOWBLUR" */,-118 , 65/* "SHADOWHUE" */,-118 , 67/* "SHADOWBRIGHTNESS" */,-118 , 66/* "SHADOWSATURATION" */,-118 , 68/* "SHADOWALPHA" */,-118 , 34/* "ZSHIFT" */,-118 , 42/* "PARAMETERS" */,-118 , 47/* "NONPATHSTROKEWIDTH" */,-118 , 43/* "STROKEWIDTH" */,-118 , 52/* "EMPTYOUTTEXT" */,-118 , 53/* "BACKSPC" */,-118 , 51/* "PIPETEXT" */,-118 , 50/* "TEXT" */,-118 , 54/* "FONTNAME" */,-118 , 55/* "FONTSIZE" */,-118 , 56/* "FONTUNIT" */,-118 , 57/* "FONTSTYLE" */,-118 , 58/* "STROKETEXT" */,-118 , 59/* "FILLTEXT" */,-118 , 61/* "TEXTALIGN" */,-118 , 60/* "TEXTBASELINE" */,-118 , 16/* "]" */,-118 ),
	/* State 149 */ new Array( 14/* "}" */,-117 , 20/* "ROTATE" */,-117 , 21/* "FLIP" */,-117 , 26/* "XSHIFT" */,-117 , 27/* "YSHIFT" */,-117 , 35/* "SIZE" */,-117 , 36/* "SKEW" */,-117 , 48/* "GLOBALX" */,-117 , 49/* "GLOBALY" */,-117 , 22/* "HUE" */,-117 , 23/* "SATURATION" */,-117 , 24/* "BRIGHTNESS" */,-117 , 25/* "ALPHA" */,-117 , 37/* "TARGETHUE" */,-117 , 38/* "TARGETSATURATION" */,-117 , 39/* "TARGETBRIGHTNESS" */,-117 , 40/* "TARGETALPHA" */,-117 , 62/* "SHADOWOFFSETX" */,-117 , 63/* "SHADOWOFFSETY" */,-117 , 64/* "SHADOWBLUR" */,-117 , 65/* "SHADOWHUE" */,-117 , 67/* "SHADOWBRIGHTNESS" */,-117 , 66/* "SHADOWSATURATION" */,-117 , 68/* "SHADOWALPHA" */,-117 , 34/* "ZSHIFT" */,-117 , 42/* "PARAMETERS" */,-117 , 47/* "NONPATHSTROKEWIDTH" */,-117 , 43/* "STROKEWIDTH" */,-117 , 52/* "EMPTYOUTTEXT" */,-117 , 53/* "BACKSPC" */,-117 , 51/* "PIPETEXT" */,-117 , 50/* "TEXT" */,-117 , 54/* "FONTNAME" */,-117 , 55/* "FONTSIZE" */,-117 , 56/* "FONTUNIT" */,-117 , 57/* "FONTSTYLE" */,-117 , 58/* "STROKETEXT" */,-117 , 59/* "FILLTEXT" */,-117 , 61/* "TEXTALIGN" */,-117 , 60/* "TEXTBASELINE" */,-117 , 16/* "]" */,-117 ),
	/* State 150 */ new Array( 14/* "}" */,-130 , 20/* "ROTATE" */,-130 , 21/* "FLIP" */,-130 , 26/* "XSHIFT" */,-130 , 27/* "YSHIFT" */,-130 , 35/* "SIZE" */,-130 , 36/* "SKEW" */,-130 , 48/* "GLOBALX" */,-130 , 49/* "GLOBALY" */,-130 , 22/* "HUE" */,-130 , 23/* "SATURATION" */,-130 , 24/* "BRIGHTNESS" */,-130 , 25/* "ALPHA" */,-130 , 37/* "TARGETHUE" */,-130 , 38/* "TARGETSATURATION" */,-130 , 39/* "TARGETBRIGHTNESS" */,-130 , 40/* "TARGETALPHA" */,-130 , 62/* "SHADOWOFFSETX" */,-130 , 63/* "SHADOWOFFSETY" */,-130 , 64/* "SHADOWBLUR" */,-130 , 65/* "SHADOWHUE" */,-130 , 67/* "SHADOWBRIGHTNESS" */,-130 , 66/* "SHADOWSATURATION" */,-130 , 68/* "SHADOWALPHA" */,-130 , 34/* "ZSHIFT" */,-130 , 42/* "PARAMETERS" */,-130 , 47/* "NONPATHSTROKEWIDTH" */,-130 , 43/* "STROKEWIDTH" */,-130 , 52/* "EMPTYOUTTEXT" */,-130 , 53/* "BACKSPC" */,-130 , 51/* "PIPETEXT" */,-130 , 50/* "TEXT" */,-130 , 54/* "FONTNAME" */,-130 , 55/* "FONTSIZE" */,-130 , 56/* "FONTUNIT" */,-130 , 57/* "FONTSTYLE" */,-130 , 58/* "STROKETEXT" */,-130 , 59/* "FILLTEXT" */,-130 , 61/* "TEXTALIGN" */,-130 , 60/* "TEXTBASELINE" */,-130 , 16/* "]" */,-130 ),
	/* State 151 */ new Array( 14/* "}" */,-131 , 20/* "ROTATE" */,-131 , 21/* "FLIP" */,-131 , 26/* "XSHIFT" */,-131 , 27/* "YSHIFT" */,-131 , 35/* "SIZE" */,-131 , 36/* "SKEW" */,-131 , 48/* "GLOBALX" */,-131 , 49/* "GLOBALY" */,-131 , 22/* "HUE" */,-131 , 23/* "SATURATION" */,-131 , 24/* "BRIGHTNESS" */,-131 , 25/* "ALPHA" */,-131 , 37/* "TARGETHUE" */,-131 , 38/* "TARGETSATURATION" */,-131 , 39/* "TARGETBRIGHTNESS" */,-131 , 40/* "TARGETALPHA" */,-131 , 62/* "SHADOWOFFSETX" */,-131 , 63/* "SHADOWOFFSETY" */,-131 , 64/* "SHADOWBLUR" */,-131 , 65/* "SHADOWHUE" */,-131 , 67/* "SHADOWBRIGHTNESS" */,-131 , 66/* "SHADOWSATURATION" */,-131 , 68/* "SHADOWALPHA" */,-131 , 34/* "ZSHIFT" */,-131 , 42/* "PARAMETERS" */,-131 , 47/* "NONPATHSTROKEWIDTH" */,-131 , 43/* "STROKEWIDTH" */,-131 , 52/* "EMPTYOUTTEXT" */,-131 , 53/* "BACKSPC" */,-131 , 51/* "PIPETEXT" */,-131 , 50/* "TEXT" */,-131 , 54/* "FONTNAME" */,-131 , 55/* "FONTSIZE" */,-131 , 56/* "FONTUNIT" */,-131 , 57/* "FONTSTYLE" */,-131 , 58/* "STROKETEXT" */,-131 , 59/* "FILLTEXT" */,-131 , 61/* "TEXTALIGN" */,-131 , 60/* "TEXTBASELINE" */,-131 , 16/* "]" */,-131 ),
	/* State 152 */ new Array( 14/* "}" */,-119 , 20/* "ROTATE" */,-119 , 21/* "FLIP" */,-119 , 26/* "XSHIFT" */,-119 , 27/* "YSHIFT" */,-119 , 35/* "SIZE" */,-119 , 36/* "SKEW" */,-119 , 48/* "GLOBALX" */,-119 , 49/* "GLOBALY" */,-119 , 22/* "HUE" */,-119 , 23/* "SATURATION" */,-119 , 24/* "BRIGHTNESS" */,-119 , 25/* "ALPHA" */,-119 , 37/* "TARGETHUE" */,-119 , 38/* "TARGETSATURATION" */,-119 , 39/* "TARGETBRIGHTNESS" */,-119 , 40/* "TARGETALPHA" */,-119 , 62/* "SHADOWOFFSETX" */,-119 , 63/* "SHADOWOFFSETY" */,-119 , 64/* "SHADOWBLUR" */,-119 , 65/* "SHADOWHUE" */,-119 , 67/* "SHADOWBRIGHTNESS" */,-119 , 66/* "SHADOWSATURATION" */,-119 , 68/* "SHADOWALPHA" */,-119 , 34/* "ZSHIFT" */,-119 , 42/* "PARAMETERS" */,-119 , 47/* "NONPATHSTROKEWIDTH" */,-119 , 43/* "STROKEWIDTH" */,-119 , 52/* "EMPTYOUTTEXT" */,-119 , 53/* "BACKSPC" */,-119 , 51/* "PIPETEXT" */,-119 , 50/* "TEXT" */,-119 , 54/* "FONTNAME" */,-119 , 55/* "FONTSIZE" */,-119 , 56/* "FONTUNIT" */,-119 , 57/* "FONTSTYLE" */,-119 , 58/* "STROKETEXT" */,-119 , 59/* "FILLTEXT" */,-119 , 61/* "TEXTALIGN" */,-119 , 60/* "TEXTBASELINE" */,-119 , 16/* "]" */,-119 ),
	/* State 153 */ new Array( 14/* "}" */,-120 , 20/* "ROTATE" */,-120 , 21/* "FLIP" */,-120 , 26/* "XSHIFT" */,-120 , 27/* "YSHIFT" */,-120 , 35/* "SIZE" */,-120 , 36/* "SKEW" */,-120 , 48/* "GLOBALX" */,-120 , 49/* "GLOBALY" */,-120 , 22/* "HUE" */,-120 , 23/* "SATURATION" */,-120 , 24/* "BRIGHTNESS" */,-120 , 25/* "ALPHA" */,-120 , 37/* "TARGETHUE" */,-120 , 38/* "TARGETSATURATION" */,-120 , 39/* "TARGETBRIGHTNESS" */,-120 , 40/* "TARGETALPHA" */,-120 , 62/* "SHADOWOFFSETX" */,-120 , 63/* "SHADOWOFFSETY" */,-120 , 64/* "SHADOWBLUR" */,-120 , 65/* "SHADOWHUE" */,-120 , 67/* "SHADOWBRIGHTNESS" */,-120 , 66/* "SHADOWSATURATION" */,-120 , 68/* "SHADOWALPHA" */,-120 , 34/* "ZSHIFT" */,-120 , 42/* "PARAMETERS" */,-120 , 47/* "NONPATHSTROKEWIDTH" */,-120 , 43/* "STROKEWIDTH" */,-120 , 52/* "EMPTYOUTTEXT" */,-120 , 53/* "BACKSPC" */,-120 , 51/* "PIPETEXT" */,-120 , 50/* "TEXT" */,-120 , 54/* "FONTNAME" */,-120 , 55/* "FONTSIZE" */,-120 , 56/* "FONTUNIT" */,-120 , 57/* "FONTSTYLE" */,-120 , 58/* "STROKETEXT" */,-120 , 59/* "FILLTEXT" */,-120 , 61/* "TEXTALIGN" */,-120 , 60/* "TEXTBASELINE" */,-120 , 16/* "]" */,-120 ),
	/* State 154 */ new Array( 14/* "}" */,-121 , 20/* "ROTATE" */,-121 , 21/* "FLIP" */,-121 , 26/* "XSHIFT" */,-121 , 27/* "YSHIFT" */,-121 , 35/* "SIZE" */,-121 , 36/* "SKEW" */,-121 , 48/* "GLOBALX" */,-121 , 49/* "GLOBALY" */,-121 , 22/* "HUE" */,-121 , 23/* "SATURATION" */,-121 , 24/* "BRIGHTNESS" */,-121 , 25/* "ALPHA" */,-121 , 37/* "TARGETHUE" */,-121 , 38/* "TARGETSATURATION" */,-121 , 39/* "TARGETBRIGHTNESS" */,-121 , 40/* "TARGETALPHA" */,-121 , 62/* "SHADOWOFFSETX" */,-121 , 63/* "SHADOWOFFSETY" */,-121 , 64/* "SHADOWBLUR" */,-121 , 65/* "SHADOWHUE" */,-121 , 67/* "SHADOWBRIGHTNESS" */,-121 , 66/* "SHADOWSATURATION" */,-121 , 68/* "SHADOWALPHA" */,-121 , 34/* "ZSHIFT" */,-121 , 42/* "PARAMETERS" */,-121 , 47/* "NONPATHSTROKEWIDTH" */,-121 , 43/* "STROKEWIDTH" */,-121 , 52/* "EMPTYOUTTEXT" */,-121 , 53/* "BACKSPC" */,-121 , 51/* "PIPETEXT" */,-121 , 50/* "TEXT" */,-121 , 54/* "FONTNAME" */,-121 , 55/* "FONTSIZE" */,-121 , 56/* "FONTUNIT" */,-121 , 57/* "FONTSTYLE" */,-121 , 58/* "STROKETEXT" */,-121 , 59/* "FILLTEXT" */,-121 , 61/* "TEXTALIGN" */,-121 , 60/* "TEXTBASELINE" */,-121 , 16/* "]" */,-121 ),
	/* State 155 */ new Array( 14/* "}" */,-122 , 20/* "ROTATE" */,-122 , 21/* "FLIP" */,-122 , 26/* "XSHIFT" */,-122 , 27/* "YSHIFT" */,-122 , 35/* "SIZE" */,-122 , 36/* "SKEW" */,-122 , 48/* "GLOBALX" */,-122 , 49/* "GLOBALY" */,-122 , 22/* "HUE" */,-122 , 23/* "SATURATION" */,-122 , 24/* "BRIGHTNESS" */,-122 , 25/* "ALPHA" */,-122 , 37/* "TARGETHUE" */,-122 , 38/* "TARGETSATURATION" */,-122 , 39/* "TARGETBRIGHTNESS" */,-122 , 40/* "TARGETALPHA" */,-122 , 62/* "SHADOWOFFSETX" */,-122 , 63/* "SHADOWOFFSETY" */,-122 , 64/* "SHADOWBLUR" */,-122 , 65/* "SHADOWHUE" */,-122 , 67/* "SHADOWBRIGHTNESS" */,-122 , 66/* "SHADOWSATURATION" */,-122 , 68/* "SHADOWALPHA" */,-122 , 34/* "ZSHIFT" */,-122 , 42/* "PARAMETERS" */,-122 , 47/* "NONPATHSTROKEWIDTH" */,-122 , 43/* "STROKEWIDTH" */,-122 , 52/* "EMPTYOUTTEXT" */,-122 , 53/* "BACKSPC" */,-122 , 51/* "PIPETEXT" */,-122 , 50/* "TEXT" */,-122 , 54/* "FONTNAME" */,-122 , 55/* "FONTSIZE" */,-122 , 56/* "FONTUNIT" */,-122 , 57/* "FONTSTYLE" */,-122 , 58/* "STROKETEXT" */,-122 , 59/* "FILLTEXT" */,-122 , 61/* "TEXTALIGN" */,-122 , 60/* "TEXTBASELINE" */,-122 , 16/* "]" */,-122 ),
	/* State 156 */ new Array( 14/* "}" */,-125 , 20/* "ROTATE" */,-125 , 21/* "FLIP" */,-125 , 26/* "XSHIFT" */,-125 , 27/* "YSHIFT" */,-125 , 35/* "SIZE" */,-125 , 36/* "SKEW" */,-125 , 48/* "GLOBALX" */,-125 , 49/* "GLOBALY" */,-125 , 22/* "HUE" */,-125 , 23/* "SATURATION" */,-125 , 24/* "BRIGHTNESS" */,-125 , 25/* "ALPHA" */,-125 , 37/* "TARGETHUE" */,-125 , 38/* "TARGETSATURATION" */,-125 , 39/* "TARGETBRIGHTNESS" */,-125 , 40/* "TARGETALPHA" */,-125 , 62/* "SHADOWOFFSETX" */,-125 , 63/* "SHADOWOFFSETY" */,-125 , 64/* "SHADOWBLUR" */,-125 , 65/* "SHADOWHUE" */,-125 , 67/* "SHADOWBRIGHTNESS" */,-125 , 66/* "SHADOWSATURATION" */,-125 , 68/* "SHADOWALPHA" */,-125 , 34/* "ZSHIFT" */,-125 , 42/* "PARAMETERS" */,-125 , 47/* "NONPATHSTROKEWIDTH" */,-125 , 43/* "STROKEWIDTH" */,-125 , 52/* "EMPTYOUTTEXT" */,-125 , 53/* "BACKSPC" */,-125 , 51/* "PIPETEXT" */,-125 , 50/* "TEXT" */,-125 , 54/* "FONTNAME" */,-125 , 55/* "FONTSIZE" */,-125 , 56/* "FONTUNIT" */,-125 , 57/* "FONTSTYLE" */,-125 , 58/* "STROKETEXT" */,-125 , 59/* "FILLTEXT" */,-125 , 61/* "TEXTALIGN" */,-125 , 60/* "TEXTBASELINE" */,-125 , 16/* "]" */,-125 ),
	/* State 157 */ new Array( 14/* "}" */,-126 , 20/* "ROTATE" */,-126 , 21/* "FLIP" */,-126 , 26/* "XSHIFT" */,-126 , 27/* "YSHIFT" */,-126 , 35/* "SIZE" */,-126 , 36/* "SKEW" */,-126 , 48/* "GLOBALX" */,-126 , 49/* "GLOBALY" */,-126 , 22/* "HUE" */,-126 , 23/* "SATURATION" */,-126 , 24/* "BRIGHTNESS" */,-126 , 25/* "ALPHA" */,-126 , 37/* "TARGETHUE" */,-126 , 38/* "TARGETSATURATION" */,-126 , 39/* "TARGETBRIGHTNESS" */,-126 , 40/* "TARGETALPHA" */,-126 , 62/* "SHADOWOFFSETX" */,-126 , 63/* "SHADOWOFFSETY" */,-126 , 64/* "SHADOWBLUR" */,-126 , 65/* "SHADOWHUE" */,-126 , 67/* "SHADOWBRIGHTNESS" */,-126 , 66/* "SHADOWSATURATION" */,-126 , 68/* "SHADOWALPHA" */,-126 , 34/* "ZSHIFT" */,-126 , 42/* "PARAMETERS" */,-126 , 47/* "NONPATHSTROKEWIDTH" */,-126 , 43/* "STROKEWIDTH" */,-126 , 52/* "EMPTYOUTTEXT" */,-126 , 53/* "BACKSPC" */,-126 , 51/* "PIPETEXT" */,-126 , 50/* "TEXT" */,-126 , 54/* "FONTNAME" */,-126 , 55/* "FONTSIZE" */,-126 , 56/* "FONTUNIT" */,-126 , 57/* "FONTSTYLE" */,-126 , 58/* "STROKETEXT" */,-126 , 59/* "FILLTEXT" */,-126 , 61/* "TEXTALIGN" */,-126 , 60/* "TEXTBASELINE" */,-126 , 16/* "]" */,-126 ),
	/* State 158 */ new Array( 14/* "}" */,-132 , 20/* "ROTATE" */,-132 , 21/* "FLIP" */,-132 , 26/* "XSHIFT" */,-132 , 27/* "YSHIFT" */,-132 , 35/* "SIZE" */,-132 , 36/* "SKEW" */,-132 , 48/* "GLOBALX" */,-132 , 49/* "GLOBALY" */,-132 , 22/* "HUE" */,-132 , 23/* "SATURATION" */,-132 , 24/* "BRIGHTNESS" */,-132 , 25/* "ALPHA" */,-132 , 37/* "TARGETHUE" */,-132 , 38/* "TARGETSATURATION" */,-132 , 39/* "TARGETBRIGHTNESS" */,-132 , 40/* "TARGETALPHA" */,-132 , 62/* "SHADOWOFFSETX" */,-132 , 63/* "SHADOWOFFSETY" */,-132 , 64/* "SHADOWBLUR" */,-132 , 65/* "SHADOWHUE" */,-132 , 67/* "SHADOWBRIGHTNESS" */,-132 , 66/* "SHADOWSATURATION" */,-132 , 68/* "SHADOWALPHA" */,-132 , 34/* "ZSHIFT" */,-132 , 42/* "PARAMETERS" */,-132 , 47/* "NONPATHSTROKEWIDTH" */,-132 , 43/* "STROKEWIDTH" */,-132 , 52/* "EMPTYOUTTEXT" */,-132 , 53/* "BACKSPC" */,-132 , 51/* "PIPETEXT" */,-132 , 50/* "TEXT" */,-132 , 54/* "FONTNAME" */,-132 , 55/* "FONTSIZE" */,-132 , 56/* "FONTUNIT" */,-132 , 57/* "FONTSTYLE" */,-132 , 58/* "STROKETEXT" */,-132 , 59/* "FILLTEXT" */,-132 , 61/* "TEXTALIGN" */,-132 , 60/* "TEXTBASELINE" */,-132 , 16/* "]" */,-132 ),
	/* State 159 */ new Array( 14/* "}" */,-133 , 20/* "ROTATE" */,-133 , 21/* "FLIP" */,-133 , 26/* "XSHIFT" */,-133 , 27/* "YSHIFT" */,-133 , 35/* "SIZE" */,-133 , 36/* "SKEW" */,-133 , 48/* "GLOBALX" */,-133 , 49/* "GLOBALY" */,-133 , 22/* "HUE" */,-133 , 23/* "SATURATION" */,-133 , 24/* "BRIGHTNESS" */,-133 , 25/* "ALPHA" */,-133 , 37/* "TARGETHUE" */,-133 , 38/* "TARGETSATURATION" */,-133 , 39/* "TARGETBRIGHTNESS" */,-133 , 40/* "TARGETALPHA" */,-133 , 62/* "SHADOWOFFSETX" */,-133 , 63/* "SHADOWOFFSETY" */,-133 , 64/* "SHADOWBLUR" */,-133 , 65/* "SHADOWHUE" */,-133 , 67/* "SHADOWBRIGHTNESS" */,-133 , 66/* "SHADOWSATURATION" */,-133 , 68/* "SHADOWALPHA" */,-133 , 34/* "ZSHIFT" */,-133 , 42/* "PARAMETERS" */,-133 , 47/* "NONPATHSTROKEWIDTH" */,-133 , 43/* "STROKEWIDTH" */,-133 , 52/* "EMPTYOUTTEXT" */,-133 , 53/* "BACKSPC" */,-133 , 51/* "PIPETEXT" */,-133 , 50/* "TEXT" */,-133 , 54/* "FONTNAME" */,-133 , 55/* "FONTSIZE" */,-133 , 56/* "FONTUNIT" */,-133 , 57/* "FONTSTYLE" */,-133 , 58/* "STROKETEXT" */,-133 , 59/* "FILLTEXT" */,-133 , 61/* "TEXTALIGN" */,-133 , 60/* "TEXTBASELINE" */,-133 , 16/* "]" */,-133 ),
	/* State 160 */ new Array( 14/* "}" */,-134 , 20/* "ROTATE" */,-134 , 21/* "FLIP" */,-134 , 26/* "XSHIFT" */,-134 , 27/* "YSHIFT" */,-134 , 35/* "SIZE" */,-134 , 36/* "SKEW" */,-134 , 48/* "GLOBALX" */,-134 , 49/* "GLOBALY" */,-134 , 22/* "HUE" */,-134 , 23/* "SATURATION" */,-134 , 24/* "BRIGHTNESS" */,-134 , 25/* "ALPHA" */,-134 , 37/* "TARGETHUE" */,-134 , 38/* "TARGETSATURATION" */,-134 , 39/* "TARGETBRIGHTNESS" */,-134 , 40/* "TARGETALPHA" */,-134 , 62/* "SHADOWOFFSETX" */,-134 , 63/* "SHADOWOFFSETY" */,-134 , 64/* "SHADOWBLUR" */,-134 , 65/* "SHADOWHUE" */,-134 , 67/* "SHADOWBRIGHTNESS" */,-134 , 66/* "SHADOWSATURATION" */,-134 , 68/* "SHADOWALPHA" */,-134 , 34/* "ZSHIFT" */,-134 , 42/* "PARAMETERS" */,-134 , 47/* "NONPATHSTROKEWIDTH" */,-134 , 43/* "STROKEWIDTH" */,-134 , 52/* "EMPTYOUTTEXT" */,-134 , 53/* "BACKSPC" */,-134 , 51/* "PIPETEXT" */,-134 , 50/* "TEXT" */,-134 , 54/* "FONTNAME" */,-134 , 55/* "FONTSIZE" */,-134 , 56/* "FONTUNIT" */,-134 , 57/* "FONTSTYLE" */,-134 , 58/* "STROKETEXT" */,-134 , 59/* "FILLTEXT" */,-134 , 61/* "TEXTALIGN" */,-134 , 60/* "TEXTBASELINE" */,-134 , 16/* "]" */,-134 ),
	/* State 161 */ new Array( 14/* "}" */,-135 , 20/* "ROTATE" */,-135 , 21/* "FLIP" */,-135 , 26/* "XSHIFT" */,-135 , 27/* "YSHIFT" */,-135 , 35/* "SIZE" */,-135 , 36/* "SKEW" */,-135 , 48/* "GLOBALX" */,-135 , 49/* "GLOBALY" */,-135 , 22/* "HUE" */,-135 , 23/* "SATURATION" */,-135 , 24/* "BRIGHTNESS" */,-135 , 25/* "ALPHA" */,-135 , 37/* "TARGETHUE" */,-135 , 38/* "TARGETSATURATION" */,-135 , 39/* "TARGETBRIGHTNESS" */,-135 , 40/* "TARGETALPHA" */,-135 , 62/* "SHADOWOFFSETX" */,-135 , 63/* "SHADOWOFFSETY" */,-135 , 64/* "SHADOWBLUR" */,-135 , 65/* "SHADOWHUE" */,-135 , 67/* "SHADOWBRIGHTNESS" */,-135 , 66/* "SHADOWSATURATION" */,-135 , 68/* "SHADOWALPHA" */,-135 , 34/* "ZSHIFT" */,-135 , 42/* "PARAMETERS" */,-135 , 47/* "NONPATHSTROKEWIDTH" */,-135 , 43/* "STROKEWIDTH" */,-135 , 52/* "EMPTYOUTTEXT" */,-135 , 53/* "BACKSPC" */,-135 , 51/* "PIPETEXT" */,-135 , 50/* "TEXT" */,-135 , 54/* "FONTNAME" */,-135 , 55/* "FONTSIZE" */,-135 , 56/* "FONTUNIT" */,-135 , 57/* "FONTSTYLE" */,-135 , 58/* "STROKETEXT" */,-135 , 59/* "FILLTEXT" */,-135 , 61/* "TEXTALIGN" */,-135 , 60/* "TEXTBASELINE" */,-135 , 16/* "]" */,-135 ),
	/* State 162 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 163 */ new Array( 14/* "}" */,-139 , 20/* "ROTATE" */,-139 , 21/* "FLIP" */,-139 , 26/* "XSHIFT" */,-139 , 27/* "YSHIFT" */,-139 , 35/* "SIZE" */,-139 , 36/* "SKEW" */,-139 , 48/* "GLOBALX" */,-139 , 49/* "GLOBALY" */,-139 , 22/* "HUE" */,-139 , 23/* "SATURATION" */,-139 , 24/* "BRIGHTNESS" */,-139 , 25/* "ALPHA" */,-139 , 37/* "TARGETHUE" */,-139 , 38/* "TARGETSATURATION" */,-139 , 39/* "TARGETBRIGHTNESS" */,-139 , 40/* "TARGETALPHA" */,-139 , 62/* "SHADOWOFFSETX" */,-139 , 63/* "SHADOWOFFSETY" */,-139 , 64/* "SHADOWBLUR" */,-139 , 65/* "SHADOWHUE" */,-139 , 67/* "SHADOWBRIGHTNESS" */,-139 , 66/* "SHADOWSATURATION" */,-139 , 68/* "SHADOWALPHA" */,-139 , 34/* "ZSHIFT" */,-139 , 42/* "PARAMETERS" */,-139 , 47/* "NONPATHSTROKEWIDTH" */,-139 , 43/* "STROKEWIDTH" */,-139 , 52/* "EMPTYOUTTEXT" */,-139 , 53/* "BACKSPC" */,-139 , 51/* "PIPETEXT" */,-139 , 50/* "TEXT" */,-139 , 54/* "FONTNAME" */,-139 , 55/* "FONTSIZE" */,-139 , 56/* "FONTUNIT" */,-139 , 57/* "FONTSTYLE" */,-139 , 58/* "STROKETEXT" */,-139 , 59/* "FILLTEXT" */,-139 , 61/* "TEXTALIGN" */,-139 , 60/* "TEXTBASELINE" */,-139 , 16/* "]" */,-139 ),
	/* State 164 */ new Array( 14/* "}" */,-140 , 20/* "ROTATE" */,-140 , 21/* "FLIP" */,-140 , 26/* "XSHIFT" */,-140 , 27/* "YSHIFT" */,-140 , 35/* "SIZE" */,-140 , 36/* "SKEW" */,-140 , 48/* "GLOBALX" */,-140 , 49/* "GLOBALY" */,-140 , 22/* "HUE" */,-140 , 23/* "SATURATION" */,-140 , 24/* "BRIGHTNESS" */,-140 , 25/* "ALPHA" */,-140 , 37/* "TARGETHUE" */,-140 , 38/* "TARGETSATURATION" */,-140 , 39/* "TARGETBRIGHTNESS" */,-140 , 40/* "TARGETALPHA" */,-140 , 62/* "SHADOWOFFSETX" */,-140 , 63/* "SHADOWOFFSETY" */,-140 , 64/* "SHADOWBLUR" */,-140 , 65/* "SHADOWHUE" */,-140 , 67/* "SHADOWBRIGHTNESS" */,-140 , 66/* "SHADOWSATURATION" */,-140 , 68/* "SHADOWALPHA" */,-140 , 34/* "ZSHIFT" */,-140 , 42/* "PARAMETERS" */,-140 , 47/* "NONPATHSTROKEWIDTH" */,-140 , 43/* "STROKEWIDTH" */,-140 , 52/* "EMPTYOUTTEXT" */,-140 , 53/* "BACKSPC" */,-140 , 51/* "PIPETEXT" */,-140 , 50/* "TEXT" */,-140 , 54/* "FONTNAME" */,-140 , 55/* "FONTSIZE" */,-140 , 56/* "FONTUNIT" */,-140 , 57/* "FONTSTYLE" */,-140 , 58/* "STROKETEXT" */,-140 , 59/* "FILLTEXT" */,-140 , 61/* "TEXTALIGN" */,-140 , 60/* "TEXTBASELINE" */,-140 , 16/* "]" */,-140 ),
	/* State 165 */ new Array( 14/* "}" */,-141 , 20/* "ROTATE" */,-141 , 21/* "FLIP" */,-141 , 26/* "XSHIFT" */,-141 , 27/* "YSHIFT" */,-141 , 35/* "SIZE" */,-141 , 36/* "SKEW" */,-141 , 48/* "GLOBALX" */,-141 , 49/* "GLOBALY" */,-141 , 22/* "HUE" */,-141 , 23/* "SATURATION" */,-141 , 24/* "BRIGHTNESS" */,-141 , 25/* "ALPHA" */,-141 , 37/* "TARGETHUE" */,-141 , 38/* "TARGETSATURATION" */,-141 , 39/* "TARGETBRIGHTNESS" */,-141 , 40/* "TARGETALPHA" */,-141 , 62/* "SHADOWOFFSETX" */,-141 , 63/* "SHADOWOFFSETY" */,-141 , 64/* "SHADOWBLUR" */,-141 , 65/* "SHADOWHUE" */,-141 , 67/* "SHADOWBRIGHTNESS" */,-141 , 66/* "SHADOWSATURATION" */,-141 , 68/* "SHADOWALPHA" */,-141 , 34/* "ZSHIFT" */,-141 , 42/* "PARAMETERS" */,-141 , 47/* "NONPATHSTROKEWIDTH" */,-141 , 43/* "STROKEWIDTH" */,-141 , 52/* "EMPTYOUTTEXT" */,-141 , 53/* "BACKSPC" */,-141 , 51/* "PIPETEXT" */,-141 , 50/* "TEXT" */,-141 , 54/* "FONTNAME" */,-141 , 55/* "FONTSIZE" */,-141 , 56/* "FONTUNIT" */,-141 , 57/* "FONTSTYLE" */,-141 , 58/* "STROKETEXT" */,-141 , 59/* "FILLTEXT" */,-141 , 61/* "TEXTALIGN" */,-141 , 60/* "TEXTBASELINE" */,-141 , 16/* "]" */,-141 ),
	/* State 166 */ new Array( 14/* "}" */,-142 , 20/* "ROTATE" */,-142 , 21/* "FLIP" */,-142 , 26/* "XSHIFT" */,-142 , 27/* "YSHIFT" */,-142 , 35/* "SIZE" */,-142 , 36/* "SKEW" */,-142 , 48/* "GLOBALX" */,-142 , 49/* "GLOBALY" */,-142 , 22/* "HUE" */,-142 , 23/* "SATURATION" */,-142 , 24/* "BRIGHTNESS" */,-142 , 25/* "ALPHA" */,-142 , 37/* "TARGETHUE" */,-142 , 38/* "TARGETSATURATION" */,-142 , 39/* "TARGETBRIGHTNESS" */,-142 , 40/* "TARGETALPHA" */,-142 , 62/* "SHADOWOFFSETX" */,-142 , 63/* "SHADOWOFFSETY" */,-142 , 64/* "SHADOWBLUR" */,-142 , 65/* "SHADOWHUE" */,-142 , 67/* "SHADOWBRIGHTNESS" */,-142 , 66/* "SHADOWSATURATION" */,-142 , 68/* "SHADOWALPHA" */,-142 , 34/* "ZSHIFT" */,-142 , 42/* "PARAMETERS" */,-142 , 47/* "NONPATHSTROKEWIDTH" */,-142 , 43/* "STROKEWIDTH" */,-142 , 52/* "EMPTYOUTTEXT" */,-142 , 53/* "BACKSPC" */,-142 , 51/* "PIPETEXT" */,-142 , 50/* "TEXT" */,-142 , 54/* "FONTNAME" */,-142 , 55/* "FONTSIZE" */,-142 , 56/* "FONTUNIT" */,-142 , 57/* "FONTSTYLE" */,-142 , 58/* "STROKETEXT" */,-142 , 59/* "FILLTEXT" */,-142 , 61/* "TEXTALIGN" */,-142 , 60/* "TEXTBASELINE" */,-142 , 16/* "]" */,-142 ),
	/* State 167 */ new Array( 14/* "}" */,-143 , 20/* "ROTATE" */,-143 , 21/* "FLIP" */,-143 , 26/* "XSHIFT" */,-143 , 27/* "YSHIFT" */,-143 , 35/* "SIZE" */,-143 , 36/* "SKEW" */,-143 , 48/* "GLOBALX" */,-143 , 49/* "GLOBALY" */,-143 , 22/* "HUE" */,-143 , 23/* "SATURATION" */,-143 , 24/* "BRIGHTNESS" */,-143 , 25/* "ALPHA" */,-143 , 37/* "TARGETHUE" */,-143 , 38/* "TARGETSATURATION" */,-143 , 39/* "TARGETBRIGHTNESS" */,-143 , 40/* "TARGETALPHA" */,-143 , 62/* "SHADOWOFFSETX" */,-143 , 63/* "SHADOWOFFSETY" */,-143 , 64/* "SHADOWBLUR" */,-143 , 65/* "SHADOWHUE" */,-143 , 67/* "SHADOWBRIGHTNESS" */,-143 , 66/* "SHADOWSATURATION" */,-143 , 68/* "SHADOWALPHA" */,-143 , 34/* "ZSHIFT" */,-143 , 42/* "PARAMETERS" */,-143 , 47/* "NONPATHSTROKEWIDTH" */,-143 , 43/* "STROKEWIDTH" */,-143 , 52/* "EMPTYOUTTEXT" */,-143 , 53/* "BACKSPC" */,-143 , 51/* "PIPETEXT" */,-143 , 50/* "TEXT" */,-143 , 54/* "FONTNAME" */,-143 , 55/* "FONTSIZE" */,-143 , 56/* "FONTUNIT" */,-143 , 57/* "FONTSTYLE" */,-143 , 58/* "STROKETEXT" */,-143 , 59/* "FILLTEXT" */,-143 , 61/* "TEXTALIGN" */,-143 , 60/* "TEXTBASELINE" */,-143 , 16/* "]" */,-143 ),
	/* State 168 */ new Array( 14/* "}" */,-144 , 20/* "ROTATE" */,-144 , 21/* "FLIP" */,-144 , 26/* "XSHIFT" */,-144 , 27/* "YSHIFT" */,-144 , 35/* "SIZE" */,-144 , 36/* "SKEW" */,-144 , 48/* "GLOBALX" */,-144 , 49/* "GLOBALY" */,-144 , 22/* "HUE" */,-144 , 23/* "SATURATION" */,-144 , 24/* "BRIGHTNESS" */,-144 , 25/* "ALPHA" */,-144 , 37/* "TARGETHUE" */,-144 , 38/* "TARGETSATURATION" */,-144 , 39/* "TARGETBRIGHTNESS" */,-144 , 40/* "TARGETALPHA" */,-144 , 62/* "SHADOWOFFSETX" */,-144 , 63/* "SHADOWOFFSETY" */,-144 , 64/* "SHADOWBLUR" */,-144 , 65/* "SHADOWHUE" */,-144 , 67/* "SHADOWBRIGHTNESS" */,-144 , 66/* "SHADOWSATURATION" */,-144 , 68/* "SHADOWALPHA" */,-144 , 34/* "ZSHIFT" */,-144 , 42/* "PARAMETERS" */,-144 , 47/* "NONPATHSTROKEWIDTH" */,-144 , 43/* "STROKEWIDTH" */,-144 , 52/* "EMPTYOUTTEXT" */,-144 , 53/* "BACKSPC" */,-144 , 51/* "PIPETEXT" */,-144 , 50/* "TEXT" */,-144 , 54/* "FONTNAME" */,-144 , 55/* "FONTSIZE" */,-144 , 56/* "FONTUNIT" */,-144 , 57/* "FONTSTYLE" */,-144 , 58/* "STROKETEXT" */,-144 , 59/* "FILLTEXT" */,-144 , 61/* "TEXTALIGN" */,-144 , 60/* "TEXTBASELINE" */,-144 , 16/* "]" */,-144 ),
	/* State 169 */ new Array( 14/* "}" */,-145 , 20/* "ROTATE" */,-145 , 21/* "FLIP" */,-145 , 26/* "XSHIFT" */,-145 , 27/* "YSHIFT" */,-145 , 35/* "SIZE" */,-145 , 36/* "SKEW" */,-145 , 48/* "GLOBALX" */,-145 , 49/* "GLOBALY" */,-145 , 22/* "HUE" */,-145 , 23/* "SATURATION" */,-145 , 24/* "BRIGHTNESS" */,-145 , 25/* "ALPHA" */,-145 , 37/* "TARGETHUE" */,-145 , 38/* "TARGETSATURATION" */,-145 , 39/* "TARGETBRIGHTNESS" */,-145 , 40/* "TARGETALPHA" */,-145 , 62/* "SHADOWOFFSETX" */,-145 , 63/* "SHADOWOFFSETY" */,-145 , 64/* "SHADOWBLUR" */,-145 , 65/* "SHADOWHUE" */,-145 , 67/* "SHADOWBRIGHTNESS" */,-145 , 66/* "SHADOWSATURATION" */,-145 , 68/* "SHADOWALPHA" */,-145 , 34/* "ZSHIFT" */,-145 , 42/* "PARAMETERS" */,-145 , 47/* "NONPATHSTROKEWIDTH" */,-145 , 43/* "STROKEWIDTH" */,-145 , 52/* "EMPTYOUTTEXT" */,-145 , 53/* "BACKSPC" */,-145 , 51/* "PIPETEXT" */,-145 , 50/* "TEXT" */,-145 , 54/* "FONTNAME" */,-145 , 55/* "FONTSIZE" */,-145 , 56/* "FONTUNIT" */,-145 , 57/* "FONTSTYLE" */,-145 , 58/* "STROKETEXT" */,-145 , 59/* "FILLTEXT" */,-145 , 61/* "TEXTALIGN" */,-145 , 60/* "TEXTBASELINE" */,-145 , 16/* "]" */,-145 ),
	/* State 170 */ new Array( 14/* "}" */,-146 , 20/* "ROTATE" */,-146 , 21/* "FLIP" */,-146 , 26/* "XSHIFT" */,-146 , 27/* "YSHIFT" */,-146 , 35/* "SIZE" */,-146 , 36/* "SKEW" */,-146 , 48/* "GLOBALX" */,-146 , 49/* "GLOBALY" */,-146 , 22/* "HUE" */,-146 , 23/* "SATURATION" */,-146 , 24/* "BRIGHTNESS" */,-146 , 25/* "ALPHA" */,-146 , 37/* "TARGETHUE" */,-146 , 38/* "TARGETSATURATION" */,-146 , 39/* "TARGETBRIGHTNESS" */,-146 , 40/* "TARGETALPHA" */,-146 , 62/* "SHADOWOFFSETX" */,-146 , 63/* "SHADOWOFFSETY" */,-146 , 64/* "SHADOWBLUR" */,-146 , 65/* "SHADOWHUE" */,-146 , 67/* "SHADOWBRIGHTNESS" */,-146 , 66/* "SHADOWSATURATION" */,-146 , 68/* "SHADOWALPHA" */,-146 , 34/* "ZSHIFT" */,-146 , 42/* "PARAMETERS" */,-146 , 47/* "NONPATHSTROKEWIDTH" */,-146 , 43/* "STROKEWIDTH" */,-146 , 52/* "EMPTYOUTTEXT" */,-146 , 53/* "BACKSPC" */,-146 , 51/* "PIPETEXT" */,-146 , 50/* "TEXT" */,-146 , 54/* "FONTNAME" */,-146 , 55/* "FONTSIZE" */,-146 , 56/* "FONTUNIT" */,-146 , 57/* "FONTSTYLE" */,-146 , 58/* "STROKETEXT" */,-146 , 59/* "FILLTEXT" */,-146 , 61/* "TEXTALIGN" */,-146 , 60/* "TEXTBASELINE" */,-146 , 16/* "]" */,-146 ),
	/* State 171 */ new Array( 14/* "}" */,-147 , 20/* "ROTATE" */,-147 , 21/* "FLIP" */,-147 , 26/* "XSHIFT" */,-147 , 27/* "YSHIFT" */,-147 , 35/* "SIZE" */,-147 , 36/* "SKEW" */,-147 , 48/* "GLOBALX" */,-147 , 49/* "GLOBALY" */,-147 , 22/* "HUE" */,-147 , 23/* "SATURATION" */,-147 , 24/* "BRIGHTNESS" */,-147 , 25/* "ALPHA" */,-147 , 37/* "TARGETHUE" */,-147 , 38/* "TARGETSATURATION" */,-147 , 39/* "TARGETBRIGHTNESS" */,-147 , 40/* "TARGETALPHA" */,-147 , 62/* "SHADOWOFFSETX" */,-147 , 63/* "SHADOWOFFSETY" */,-147 , 64/* "SHADOWBLUR" */,-147 , 65/* "SHADOWHUE" */,-147 , 67/* "SHADOWBRIGHTNESS" */,-147 , 66/* "SHADOWSATURATION" */,-147 , 68/* "SHADOWALPHA" */,-147 , 34/* "ZSHIFT" */,-147 , 42/* "PARAMETERS" */,-147 , 47/* "NONPATHSTROKEWIDTH" */,-147 , 43/* "STROKEWIDTH" */,-147 , 52/* "EMPTYOUTTEXT" */,-147 , 53/* "BACKSPC" */,-147 , 51/* "PIPETEXT" */,-147 , 50/* "TEXT" */,-147 , 54/* "FONTNAME" */,-147 , 55/* "FONTSIZE" */,-147 , 56/* "FONTUNIT" */,-147 , 57/* "FONTSTYLE" */,-147 , 58/* "STROKETEXT" */,-147 , 59/* "FILLTEXT" */,-147 , 61/* "TEXTALIGN" */,-147 , 60/* "TEXTBASELINE" */,-147 , 16/* "]" */,-147 ),
	/* State 172 */ new Array( 14/* "}" */,-83 , 71/* "STRING" */,-83 , 20/* "ROTATE" */,-83 , 21/* "FLIP" */,-83 , 22/* "HUE" */,-83 , 23/* "SATURATION" */,-83 , 24/* "BRIGHTNESS" */,-83 , 25/* "ALPHA" */,-83 , 26/* "XSHIFT" */,-83 , 27/* "YSHIFT" */,-83 , 28/* "XCTRL1" */,-83 , 29/* "YCTRL1" */,-83 , 30/* "XRADIUS" */,-83 , 31/* "YRADIUS" */,-83 , 32/* "XCTRL2" */,-83 , 33/* "YCTRL2" */,-83 , 34/* "ZSHIFT" */,-83 , 35/* "SIZE" */,-83 , 36/* "SKEW" */,-83 , 42/* "PARAMETERS" */,-83 , 43/* "STROKEWIDTH" */,-83 , 47/* "NONPATHSTROKEWIDTH" */,-83 , 46/* "TILEDIM" */,-83 , 50/* "TEXT" */,-83 , 52/* "EMPTYOUTTEXT" */,-83 , 53/* "BACKSPC" */,-83 , 54/* "FONTNAME" */,-83 , 55/* "FONTSIZE" */,-83 , 56/* "FONTUNIT" */,-83 , 57/* "FONTSTYLE" */,-83 , 58/* "STROKETEXT" */,-83 , 59/* "FILLTEXT" */,-83 , 60/* "TEXTBASELINE" */,-83 , 61/* "TEXTALIGN" */,-83 , 48/* "GLOBALX" */,-83 , 49/* "GLOBALY" */,-83 , 62/* "SHADOWOFFSETX" */,-83 , 63/* "SHADOWOFFSETY" */,-83 , 64/* "SHADOWBLUR" */,-83 , 65/* "SHADOWHUE" */,-83 , 66/* "SHADOWSATURATION" */,-83 , 67/* "SHADOWBRIGHTNESS" */,-83 , 68/* "SHADOWALPHA" */,-83 , 70/* "RATIONAL" */,-83 ),
	/* State 173 */ new Array( 109/* "$" */,-16 , 7/* "STARTSHAPE" */,-16 , 8/* "BACKGROUND" */,-16 , 9/* "INCLUDE" */,-16 , 10/* "TILE" */,-16 , 35/* "SIZE" */,-16 , 11/* "RULE" */,-16 , 12/* "PATH" */,-16 ),
	/* State 174 */ new Array( 13/* "{" */,64 , 15/* "[" */,65 ),
	/* State 175 */ new Array( 3/* "*" */,200 ),
	/* State 176 */ new Array( 14/* "}" */,201 , 70/* "RATIONAL" */,175 , 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 177 */ new Array( 14/* "}" */,-64 , 69/* "PATHOP" */,-64 , 70/* "RATIONAL" */,-64 , 71/* "STRING" */,-64 ),
	/* State 178 */ new Array( 109/* "$" */,-18 , 7/* "STARTSHAPE" */,-18 , 8/* "BACKGROUND" */,-18 , 9/* "INCLUDE" */,-18 , 10/* "TILE" */,-18 , 35/* "SIZE" */,-18 , 11/* "RULE" */,-18 , 12/* "PATH" */,-18 ),
	/* State 179 */ new Array( 13/* "{" */,202 ),
	/* State 180 */ new Array( 3/* "*" */,203 ),
	/* State 181 */ new Array( 13/* "{" */,205 , 15/* "[" */,206 ),
	/* State 182 */ new Array( 14/* "}" */,-152 , 22/* "HUE" */,-152 , 23/* "SATURATION" */,-152 , 24/* "BRIGHTNESS" */,-152 , 25/* "ALPHA" */,-152 , 37/* "TARGETHUE" */,-152 , 38/* "TARGETSATURATION" */,-152 , 39/* "TARGETBRIGHTNESS" */,-152 , 40/* "TARGETALPHA" */,-152 , 20/* "ROTATE" */,-152 , 21/* "FLIP" */,-152 , 26/* "XSHIFT" */,-152 , 27/* "YSHIFT" */,-152 , 35/* "SIZE" */,-152 , 36/* "SKEW" */,-152 , 48/* "GLOBALX" */,-152 , 49/* "GLOBALY" */,-152 , 62/* "SHADOWOFFSETX" */,-152 , 63/* "SHADOWOFFSETY" */,-152 , 64/* "SHADOWBLUR" */,-152 , 65/* "SHADOWHUE" */,-152 , 67/* "SHADOWBRIGHTNESS" */,-152 , 66/* "SHADOWSATURATION" */,-152 , 68/* "SHADOWALPHA" */,-152 , 34/* "ZSHIFT" */,-152 , 42/* "PARAMETERS" */,-152 , 47/* "NONPATHSTROKEWIDTH" */,-152 , 43/* "STROKEWIDTH" */,-152 , 52/* "EMPTYOUTTEXT" */,-152 , 53/* "BACKSPC" */,-152 , 51/* "PIPETEXT" */,-152 , 50/* "TEXT" */,-152 , 54/* "FONTNAME" */,-152 , 55/* "FONTSIZE" */,-152 , 56/* "FONTUNIT" */,-152 , 57/* "FONTSTYLE" */,-152 , 58/* "STROKETEXT" */,-152 , 59/* "FILLTEXT" */,-152 , 61/* "TEXTALIGN" */,-152 , 60/* "TEXTBASELINE" */,-152 , 16/* "]" */,-152 ),
	/* State 183 */ new Array( 14/* "}" */,-161 , 22/* "HUE" */,-161 , 23/* "SATURATION" */,-161 , 24/* "BRIGHTNESS" */,-161 , 25/* "ALPHA" */,-161 , 37/* "TARGETHUE" */,-161 , 38/* "TARGETSATURATION" */,-161 , 39/* "TARGETBRIGHTNESS" */,-161 , 40/* "TARGETALPHA" */,-161 , 20/* "ROTATE" */,-161 , 21/* "FLIP" */,-161 , 26/* "XSHIFT" */,-161 , 27/* "YSHIFT" */,-161 , 35/* "SIZE" */,-161 , 36/* "SKEW" */,-161 , 48/* "GLOBALX" */,-161 , 49/* "GLOBALY" */,-161 , 62/* "SHADOWOFFSETX" */,-161 , 63/* "SHADOWOFFSETY" */,-161 , 64/* "SHADOWBLUR" */,-161 , 65/* "SHADOWHUE" */,-161 , 67/* "SHADOWBRIGHTNESS" */,-161 , 66/* "SHADOWSATURATION" */,-161 , 68/* "SHADOWALPHA" */,-161 , 34/* "ZSHIFT" */,-161 , 42/* "PARAMETERS" */,-161 , 47/* "NONPATHSTROKEWIDTH" */,-161 , 43/* "STROKEWIDTH" */,-161 , 52/* "EMPTYOUTTEXT" */,-161 , 53/* "BACKSPC" */,-161 , 51/* "PIPETEXT" */,-161 , 50/* "TEXT" */,-161 , 54/* "FONTNAME" */,-161 , 55/* "FONTSIZE" */,-161 , 56/* "FONTUNIT" */,-161 , 57/* "FONTSTYLE" */,-161 , 58/* "STROKETEXT" */,-161 , 59/* "FILLTEXT" */,-161 , 61/* "TEXTALIGN" */,-161 , 60/* "TEXTBASELINE" */,-161 , 16/* "]" */,-161 , 41/* "|" */,-161 , 70/* "RATIONAL" */,-161 , 1/* "-" */,-161 , 2/* "+" */,-161 , 17/* "(" */,-161 , 71/* "STRING" */,-161 , 28/* "XCTRL1" */,-161 , 32/* "XCTRL2" */,-161 , 29/* "YCTRL1" */,-161 , 33/* "YCTRL2" */,-161 , 30/* "XRADIUS" */,-161 , 31/* "YRADIUS" */,-161 ),
	/* State 184 */ new Array( 14/* "}" */,-162 , 22/* "HUE" */,-162 , 23/* "SATURATION" */,-162 , 24/* "BRIGHTNESS" */,-162 , 25/* "ALPHA" */,-162 , 37/* "TARGETHUE" */,-162 , 38/* "TARGETSATURATION" */,-162 , 39/* "TARGETBRIGHTNESS" */,-162 , 40/* "TARGETALPHA" */,-162 , 20/* "ROTATE" */,-162 , 21/* "FLIP" */,-162 , 26/* "XSHIFT" */,-162 , 27/* "YSHIFT" */,-162 , 35/* "SIZE" */,-162 , 36/* "SKEW" */,-162 , 48/* "GLOBALX" */,-162 , 49/* "GLOBALY" */,-162 , 62/* "SHADOWOFFSETX" */,-162 , 63/* "SHADOWOFFSETY" */,-162 , 64/* "SHADOWBLUR" */,-162 , 65/* "SHADOWHUE" */,-162 , 67/* "SHADOWBRIGHTNESS" */,-162 , 66/* "SHADOWSATURATION" */,-162 , 68/* "SHADOWALPHA" */,-162 , 34/* "ZSHIFT" */,-162 , 42/* "PARAMETERS" */,-162 , 47/* "NONPATHSTROKEWIDTH" */,-162 , 43/* "STROKEWIDTH" */,-162 , 52/* "EMPTYOUTTEXT" */,-162 , 53/* "BACKSPC" */,-162 , 51/* "PIPETEXT" */,-162 , 50/* "TEXT" */,-162 , 54/* "FONTNAME" */,-162 , 55/* "FONTSIZE" */,-162 , 56/* "FONTUNIT" */,-162 , 57/* "FONTSTYLE" */,-162 , 58/* "STROKETEXT" */,-162 , 59/* "FILLTEXT" */,-162 , 61/* "TEXTALIGN" */,-162 , 60/* "TEXTBASELINE" */,-162 , 16/* "]" */,-162 , 41/* "|" */,-162 , 70/* "RATIONAL" */,-162 , 1/* "-" */,-162 , 2/* "+" */,-162 , 17/* "(" */,-162 , 71/* "STRING" */,-162 , 28/* "XCTRL1" */,-162 , 32/* "XCTRL2" */,-162 , 29/* "YCTRL1" */,-162 , 33/* "YCTRL2" */,-162 , 30/* "XRADIUS" */,-162 , 31/* "YRADIUS" */,-162 ),
	/* State 185 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,210 , 2/* "+" */,211 , 18/* ")" */,212 ),
	/* State 186 */ new Array( 18/* ")" */,-167 , 2/* "+" */,-167 , 1/* "-" */,-167 , 3/* "*" */,-167 , 4/* "/" */,-167 , 5/* "^" */,-167 , 19/* "," */,-167 ),
	/* State 187 */ new Array( 17/* "(" */,213 ),
	/* State 188 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 189 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 190 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 191 */ new Array( 18/* ")" */,217 , 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 192 */ new Array( 14/* "}" */,-153 , 22/* "HUE" */,-153 , 23/* "SATURATION" */,-153 , 24/* "BRIGHTNESS" */,-153 , 25/* "ALPHA" */,-153 , 37/* "TARGETHUE" */,-153 , 38/* "TARGETSATURATION" */,-153 , 39/* "TARGETBRIGHTNESS" */,-153 , 40/* "TARGETALPHA" */,-153 , 20/* "ROTATE" */,-153 , 21/* "FLIP" */,-153 , 26/* "XSHIFT" */,-153 , 27/* "YSHIFT" */,-153 , 35/* "SIZE" */,-153 , 36/* "SKEW" */,-153 , 48/* "GLOBALX" */,-153 , 49/* "GLOBALY" */,-153 , 62/* "SHADOWOFFSETX" */,-153 , 63/* "SHADOWOFFSETY" */,-153 , 64/* "SHADOWBLUR" */,-153 , 65/* "SHADOWHUE" */,-153 , 67/* "SHADOWBRIGHTNESS" */,-153 , 66/* "SHADOWSATURATION" */,-153 , 68/* "SHADOWALPHA" */,-153 , 34/* "ZSHIFT" */,-153 , 42/* "PARAMETERS" */,-153 , 47/* "NONPATHSTROKEWIDTH" */,-153 , 43/* "STROKEWIDTH" */,-153 , 52/* "EMPTYOUTTEXT" */,-153 , 53/* "BACKSPC" */,-153 , 51/* "PIPETEXT" */,-153 , 50/* "TEXT" */,-153 , 54/* "FONTNAME" */,-153 , 55/* "FONTSIZE" */,-153 , 56/* "FONTUNIT" */,-153 , 57/* "FONTSTYLE" */,-153 , 58/* "STROKETEXT" */,-153 , 59/* "FILLTEXT" */,-153 , 61/* "TEXTALIGN" */,-153 , 60/* "TEXTBASELINE" */,-153 , 16/* "]" */,-153 ),
	/* State 193 */ new Array( 14/* "}" */,-154 , 22/* "HUE" */,-154 , 23/* "SATURATION" */,-154 , 24/* "BRIGHTNESS" */,-154 , 25/* "ALPHA" */,-154 , 37/* "TARGETHUE" */,-154 , 38/* "TARGETSATURATION" */,-154 , 39/* "TARGETBRIGHTNESS" */,-154 , 40/* "TARGETALPHA" */,-154 , 20/* "ROTATE" */,-154 , 21/* "FLIP" */,-154 , 26/* "XSHIFT" */,-154 , 27/* "YSHIFT" */,-154 , 35/* "SIZE" */,-154 , 36/* "SKEW" */,-154 , 48/* "GLOBALX" */,-154 , 49/* "GLOBALY" */,-154 , 62/* "SHADOWOFFSETX" */,-154 , 63/* "SHADOWOFFSETY" */,-154 , 64/* "SHADOWBLUR" */,-154 , 65/* "SHADOWHUE" */,-154 , 67/* "SHADOWBRIGHTNESS" */,-154 , 66/* "SHADOWSATURATION" */,-154 , 68/* "SHADOWALPHA" */,-154 , 34/* "ZSHIFT" */,-154 , 42/* "PARAMETERS" */,-154 , 47/* "NONPATHSTROKEWIDTH" */,-154 , 43/* "STROKEWIDTH" */,-154 , 52/* "EMPTYOUTTEXT" */,-154 , 53/* "BACKSPC" */,-154 , 51/* "PIPETEXT" */,-154 , 50/* "TEXT" */,-154 , 54/* "FONTNAME" */,-154 , 55/* "FONTSIZE" */,-154 , 56/* "FONTUNIT" */,-154 , 57/* "FONTSTYLE" */,-154 , 58/* "STROKETEXT" */,-154 , 59/* "FILLTEXT" */,-154 , 61/* "TEXTALIGN" */,-154 , 60/* "TEXTBASELINE" */,-154 , 16/* "]" */,-154 ),
	/* State 194 */ new Array( 14/* "}" */,-155 , 22/* "HUE" */,-155 , 23/* "SATURATION" */,-155 , 24/* "BRIGHTNESS" */,-155 , 25/* "ALPHA" */,-155 , 37/* "TARGETHUE" */,-155 , 38/* "TARGETSATURATION" */,-155 , 39/* "TARGETBRIGHTNESS" */,-155 , 40/* "TARGETALPHA" */,-155 , 20/* "ROTATE" */,-155 , 21/* "FLIP" */,-155 , 26/* "XSHIFT" */,-155 , 27/* "YSHIFT" */,-155 , 35/* "SIZE" */,-155 , 36/* "SKEW" */,-155 , 48/* "GLOBALX" */,-155 , 49/* "GLOBALY" */,-155 , 62/* "SHADOWOFFSETX" */,-155 , 63/* "SHADOWOFFSETY" */,-155 , 64/* "SHADOWBLUR" */,-155 , 65/* "SHADOWHUE" */,-155 , 67/* "SHADOWBRIGHTNESS" */,-155 , 66/* "SHADOWSATURATION" */,-155 , 68/* "SHADOWALPHA" */,-155 , 34/* "ZSHIFT" */,-155 , 42/* "PARAMETERS" */,-155 , 47/* "NONPATHSTROKEWIDTH" */,-155 , 43/* "STROKEWIDTH" */,-155 , 52/* "EMPTYOUTTEXT" */,-155 , 53/* "BACKSPC" */,-155 , 51/* "PIPETEXT" */,-155 , 50/* "TEXT" */,-155 , 54/* "FONTNAME" */,-155 , 55/* "FONTSIZE" */,-155 , 56/* "FONTUNIT" */,-155 , 57/* "FONTSTYLE" */,-155 , 58/* "STROKETEXT" */,-155 , 59/* "FILLTEXT" */,-155 , 61/* "TEXTALIGN" */,-155 , 60/* "TEXTBASELINE" */,-155 , 16/* "]" */,-155 ),
	/* State 195 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 , 14/* "}" */,-137 , 20/* "ROTATE" */,-137 , 21/* "FLIP" */,-137 , 26/* "XSHIFT" */,-137 , 27/* "YSHIFT" */,-137 , 35/* "SIZE" */,-137 , 36/* "SKEW" */,-137 , 48/* "GLOBALX" */,-137 , 49/* "GLOBALY" */,-137 , 22/* "HUE" */,-137 , 23/* "SATURATION" */,-137 , 24/* "BRIGHTNESS" */,-137 , 25/* "ALPHA" */,-137 , 37/* "TARGETHUE" */,-137 , 38/* "TARGETSATURATION" */,-137 , 39/* "TARGETBRIGHTNESS" */,-137 , 40/* "TARGETALPHA" */,-137 , 62/* "SHADOWOFFSETX" */,-137 , 63/* "SHADOWOFFSETY" */,-137 , 64/* "SHADOWBLUR" */,-137 , 65/* "SHADOWHUE" */,-137 , 67/* "SHADOWBRIGHTNESS" */,-137 , 66/* "SHADOWSATURATION" */,-137 , 68/* "SHADOWALPHA" */,-137 , 34/* "ZSHIFT" */,-137 , 42/* "PARAMETERS" */,-137 , 47/* "NONPATHSTROKEWIDTH" */,-137 , 43/* "STROKEWIDTH" */,-137 , 52/* "EMPTYOUTTEXT" */,-137 , 53/* "BACKSPC" */,-137 , 51/* "PIPETEXT" */,-137 , 50/* "TEXT" */,-137 , 54/* "FONTNAME" */,-137 , 55/* "FONTSIZE" */,-137 , 56/* "FONTUNIT" */,-137 , 57/* "FONTSTYLE" */,-137 , 58/* "STROKETEXT" */,-137 , 59/* "FILLTEXT" */,-137 , 61/* "TEXTALIGN" */,-137 , 60/* "TEXTBASELINE" */,-137 , 16/* "]" */,-137 ),
	/* State 196 */ new Array( 14/* "}" */,-128 , 20/* "ROTATE" */,-128 , 21/* "FLIP" */,-128 , 26/* "XSHIFT" */,-128 , 27/* "YSHIFT" */,-128 , 35/* "SIZE" */,-128 , 36/* "SKEW" */,-128 , 48/* "GLOBALX" */,-128 , 49/* "GLOBALY" */,-128 , 22/* "HUE" */,-128 , 23/* "SATURATION" */,-128 , 24/* "BRIGHTNESS" */,-128 , 25/* "ALPHA" */,-128 , 37/* "TARGETHUE" */,-128 , 38/* "TARGETSATURATION" */,-128 , 39/* "TARGETBRIGHTNESS" */,-128 , 40/* "TARGETALPHA" */,-128 , 62/* "SHADOWOFFSETX" */,-128 , 63/* "SHADOWOFFSETY" */,-128 , 64/* "SHADOWBLUR" */,-128 , 65/* "SHADOWHUE" */,-128 , 67/* "SHADOWBRIGHTNESS" */,-128 , 66/* "SHADOWSATURATION" */,-128 , 68/* "SHADOWALPHA" */,-128 , 34/* "ZSHIFT" */,-128 , 42/* "PARAMETERS" */,-128 , 47/* "NONPATHSTROKEWIDTH" */,-128 , 43/* "STROKEWIDTH" */,-128 , 52/* "EMPTYOUTTEXT" */,-128 , 53/* "BACKSPC" */,-128 , 51/* "PIPETEXT" */,-128 , 50/* "TEXT" */,-128 , 54/* "FONTNAME" */,-128 , 55/* "FONTSIZE" */,-128 , 56/* "FONTUNIT" */,-128 , 57/* "FONTSTYLE" */,-128 , 58/* "STROKETEXT" */,-128 , 59/* "FILLTEXT" */,-128 , 61/* "TEXTALIGN" */,-128 , 60/* "TEXTBASELINE" */,-128 , 16/* "]" */,-128 ),
	/* State 197 */ new Array( 14/* "}" */,-129 , 20/* "ROTATE" */,-129 , 21/* "FLIP" */,-129 , 26/* "XSHIFT" */,-129 , 27/* "YSHIFT" */,-129 , 35/* "SIZE" */,-129 , 36/* "SKEW" */,-129 , 48/* "GLOBALX" */,-129 , 49/* "GLOBALY" */,-129 , 22/* "HUE" */,-129 , 23/* "SATURATION" */,-129 , 24/* "BRIGHTNESS" */,-129 , 25/* "ALPHA" */,-129 , 37/* "TARGETHUE" */,-129 , 38/* "TARGETSATURATION" */,-129 , 39/* "TARGETBRIGHTNESS" */,-129 , 40/* "TARGETALPHA" */,-129 , 62/* "SHADOWOFFSETX" */,-129 , 63/* "SHADOWOFFSETY" */,-129 , 64/* "SHADOWBLUR" */,-129 , 65/* "SHADOWHUE" */,-129 , 67/* "SHADOWBRIGHTNESS" */,-129 , 66/* "SHADOWSATURATION" */,-129 , 68/* "SHADOWALPHA" */,-129 , 34/* "ZSHIFT" */,-129 , 42/* "PARAMETERS" */,-129 , 47/* "NONPATHSTROKEWIDTH" */,-129 , 43/* "STROKEWIDTH" */,-129 , 52/* "EMPTYOUTTEXT" */,-129 , 53/* "BACKSPC" */,-129 , 51/* "PIPETEXT" */,-129 , 50/* "TEXT" */,-129 , 54/* "FONTNAME" */,-129 , 55/* "FONTSIZE" */,-129 , 56/* "FONTUNIT" */,-129 , 57/* "FONTSTYLE" */,-129 , 58/* "STROKETEXT" */,-129 , 59/* "FILLTEXT" */,-129 , 61/* "TEXTALIGN" */,-129 , 60/* "TEXTBASELINE" */,-129 , 16/* "]" */,-129 ),
	/* State 198 */ new Array( 14/* "}" */,-138 , 20/* "ROTATE" */,-138 , 21/* "FLIP" */,-138 , 26/* "XSHIFT" */,-138 , 27/* "YSHIFT" */,-138 , 35/* "SIZE" */,-138 , 36/* "SKEW" */,-138 , 48/* "GLOBALX" */,-138 , 49/* "GLOBALY" */,-138 , 22/* "HUE" */,-138 , 23/* "SATURATION" */,-138 , 24/* "BRIGHTNESS" */,-138 , 25/* "ALPHA" */,-138 , 37/* "TARGETHUE" */,-138 , 38/* "TARGETSATURATION" */,-138 , 39/* "TARGETBRIGHTNESS" */,-138 , 40/* "TARGETALPHA" */,-138 , 62/* "SHADOWOFFSETX" */,-138 , 63/* "SHADOWOFFSETY" */,-138 , 64/* "SHADOWBLUR" */,-138 , 65/* "SHADOWHUE" */,-138 , 67/* "SHADOWBRIGHTNESS" */,-138 , 66/* "SHADOWSATURATION" */,-138 , 68/* "SHADOWALPHA" */,-138 , 34/* "ZSHIFT" */,-138 , 42/* "PARAMETERS" */,-138 , 47/* "NONPATHSTROKEWIDTH" */,-138 , 43/* "STROKEWIDTH" */,-138 , 52/* "EMPTYOUTTEXT" */,-138 , 53/* "BACKSPC" */,-138 , 51/* "PIPETEXT" */,-138 , 50/* "TEXT" */,-138 , 54/* "FONTNAME" */,-138 , 55/* "FONTSIZE" */,-138 , 56/* "FONTUNIT" */,-138 , 57/* "FONTSTYLE" */,-138 , 58/* "STROKETEXT" */,-138 , 59/* "FILLTEXT" */,-138 , 61/* "TEXTALIGN" */,-138 , 60/* "TEXTBASELINE" */,-138 , 16/* "]" */,-138 ),
	/* State 199 */ new Array( 14/* "}" */,-85 , 71/* "STRING" */,-85 , 20/* "ROTATE" */,-85 , 21/* "FLIP" */,-85 , 22/* "HUE" */,-85 , 23/* "SATURATION" */,-85 , 24/* "BRIGHTNESS" */,-85 , 25/* "ALPHA" */,-85 , 26/* "XSHIFT" */,-85 , 27/* "YSHIFT" */,-85 , 28/* "XCTRL1" */,-85 , 29/* "YCTRL1" */,-85 , 30/* "XRADIUS" */,-85 , 31/* "YRADIUS" */,-85 , 32/* "XCTRL2" */,-85 , 33/* "YCTRL2" */,-85 , 34/* "ZSHIFT" */,-85 , 35/* "SIZE" */,-85 , 36/* "SKEW" */,-85 , 42/* "PARAMETERS" */,-85 , 43/* "STROKEWIDTH" */,-85 , 47/* "NONPATHSTROKEWIDTH" */,-85 , 46/* "TILEDIM" */,-85 , 50/* "TEXT" */,-85 , 52/* "EMPTYOUTTEXT" */,-85 , 53/* "BACKSPC" */,-85 , 54/* "FONTNAME" */,-85 , 55/* "FONTSIZE" */,-85 , 56/* "FONTUNIT" */,-85 , 57/* "FONTSTYLE" */,-85 , 58/* "STROKETEXT" */,-85 , 59/* "FILLTEXT" */,-85 , 60/* "TEXTBASELINE" */,-85 , 61/* "TEXTALIGN" */,-85 , 48/* "GLOBALX" */,-85 , 49/* "GLOBALY" */,-85 , 62/* "SHADOWOFFSETX" */,-85 , 63/* "SHADOWOFFSETY" */,-85 , 64/* "SHADOWBLUR" */,-85 , 65/* "SHADOWHUE" */,-85 , 66/* "SHADOWSATURATION" */,-85 , 67/* "SHADOWBRIGHTNESS" */,-85 , 68/* "SHADOWALPHA" */,-85 , 70/* "RATIONAL" */,-85 ),
	/* State 200 */ new Array( 13/* "{" */,64 , 15/* "[" */,65 ),
	/* State 201 */ new Array( 109/* "$" */,-17 , 7/* "STARTSHAPE" */,-17 , 8/* "BACKGROUND" */,-17 , 9/* "INCLUDE" */,-17 , 10/* "TILE" */,-17 , 35/* "SIZE" */,-17 , 11/* "RULE" */,-17 , 12/* "PATH" */,-17 ),
	/* State 202 */ new Array( 14/* "}" */,-72 , 26/* "XSHIFT" */,-72 , 28/* "XCTRL1" */,-72 , 32/* "XCTRL2" */,-72 , 27/* "YSHIFT" */,-72 , 29/* "YCTRL1" */,-72 , 33/* "YCTRL2" */,-72 , 30/* "XRADIUS" */,-72 , 31/* "YRADIUS" */,-72 , 20/* "ROTATE" */,-72 , 42/* "PARAMETERS" */,-72 ),
	/* State 203 */ new Array( 13/* "{" */,205 , 15/* "[" */,206 ),
	/* State 204 */ new Array( 14/* "}" */,-69 , 69/* "PATHOP" */,-69 , 70/* "RATIONAL" */,-69 , 71/* "STRING" */,-69 ),
	/* State 205 */ new Array( 14/* "}" */,-93 , 42/* "PARAMETERS" */,-93 , 43/* "STROKEWIDTH" */,-93 , 34/* "ZSHIFT" */,-93 , 35/* "SIZE" */,-93 , 20/* "ROTATE" */,-93 , 21/* "FLIP" */,-93 , 26/* "XSHIFT" */,-93 , 27/* "YSHIFT" */,-93 , 36/* "SKEW" */,-93 , 48/* "GLOBALX" */,-93 , 49/* "GLOBALY" */,-93 , 22/* "HUE" */,-93 , 23/* "SATURATION" */,-93 , 24/* "BRIGHTNESS" */,-93 , 25/* "ALPHA" */,-93 , 37/* "TARGETHUE" */,-93 , 38/* "TARGETSATURATION" */,-93 , 39/* "TARGETBRIGHTNESS" */,-93 , 40/* "TARGETALPHA" */,-93 , 62/* "SHADOWOFFSETX" */,-93 , 63/* "SHADOWOFFSETY" */,-93 , 64/* "SHADOWBLUR" */,-93 , 65/* "SHADOWHUE" */,-93 , 67/* "SHADOWBRIGHTNESS" */,-93 , 66/* "SHADOWSATURATION" */,-93 , 68/* "SHADOWALPHA" */,-93 ),
	/* State 206 */ new Array( 16/* "]" */,-93 , 42/* "PARAMETERS" */,-93 , 43/* "STROKEWIDTH" */,-93 , 34/* "ZSHIFT" */,-93 , 35/* "SIZE" */,-93 , 20/* "ROTATE" */,-93 , 21/* "FLIP" */,-93 , 26/* "XSHIFT" */,-93 , 27/* "YSHIFT" */,-93 , 36/* "SKEW" */,-93 , 48/* "GLOBALX" */,-93 , 49/* "GLOBALY" */,-93 , 22/* "HUE" */,-93 , 23/* "SATURATION" */,-93 , 24/* "BRIGHTNESS" */,-93 , 25/* "ALPHA" */,-93 , 37/* "TARGETHUE" */,-93 , 38/* "TARGETSATURATION" */,-93 , 39/* "TARGETBRIGHTNESS" */,-93 , 40/* "TARGETALPHA" */,-93 , 62/* "SHADOWOFFSETX" */,-93 , 63/* "SHADOWOFFSETY" */,-93 , 64/* "SHADOWBLUR" */,-93 , 65/* "SHADOWHUE" */,-93 , 67/* "SHADOWBRIGHTNESS" */,-93 , 66/* "SHADOWSATURATION" */,-93 , 68/* "SHADOWALPHA" */,-93 ),
	/* State 207 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 208 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 209 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 210 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 211 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 212 */ new Array( 14/* "}" */,-163 , 22/* "HUE" */,-163 , 23/* "SATURATION" */,-163 , 24/* "BRIGHTNESS" */,-163 , 25/* "ALPHA" */,-163 , 37/* "TARGETHUE" */,-163 , 38/* "TARGETSATURATION" */,-163 , 39/* "TARGETBRIGHTNESS" */,-163 , 40/* "TARGETALPHA" */,-163 , 20/* "ROTATE" */,-163 , 21/* "FLIP" */,-163 , 26/* "XSHIFT" */,-163 , 27/* "YSHIFT" */,-163 , 35/* "SIZE" */,-163 , 36/* "SKEW" */,-163 , 48/* "GLOBALX" */,-163 , 49/* "GLOBALY" */,-163 , 62/* "SHADOWOFFSETX" */,-163 , 63/* "SHADOWOFFSETY" */,-163 , 64/* "SHADOWBLUR" */,-163 , 65/* "SHADOWHUE" */,-163 , 67/* "SHADOWBRIGHTNESS" */,-163 , 66/* "SHADOWSATURATION" */,-163 , 68/* "SHADOWALPHA" */,-163 , 34/* "ZSHIFT" */,-163 , 42/* "PARAMETERS" */,-163 , 47/* "NONPATHSTROKEWIDTH" */,-163 , 43/* "STROKEWIDTH" */,-163 , 52/* "EMPTYOUTTEXT" */,-163 , 53/* "BACKSPC" */,-163 , 51/* "PIPETEXT" */,-163 , 50/* "TEXT" */,-163 , 54/* "FONTNAME" */,-163 , 55/* "FONTSIZE" */,-163 , 56/* "FONTUNIT" */,-163 , 57/* "FONTSTYLE" */,-163 , 58/* "STROKETEXT" */,-163 , 59/* "FILLTEXT" */,-163 , 61/* "TEXTALIGN" */,-163 , 60/* "TEXTBASELINE" */,-163 , 16/* "]" */,-163 , 41/* "|" */,-163 , 70/* "RATIONAL" */,-163 , 1/* "-" */,-163 , 2/* "+" */,-163 , 17/* "(" */,-163 , 71/* "STRING" */,-163 , 28/* "XCTRL1" */,-163 , 32/* "XCTRL2" */,-163 , 29/* "YCTRL1" */,-163 , 33/* "YCTRL2" */,-163 , 30/* "XRADIUS" */,-163 , 31/* "YRADIUS" */,-163 ),
	/* State 213 */ new Array( 18/* ")" */,230 , 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 214 */ new Array( 5/* "^" */,207 , 4/* "/" */,-175 , 3/* "*" */,-175 , 1/* "-" */,-175 , 2/* "+" */,-175 , 18/* ")" */,-175 , 19/* "," */,-175 ),
	/* State 215 */ new Array( 5/* "^" */,207 , 4/* "/" */,-176 , 3/* "*" */,-176 , 1/* "-" */,-176 , 2/* "+" */,-176 , 18/* ")" */,-176 , 19/* "," */,-176 ),
	/* State 216 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,210 , 2/* "+" */,211 , 18/* ")" */,232 ),
	/* State 217 */ new Array( 14/* "}" */,-164 , 22/* "HUE" */,-164 , 23/* "SATURATION" */,-164 , 24/* "BRIGHTNESS" */,-164 , 25/* "ALPHA" */,-164 , 37/* "TARGETHUE" */,-164 , 38/* "TARGETSATURATION" */,-164 , 39/* "TARGETBRIGHTNESS" */,-164 , 40/* "TARGETALPHA" */,-164 , 20/* "ROTATE" */,-164 , 21/* "FLIP" */,-164 , 26/* "XSHIFT" */,-164 , 27/* "YSHIFT" */,-164 , 35/* "SIZE" */,-164 , 36/* "SKEW" */,-164 , 48/* "GLOBALX" */,-164 , 49/* "GLOBALY" */,-164 , 62/* "SHADOWOFFSETX" */,-164 , 63/* "SHADOWOFFSETY" */,-164 , 64/* "SHADOWBLUR" */,-164 , 65/* "SHADOWHUE" */,-164 , 67/* "SHADOWBRIGHTNESS" */,-164 , 66/* "SHADOWSATURATION" */,-164 , 68/* "SHADOWALPHA" */,-164 , 34/* "ZSHIFT" */,-164 , 42/* "PARAMETERS" */,-164 , 47/* "NONPATHSTROKEWIDTH" */,-164 , 43/* "STROKEWIDTH" */,-164 , 52/* "EMPTYOUTTEXT" */,-164 , 53/* "BACKSPC" */,-164 , 51/* "PIPETEXT" */,-164 , 50/* "TEXT" */,-164 , 54/* "FONTNAME" */,-164 , 55/* "FONTSIZE" */,-164 , 56/* "FONTUNIT" */,-164 , 57/* "FONTSTYLE" */,-164 , 58/* "STROKETEXT" */,-164 , 59/* "FILLTEXT" */,-164 , 61/* "TEXTALIGN" */,-164 , 60/* "TEXTBASELINE" */,-164 , 16/* "]" */,-164 , 41/* "|" */,-164 , 70/* "RATIONAL" */,-164 , 1/* "-" */,-164 , 2/* "+" */,-164 , 17/* "(" */,-164 , 71/* "STRING" */,-164 , 28/* "XCTRL1" */,-164 , 32/* "XCTRL2" */,-164 , 29/* "YCTRL1" */,-164 , 33/* "YCTRL2" */,-164 , 30/* "XRADIUS" */,-164 , 31/* "YRADIUS" */,-164 ),
	/* State 218 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,210 , 2/* "+" */,211 , 19/* "," */,233 , 18/* ")" */,234 ),
	/* State 219 */ new Array( 14/* "}" */,-110 , 20/* "ROTATE" */,-110 , 21/* "FLIP" */,-110 , 26/* "XSHIFT" */,-110 , 27/* "YSHIFT" */,-110 , 35/* "SIZE" */,-110 , 36/* "SKEW" */,-110 , 48/* "GLOBALX" */,-110 , 49/* "GLOBALY" */,-110 , 22/* "HUE" */,-110 , 23/* "SATURATION" */,-110 , 24/* "BRIGHTNESS" */,-110 , 25/* "ALPHA" */,-110 , 37/* "TARGETHUE" */,-110 , 38/* "TARGETSATURATION" */,-110 , 39/* "TARGETBRIGHTNESS" */,-110 , 40/* "TARGETALPHA" */,-110 , 62/* "SHADOWOFFSETX" */,-110 , 63/* "SHADOWOFFSETY" */,-110 , 64/* "SHADOWBLUR" */,-110 , 65/* "SHADOWHUE" */,-110 , 67/* "SHADOWBRIGHTNESS" */,-110 , 66/* "SHADOWSATURATION" */,-110 , 68/* "SHADOWALPHA" */,-110 , 34/* "ZSHIFT" */,-110 , 42/* "PARAMETERS" */,-110 , 47/* "NONPATHSTROKEWIDTH" */,-110 , 43/* "STROKEWIDTH" */,-110 , 52/* "EMPTYOUTTEXT" */,-110 , 53/* "BACKSPC" */,-110 , 51/* "PIPETEXT" */,-110 , 50/* "TEXT" */,-110 , 54/* "FONTNAME" */,-110 , 55/* "FONTSIZE" */,-110 , 56/* "FONTUNIT" */,-110 , 57/* "FONTSTYLE" */,-110 , 58/* "STROKETEXT" */,-110 , 59/* "FILLTEXT" */,-110 , 61/* "TEXTALIGN" */,-110 , 60/* "TEXTBASELINE" */,-110 , 16/* "]" */,-110 ),
	/* State 220 */ new Array( 13/* "{" */,235 , 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 221 */ new Array( 14/* "}" */,238 , 26/* "XSHIFT" */,239 , 28/* "XCTRL1" */,240 , 32/* "XCTRL2" */,241 , 27/* "YSHIFT" */,242 , 29/* "YCTRL1" */,243 , 33/* "YCTRL2" */,244 , 30/* "XRADIUS" */,245 , 31/* "YRADIUS" */,246 , 20/* "ROTATE" */,247 , 42/* "PARAMETERS" */,248 ),
	/* State 222 */ new Array( 71/* "STRING" */,249 , 13/* "{" */,250 , 69/* "PATHOP" */,251 ),
	/* State 223 */ new Array( 14/* "}" */,253 , 42/* "PARAMETERS" */,257 , 43/* "STROKEWIDTH" */,258 , 34/* "ZSHIFT" */,259 , 35/* "SIZE" */,260 , 20/* "ROTATE" */,108 , 21/* "FLIP" */,109 , 26/* "XSHIFT" */,110 , 27/* "YSHIFT" */,111 , 36/* "SKEW" */,112 , 48/* "GLOBALX" */,113 , 49/* "GLOBALY" */,114 , 22/* "HUE" */,77 , 23/* "SATURATION" */,78 , 24/* "BRIGHTNESS" */,79 , 25/* "ALPHA" */,80 , 37/* "TARGETHUE" */,81 , 38/* "TARGETSATURATION" */,82 , 39/* "TARGETBRIGHTNESS" */,83 , 40/* "TARGETALPHA" */,84 , 62/* "SHADOWOFFSETX" */,115 , 63/* "SHADOWOFFSETY" */,116 , 64/* "SHADOWBLUR" */,117 , 65/* "SHADOWHUE" */,118 , 67/* "SHADOWBRIGHTNESS" */,119 , 66/* "SHADOWSATURATION" */,120 , 68/* "SHADOWALPHA" */,121 ),
	/* State 224 */ new Array( 16/* "]" */,261 , 42/* "PARAMETERS" */,257 , 43/* "STROKEWIDTH" */,258 , 34/* "ZSHIFT" */,259 , 35/* "SIZE" */,260 , 20/* "ROTATE" */,108 , 21/* "FLIP" */,109 , 26/* "XSHIFT" */,110 , 27/* "YSHIFT" */,111 , 36/* "SKEW" */,112 , 48/* "GLOBALX" */,113 , 49/* "GLOBALY" */,114 , 22/* "HUE" */,77 , 23/* "SATURATION" */,78 , 24/* "BRIGHTNESS" */,79 , 25/* "ALPHA" */,80 , 37/* "TARGETHUE" */,81 , 38/* "TARGETSATURATION" */,82 , 39/* "TARGETBRIGHTNESS" */,83 , 40/* "TARGETALPHA" */,84 , 62/* "SHADOWOFFSETX" */,115 , 63/* "SHADOWOFFSETY" */,116 , 64/* "SHADOWBLUR" */,117 , 65/* "SHADOWHUE" */,118 , 67/* "SHADOWBRIGHTNESS" */,119 , 66/* "SHADOWSATURATION" */,120 , 68/* "SHADOWALPHA" */,121 ),
	/* State 225 */ new Array( 5/* "^" */,-177 , 4/* "/" */,-177 , 3/* "*" */,-177 , 1/* "-" */,-177 , 2/* "+" */,-177 , 18/* ")" */,-177 , 19/* "," */,-177 ),
	/* State 226 */ new Array( 5/* "^" */,207 , 4/* "/" */,-174 , 3/* "*" */,-174 , 1/* "-" */,-174 , 2/* "+" */,-174 , 18/* ")" */,-174 , 19/* "," */,-174 ),
	/* State 227 */ new Array( 5/* "^" */,207 , 4/* "/" */,-173 , 3/* "*" */,-173 , 1/* "-" */,-173 , 2/* "+" */,-173 , 18/* ")" */,-173 , 19/* "," */,-173 ),
	/* State 228 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,-172 , 2/* "+" */,-172 , 18/* ")" */,-172 , 19/* "," */,-172 ),
	/* State 229 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,-171 , 2/* "+" */,-171 , 18/* ")" */,-171 , 19/* "," */,-171 ),
	/* State 230 */ new Array( 18/* ")" */,-168 , 2/* "+" */,-168 , 1/* "-" */,-168 , 3/* "*" */,-168 , 4/* "/" */,-168 , 5/* "^" */,-168 , 19/* "," */,-168 ),
	/* State 231 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,210 , 2/* "+" */,211 , 19/* "," */,262 , 18/* ")" */,263 ),
	/* State 232 */ new Array( 18/* ")" */,-178 , 2/* "+" */,-178 , 1/* "-" */,-178 , 3/* "*" */,-178 , 4/* "/" */,-178 , 5/* "^" */,-178 , 19/* "," */,-178 ),
	/* State 233 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 234 */ new Array( 14/* "}" */,-165 , 22/* "HUE" */,-165 , 23/* "SATURATION" */,-165 , 24/* "BRIGHTNESS" */,-165 , 25/* "ALPHA" */,-165 , 37/* "TARGETHUE" */,-165 , 38/* "TARGETSATURATION" */,-165 , 39/* "TARGETBRIGHTNESS" */,-165 , 40/* "TARGETALPHA" */,-165 , 20/* "ROTATE" */,-165 , 21/* "FLIP" */,-165 , 26/* "XSHIFT" */,-165 , 27/* "YSHIFT" */,-165 , 35/* "SIZE" */,-165 , 36/* "SKEW" */,-165 , 48/* "GLOBALX" */,-165 , 49/* "GLOBALY" */,-165 , 62/* "SHADOWOFFSETX" */,-165 , 63/* "SHADOWOFFSETY" */,-165 , 64/* "SHADOWBLUR" */,-165 , 65/* "SHADOWHUE" */,-165 , 67/* "SHADOWBRIGHTNESS" */,-165 , 66/* "SHADOWSATURATION" */,-165 , 68/* "SHADOWALPHA" */,-165 , 34/* "ZSHIFT" */,-165 , 42/* "PARAMETERS" */,-165 , 47/* "NONPATHSTROKEWIDTH" */,-165 , 43/* "STROKEWIDTH" */,-165 , 52/* "EMPTYOUTTEXT" */,-165 , 53/* "BACKSPC" */,-165 , 51/* "PIPETEXT" */,-165 , 50/* "TEXT" */,-165 , 54/* "FONTNAME" */,-165 , 55/* "FONTSIZE" */,-165 , 56/* "FONTUNIT" */,-165 , 57/* "FONTSTYLE" */,-165 , 58/* "STROKETEXT" */,-165 , 59/* "FILLTEXT" */,-165 , 61/* "TEXTALIGN" */,-165 , 60/* "TEXTBASELINE" */,-165 , 16/* "]" */,-165 , 41/* "|" */,-165 , 70/* "RATIONAL" */,-165 , 1/* "-" */,-165 , 2/* "+" */,-165 , 17/* "(" */,-165 , 71/* "STRING" */,-165 , 28/* "XCTRL1" */,-165 , 32/* "XCTRL2" */,-165 , 29/* "YCTRL1" */,-165 , 33/* "YCTRL2" */,-165 , 30/* "XRADIUS" */,-165 , 31/* "YRADIUS" */,-165 ),
	/* State 235 */ new Array( 14/* "}" */,-84 , 71/* "STRING" */,-84 , 20/* "ROTATE" */,-84 , 21/* "FLIP" */,-84 , 22/* "HUE" */,-84 , 23/* "SATURATION" */,-84 , 24/* "BRIGHTNESS" */,-84 , 25/* "ALPHA" */,-84 , 26/* "XSHIFT" */,-84 , 27/* "YSHIFT" */,-84 , 28/* "XCTRL1" */,-84 , 29/* "YCTRL1" */,-84 , 30/* "XRADIUS" */,-84 , 31/* "YRADIUS" */,-84 , 32/* "XCTRL2" */,-84 , 33/* "YCTRL2" */,-84 , 34/* "ZSHIFT" */,-84 , 35/* "SIZE" */,-84 , 36/* "SKEW" */,-84 , 42/* "PARAMETERS" */,-84 , 43/* "STROKEWIDTH" */,-84 , 47/* "NONPATHSTROKEWIDTH" */,-84 , 46/* "TILEDIM" */,-84 , 50/* "TEXT" */,-84 , 52/* "EMPTYOUTTEXT" */,-84 , 53/* "BACKSPC" */,-84 , 54/* "FONTNAME" */,-84 , 55/* "FONTSIZE" */,-84 , 56/* "FONTUNIT" */,-84 , 57/* "FONTSTYLE" */,-84 , 58/* "STROKETEXT" */,-84 , 59/* "FILLTEXT" */,-84 , 60/* "TEXTBASELINE" */,-84 , 61/* "TEXTALIGN" */,-84 , 48/* "GLOBALX" */,-84 , 49/* "GLOBALY" */,-84 , 62/* "SHADOWOFFSETX" */,-84 , 63/* "SHADOWOFFSETY" */,-84 , 64/* "SHADOWBLUR" */,-84 , 65/* "SHADOWHUE" */,-84 , 66/* "SHADOWSATURATION" */,-84 , 67/* "SHADOWBRIGHTNESS" */,-84 , 68/* "SHADOWALPHA" */,-84 , 70/* "RATIONAL" */,-84 ),
	/* State 236 */ new Array( 13/* "{" */,64 , 15/* "[" */,65 ),
	/* State 237 */ new Array( 14/* "}" */,-71 , 26/* "XSHIFT" */,-71 , 28/* "XCTRL1" */,-71 , 32/* "XCTRL2" */,-71 , 27/* "YSHIFT" */,-71 , 29/* "YCTRL1" */,-71 , 33/* "YCTRL2" */,-71 , 30/* "XRADIUS" */,-71 , 31/* "YRADIUS" */,-71 , 20/* "ROTATE" */,-71 , 42/* "PARAMETERS" */,-71 ),
	/* State 238 */ new Array( 14/* "}" */,-66 , 69/* "PATHOP" */,-66 , 70/* "RATIONAL" */,-66 , 71/* "STRING" */,-66 ),
	/* State 239 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 240 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 241 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 242 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 243 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 244 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 245 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 246 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 247 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 248 */ new Array( 71/* "STRING" */,276 ),
	/* State 249 */ new Array( 13/* "{" */,205 , 15/* "[" */,206 ),
	/* State 250 */ new Array( 14/* "}" */,-65 , 69/* "PATHOP" */,-65 , 70/* "RATIONAL" */,-65 , 71/* "STRING" */,-65 ),
	/* State 251 */ new Array( 13/* "{" */,279 ),
	/* State 252 */ new Array( 14/* "}" */,-92 , 42/* "PARAMETERS" */,-92 , 43/* "STROKEWIDTH" */,-92 , 34/* "ZSHIFT" */,-92 , 35/* "SIZE" */,-92 , 20/* "ROTATE" */,-92 , 21/* "FLIP" */,-92 , 26/* "XSHIFT" */,-92 , 27/* "YSHIFT" */,-92 , 36/* "SKEW" */,-92 , 48/* "GLOBALX" */,-92 , 49/* "GLOBALY" */,-92 , 22/* "HUE" */,-92 , 23/* "SATURATION" */,-92 , 24/* "BRIGHTNESS" */,-92 , 25/* "ALPHA" */,-92 , 37/* "TARGETHUE" */,-92 , 38/* "TARGETSATURATION" */,-92 , 39/* "TARGETBRIGHTNESS" */,-92 , 40/* "TARGETALPHA" */,-92 , 62/* "SHADOWOFFSETX" */,-92 , 63/* "SHADOWOFFSETY" */,-92 , 64/* "SHADOWBLUR" */,-92 , 65/* "SHADOWHUE" */,-92 , 67/* "SHADOWBRIGHTNESS" */,-92 , 66/* "SHADOWSATURATION" */,-92 , 68/* "SHADOWALPHA" */,-92 , 16/* "]" */,-92 ),
	/* State 253 */ new Array( 14/* "}" */,-90 , 69/* "PATHOP" */,-90 , 70/* "RATIONAL" */,-90 , 71/* "STRING" */,-90 , 13/* "{" */,-90 ),
	/* State 254 */ new Array( 14/* "}" */,-94 , 42/* "PARAMETERS" */,-94 , 43/* "STROKEWIDTH" */,-94 , 34/* "ZSHIFT" */,-94 , 35/* "SIZE" */,-94 , 20/* "ROTATE" */,-94 , 21/* "FLIP" */,-94 , 26/* "XSHIFT" */,-94 , 27/* "YSHIFT" */,-94 , 36/* "SKEW" */,-94 , 48/* "GLOBALX" */,-94 , 49/* "GLOBALY" */,-94 , 22/* "HUE" */,-94 , 23/* "SATURATION" */,-94 , 24/* "BRIGHTNESS" */,-94 , 25/* "ALPHA" */,-94 , 37/* "TARGETHUE" */,-94 , 38/* "TARGETSATURATION" */,-94 , 39/* "TARGETBRIGHTNESS" */,-94 , 40/* "TARGETALPHA" */,-94 , 62/* "SHADOWOFFSETX" */,-94 , 63/* "SHADOWOFFSETY" */,-94 , 64/* "SHADOWBLUR" */,-94 , 65/* "SHADOWHUE" */,-94 , 67/* "SHADOWBRIGHTNESS" */,-94 , 66/* "SHADOWSATURATION" */,-94 , 68/* "SHADOWALPHA" */,-94 , 16/* "]" */,-94 ),
	/* State 255 */ new Array( 14/* "}" */,-95 , 42/* "PARAMETERS" */,-95 , 43/* "STROKEWIDTH" */,-95 , 34/* "ZSHIFT" */,-95 , 35/* "SIZE" */,-95 , 20/* "ROTATE" */,-95 , 21/* "FLIP" */,-95 , 26/* "XSHIFT" */,-95 , 27/* "YSHIFT" */,-95 , 36/* "SKEW" */,-95 , 48/* "GLOBALX" */,-95 , 49/* "GLOBALY" */,-95 , 22/* "HUE" */,-95 , 23/* "SATURATION" */,-95 , 24/* "BRIGHTNESS" */,-95 , 25/* "ALPHA" */,-95 , 37/* "TARGETHUE" */,-95 , 38/* "TARGETSATURATION" */,-95 , 39/* "TARGETBRIGHTNESS" */,-95 , 40/* "TARGETALPHA" */,-95 , 62/* "SHADOWOFFSETX" */,-95 , 63/* "SHADOWOFFSETY" */,-95 , 64/* "SHADOWBLUR" */,-95 , 65/* "SHADOWHUE" */,-95 , 67/* "SHADOWBRIGHTNESS" */,-95 , 66/* "SHADOWSATURATION" */,-95 , 68/* "SHADOWALPHA" */,-95 , 16/* "]" */,-95 ),
	/* State 256 */ new Array( 14/* "}" */,-96 , 42/* "PARAMETERS" */,-96 , 43/* "STROKEWIDTH" */,-96 , 34/* "ZSHIFT" */,-96 , 35/* "SIZE" */,-96 , 20/* "ROTATE" */,-96 , 21/* "FLIP" */,-96 , 26/* "XSHIFT" */,-96 , 27/* "YSHIFT" */,-96 , 36/* "SKEW" */,-96 , 48/* "GLOBALX" */,-96 , 49/* "GLOBALY" */,-96 , 22/* "HUE" */,-96 , 23/* "SATURATION" */,-96 , 24/* "BRIGHTNESS" */,-96 , 25/* "ALPHA" */,-96 , 37/* "TARGETHUE" */,-96 , 38/* "TARGETSATURATION" */,-96 , 39/* "TARGETBRIGHTNESS" */,-96 , 40/* "TARGETALPHA" */,-96 , 62/* "SHADOWOFFSETX" */,-96 , 63/* "SHADOWOFFSETY" */,-96 , 64/* "SHADOWBLUR" */,-96 , 65/* "SHADOWHUE" */,-96 , 67/* "SHADOWBRIGHTNESS" */,-96 , 66/* "SHADOWSATURATION" */,-96 , 68/* "SHADOWALPHA" */,-96 , 16/* "]" */,-96 ),
	/* State 257 */ new Array( 71/* "STRING" */,280 ),
	/* State 258 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 259 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 260 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 ),
	/* State 261 */ new Array( 14/* "}" */,-91 , 69/* "PATHOP" */,-91 , 70/* "RATIONAL" */,-91 , 71/* "STRING" */,-91 , 13/* "{" */,-91 ),
	/* State 262 */ new Array( 70/* "RATIONAL" */,186 , 71/* "STRING" */,187 , 1/* "-" */,188 , 2/* "+" */,189 , 17/* "(" */,190 ),
	/* State 263 */ new Array( 18/* ")" */,-169 , 2/* "+" */,-169 , 1/* "-" */,-169 , 3/* "*" */,-169 , 4/* "/" */,-169 , 5/* "^" */,-169 , 19/* "," */,-169 ),
	/* State 264 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,210 , 2/* "+" */,211 , 18/* ")" */,285 ),
	/* State 265 */ new Array( 14/* "}" */,286 , 70/* "RATIONAL" */,175 , 71/* "STRING" */,18 , 20/* "ROTATE" */,19 , 21/* "FLIP" */,20 , 22/* "HUE" */,21 , 23/* "SATURATION" */,22 , 24/* "BRIGHTNESS" */,23 , 25/* "ALPHA" */,24 , 26/* "XSHIFT" */,25 , 27/* "YSHIFT" */,26 , 28/* "XCTRL1" */,27 , 29/* "YCTRL1" */,28 , 30/* "XRADIUS" */,29 , 31/* "YRADIUS" */,30 , 32/* "XCTRL2" */,31 , 33/* "YCTRL2" */,32 , 34/* "ZSHIFT" */,33 , 35/* "SIZE" */,34 , 36/* "SKEW" */,35 , 42/* "PARAMETERS" */,36 , 43/* "STROKEWIDTH" */,37 , 47/* "NONPATHSTROKEWIDTH" */,38 , 46/* "TILEDIM" */,39 , 50/* "TEXT" */,40 , 52/* "EMPTYOUTTEXT" */,41 , 53/* "BACKSPC" */,42 , 54/* "FONTNAME" */,43 , 55/* "FONTSIZE" */,44 , 56/* "FONTUNIT" */,45 , 57/* "FONTSTYLE" */,46 , 58/* "STROKETEXT" */,47 , 59/* "FILLTEXT" */,48 , 60/* "TEXTBASELINE" */,49 , 61/* "TEXTALIGN" */,50 , 48/* "GLOBALX" */,51 , 49/* "GLOBALY" */,52 , 62/* "SHADOWOFFSETX" */,53 , 63/* "SHADOWOFFSETY" */,54 , 64/* "SHADOWBLUR" */,55 , 65/* "SHADOWHUE" */,56 , 66/* "SHADOWSATURATION" */,57 , 67/* "SHADOWBRIGHTNESS" */,58 , 68/* "SHADOWALPHA" */,59 ),
	/* State 266 */ new Array( 14/* "}" */,-86 , 71/* "STRING" */,-86 , 20/* "ROTATE" */,-86 , 21/* "FLIP" */,-86 , 22/* "HUE" */,-86 , 23/* "SATURATION" */,-86 , 24/* "BRIGHTNESS" */,-86 , 25/* "ALPHA" */,-86 , 26/* "XSHIFT" */,-86 , 27/* "YSHIFT" */,-86 , 28/* "XCTRL1" */,-86 , 29/* "YCTRL1" */,-86 , 30/* "XRADIUS" */,-86 , 31/* "YRADIUS" */,-86 , 32/* "XCTRL2" */,-86 , 33/* "YCTRL2" */,-86 , 34/* "ZSHIFT" */,-86 , 35/* "SIZE" */,-86 , 36/* "SKEW" */,-86 , 42/* "PARAMETERS" */,-86 , 43/* "STROKEWIDTH" */,-86 , 47/* "NONPATHSTROKEWIDTH" */,-86 , 46/* "TILEDIM" */,-86 , 50/* "TEXT" */,-86 , 52/* "EMPTYOUTTEXT" */,-86 , 53/* "BACKSPC" */,-86 , 54/* "FONTNAME" */,-86 , 55/* "FONTSIZE" */,-86 , 56/* "FONTUNIT" */,-86 , 57/* "FONTSTYLE" */,-86 , 58/* "STROKETEXT" */,-86 , 59/* "FILLTEXT" */,-86 , 60/* "TEXTBASELINE" */,-86 , 61/* "TEXTALIGN" */,-86 , 48/* "GLOBALX" */,-86 , 49/* "GLOBALY" */,-86 , 62/* "SHADOWOFFSETX" */,-86 , 63/* "SHADOWOFFSETY" */,-86 , 64/* "SHADOWBLUR" */,-86 , 65/* "SHADOWHUE" */,-86 , 66/* "SHADOWSATURATION" */,-86 , 67/* "SHADOWBRIGHTNESS" */,-86 , 68/* "SHADOWALPHA" */,-86 , 70/* "RATIONAL" */,-86 ),
	/* State 267 */ new Array( 14/* "}" */,-73 , 26/* "XSHIFT" */,-73 , 28/* "XCTRL1" */,-73 , 32/* "XCTRL2" */,-73 , 27/* "YSHIFT" */,-73 , 29/* "YCTRL1" */,-73 , 33/* "YCTRL2" */,-73 , 30/* "XRADIUS" */,-73 , 31/* "YRADIUS" */,-73 , 20/* "ROTATE" */,-73 , 42/* "PARAMETERS" */,-73 ),
	/* State 268 */ new Array( 14/* "}" */,-74 , 26/* "XSHIFT" */,-74 , 28/* "XCTRL1" */,-74 , 32/* "XCTRL2" */,-74 , 27/* "YSHIFT" */,-74 , 29/* "YCTRL1" */,-74 , 33/* "YCTRL2" */,-74 , 30/* "XRADIUS" */,-74 , 31/* "YRADIUS" */,-74 , 20/* "ROTATE" */,-74 , 42/* "PARAMETERS" */,-74 ),
	/* State 269 */ new Array( 14/* "}" */,-75 , 26/* "XSHIFT" */,-75 , 28/* "XCTRL1" */,-75 , 32/* "XCTRL2" */,-75 , 27/* "YSHIFT" */,-75 , 29/* "YCTRL1" */,-75 , 33/* "YCTRL2" */,-75 , 30/* "XRADIUS" */,-75 , 31/* "YRADIUS" */,-75 , 20/* "ROTATE" */,-75 , 42/* "PARAMETERS" */,-75 ),
	/* State 270 */ new Array( 14/* "}" */,-76 , 26/* "XSHIFT" */,-76 , 28/* "XCTRL1" */,-76 , 32/* "XCTRL2" */,-76 , 27/* "YSHIFT" */,-76 , 29/* "YCTRL1" */,-76 , 33/* "YCTRL2" */,-76 , 30/* "XRADIUS" */,-76 , 31/* "YRADIUS" */,-76 , 20/* "ROTATE" */,-76 , 42/* "PARAMETERS" */,-76 ),
	/* State 271 */ new Array( 14/* "}" */,-77 , 26/* "XSHIFT" */,-77 , 28/* "XCTRL1" */,-77 , 32/* "XCTRL2" */,-77 , 27/* "YSHIFT" */,-77 , 29/* "YCTRL1" */,-77 , 33/* "YCTRL2" */,-77 , 30/* "XRADIUS" */,-77 , 31/* "YRADIUS" */,-77 , 20/* "ROTATE" */,-77 , 42/* "PARAMETERS" */,-77 ),
	/* State 272 */ new Array( 14/* "}" */,-78 , 26/* "XSHIFT" */,-78 , 28/* "XCTRL1" */,-78 , 32/* "XCTRL2" */,-78 , 27/* "YSHIFT" */,-78 , 29/* "YCTRL1" */,-78 , 33/* "YCTRL2" */,-78 , 30/* "XRADIUS" */,-78 , 31/* "YRADIUS" */,-78 , 20/* "ROTATE" */,-78 , 42/* "PARAMETERS" */,-78 ),
	/* State 273 */ new Array( 14/* "}" */,-79 , 26/* "XSHIFT" */,-79 , 28/* "XCTRL1" */,-79 , 32/* "XCTRL2" */,-79 , 27/* "YSHIFT" */,-79 , 29/* "YCTRL1" */,-79 , 33/* "YCTRL2" */,-79 , 30/* "XRADIUS" */,-79 , 31/* "YRADIUS" */,-79 , 20/* "ROTATE" */,-79 , 42/* "PARAMETERS" */,-79 ),
	/* State 274 */ new Array( 14/* "}" */,-80 , 26/* "XSHIFT" */,-80 , 28/* "XCTRL1" */,-80 , 32/* "XCTRL2" */,-80 , 27/* "YSHIFT" */,-80 , 29/* "YCTRL1" */,-80 , 33/* "YCTRL2" */,-80 , 30/* "XRADIUS" */,-80 , 31/* "YRADIUS" */,-80 , 20/* "ROTATE" */,-80 , 42/* "PARAMETERS" */,-80 ),
	/* State 275 */ new Array( 14/* "}" */,-81 , 26/* "XSHIFT" */,-81 , 28/* "XCTRL1" */,-81 , 32/* "XCTRL2" */,-81 , 27/* "YSHIFT" */,-81 , 29/* "YCTRL1" */,-81 , 33/* "YCTRL2" */,-81 , 30/* "XRADIUS" */,-81 , 31/* "YRADIUS" */,-81 , 20/* "ROTATE" */,-81 , 42/* "PARAMETERS" */,-81 ),
	/* State 276 */ new Array( 14/* "}" */,-82 , 26/* "XSHIFT" */,-82 , 28/* "XCTRL1" */,-82 , 32/* "XCTRL2" */,-82 , 27/* "YSHIFT" */,-82 , 29/* "YCTRL1" */,-82 , 33/* "YCTRL2" */,-82 , 30/* "XRADIUS" */,-82 , 31/* "YRADIUS" */,-82 , 20/* "ROTATE" */,-82 , 42/* "PARAMETERS" */,-82 ),
	/* State 277 */ new Array( 14/* "}" */,-70 , 69/* "PATHOP" */,-70 , 70/* "RATIONAL" */,-70 , 71/* "STRING" */,-70 ),
	/* State 278 */ new Array( 14/* "}" */,287 , 69/* "PATHOP" */,179 , 70/* "RATIONAL" */,180 , 71/* "STRING" */,181 ),
	/* State 279 */ new Array( 14/* "}" */,-72 , 26/* "XSHIFT" */,-72 , 28/* "XCTRL1" */,-72 , 32/* "XCTRL2" */,-72 , 27/* "YSHIFT" */,-72 , 29/* "YCTRL1" */,-72 , 33/* "YCTRL2" */,-72 , 30/* "XRADIUS" */,-72 , 31/* "YRADIUS" */,-72 , 20/* "ROTATE" */,-72 , 42/* "PARAMETERS" */,-72 ),
	/* State 280 */ new Array( 14/* "}" */,-97 , 42/* "PARAMETERS" */,-97 , 43/* "STROKEWIDTH" */,-97 , 34/* "ZSHIFT" */,-97 , 35/* "SIZE" */,-97 , 20/* "ROTATE" */,-97 , 21/* "FLIP" */,-97 , 26/* "XSHIFT" */,-97 , 27/* "YSHIFT" */,-97 , 36/* "SKEW" */,-97 , 48/* "GLOBALX" */,-97 , 49/* "GLOBALY" */,-97 , 22/* "HUE" */,-97 , 23/* "SATURATION" */,-97 , 24/* "BRIGHTNESS" */,-97 , 25/* "ALPHA" */,-97 , 37/* "TARGETHUE" */,-97 , 38/* "TARGETSATURATION" */,-97 , 39/* "TARGETBRIGHTNESS" */,-97 , 40/* "TARGETALPHA" */,-97 , 62/* "SHADOWOFFSETX" */,-97 , 63/* "SHADOWOFFSETY" */,-97 , 64/* "SHADOWBLUR" */,-97 , 65/* "SHADOWHUE" */,-97 , 67/* "SHADOWBRIGHTNESS" */,-97 , 66/* "SHADOWSATURATION" */,-97 , 68/* "SHADOWALPHA" */,-97 , 16/* "]" */,-97 ),
	/* State 281 */ new Array( 14/* "}" */,-98 , 42/* "PARAMETERS" */,-98 , 43/* "STROKEWIDTH" */,-98 , 34/* "ZSHIFT" */,-98 , 35/* "SIZE" */,-98 , 20/* "ROTATE" */,-98 , 21/* "FLIP" */,-98 , 26/* "XSHIFT" */,-98 , 27/* "YSHIFT" */,-98 , 36/* "SKEW" */,-98 , 48/* "GLOBALX" */,-98 , 49/* "GLOBALY" */,-98 , 22/* "HUE" */,-98 , 23/* "SATURATION" */,-98 , 24/* "BRIGHTNESS" */,-98 , 25/* "ALPHA" */,-98 , 37/* "TARGETHUE" */,-98 , 38/* "TARGETSATURATION" */,-98 , 39/* "TARGETBRIGHTNESS" */,-98 , 40/* "TARGETALPHA" */,-98 , 62/* "SHADOWOFFSETX" */,-98 , 63/* "SHADOWOFFSETY" */,-98 , 64/* "SHADOWBLUR" */,-98 , 65/* "SHADOWHUE" */,-98 , 67/* "SHADOWBRIGHTNESS" */,-98 , 66/* "SHADOWSATURATION" */,-98 , 68/* "SHADOWALPHA" */,-98 , 16/* "]" */,-98 ),
	/* State 282 */ new Array( 14/* "}" */,-99 , 42/* "PARAMETERS" */,-99 , 43/* "STROKEWIDTH" */,-99 , 34/* "ZSHIFT" */,-99 , 35/* "SIZE" */,-99 , 20/* "ROTATE" */,-99 , 21/* "FLIP" */,-99 , 26/* "XSHIFT" */,-99 , 27/* "YSHIFT" */,-99 , 36/* "SKEW" */,-99 , 48/* "GLOBALX" */,-99 , 49/* "GLOBALY" */,-99 , 22/* "HUE" */,-99 , 23/* "SATURATION" */,-99 , 24/* "BRIGHTNESS" */,-99 , 25/* "ALPHA" */,-99 , 37/* "TARGETHUE" */,-99 , 38/* "TARGETSATURATION" */,-99 , 39/* "TARGETBRIGHTNESS" */,-99 , 40/* "TARGETALPHA" */,-99 , 62/* "SHADOWOFFSETX" */,-99 , 63/* "SHADOWOFFSETY" */,-99 , 64/* "SHADOWBLUR" */,-99 , 65/* "SHADOWHUE" */,-99 , 67/* "SHADOWBRIGHTNESS" */,-99 , 66/* "SHADOWSATURATION" */,-99 , 68/* "SHADOWALPHA" */,-99 , 16/* "]" */,-99 ),
	/* State 283 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 , 14/* "}" */,-136 , 42/* "PARAMETERS" */,-136 , 43/* "STROKEWIDTH" */,-136 , 34/* "ZSHIFT" */,-136 , 35/* "SIZE" */,-136 , 20/* "ROTATE" */,-136 , 21/* "FLIP" */,-136 , 26/* "XSHIFT" */,-136 , 27/* "YSHIFT" */,-136 , 36/* "SKEW" */,-136 , 48/* "GLOBALX" */,-136 , 49/* "GLOBALY" */,-136 , 22/* "HUE" */,-136 , 23/* "SATURATION" */,-136 , 24/* "BRIGHTNESS" */,-136 , 25/* "ALPHA" */,-136 , 37/* "TARGETHUE" */,-136 , 38/* "TARGETSATURATION" */,-136 , 39/* "TARGETBRIGHTNESS" */,-136 , 40/* "TARGETALPHA" */,-136 , 62/* "SHADOWOFFSETX" */,-136 , 63/* "SHADOWOFFSETY" */,-136 , 64/* "SHADOWBLUR" */,-136 , 65/* "SHADOWHUE" */,-136 , 67/* "SHADOWBRIGHTNESS" */,-136 , 66/* "SHADOWSATURATION" */,-136 , 68/* "SHADOWALPHA" */,-136 , 16/* "]" */,-136 ),
	/* State 284 */ new Array( 5/* "^" */,207 , 4/* "/" */,208 , 3/* "*" */,209 , 1/* "-" */,210 , 2/* "+" */,211 , 18/* ")" */,290 ),
	/* State 285 */ new Array( 14/* "}" */,-166 , 22/* "HUE" */,-166 , 23/* "SATURATION" */,-166 , 24/* "BRIGHTNESS" */,-166 , 25/* "ALPHA" */,-166 , 37/* "TARGETHUE" */,-166 , 38/* "TARGETSATURATION" */,-166 , 39/* "TARGETBRIGHTNESS" */,-166 , 40/* "TARGETALPHA" */,-166 , 20/* "ROTATE" */,-166 , 21/* "FLIP" */,-166 , 26/* "XSHIFT" */,-166 , 27/* "YSHIFT" */,-166 , 35/* "SIZE" */,-166 , 36/* "SKEW" */,-166 , 48/* "GLOBALX" */,-166 , 49/* "GLOBALY" */,-166 , 62/* "SHADOWOFFSETX" */,-166 , 63/* "SHADOWOFFSETY" */,-166 , 64/* "SHADOWBLUR" */,-166 , 65/* "SHADOWHUE" */,-166 , 67/* "SHADOWBRIGHTNESS" */,-166 , 66/* "SHADOWSATURATION" */,-166 , 68/* "SHADOWALPHA" */,-166 , 34/* "ZSHIFT" */,-166 , 42/* "PARAMETERS" */,-166 , 47/* "NONPATHSTROKEWIDTH" */,-166 , 43/* "STROKEWIDTH" */,-166 , 52/* "EMPTYOUTTEXT" */,-166 , 53/* "BACKSPC" */,-166 , 51/* "PIPETEXT" */,-166 , 50/* "TEXT" */,-166 , 54/* "FONTNAME" */,-166 , 55/* "FONTSIZE" */,-166 , 56/* "FONTUNIT" */,-166 , 57/* "FONTSTYLE" */,-166 , 58/* "STROKETEXT" */,-166 , 59/* "FILLTEXT" */,-166 , 61/* "TEXTALIGN" */,-166 , 60/* "TEXTBASELINE" */,-166 , 16/* "]" */,-166 , 41/* "|" */,-166 , 70/* "RATIONAL" */,-166 , 1/* "-" */,-166 , 2/* "+" */,-166 , 17/* "(" */,-166 , 71/* "STRING" */,-166 , 28/* "XCTRL1" */,-166 , 32/* "XCTRL2" */,-166 , 29/* "YCTRL1" */,-166 , 33/* "YCTRL2" */,-166 , 30/* "XRADIUS" */,-166 , 31/* "YRADIUS" */,-166 ),
	/* State 286 */ new Array( 14/* "}" */,-87 , 71/* "STRING" */,-87 , 20/* "ROTATE" */,-87 , 21/* "FLIP" */,-87 , 22/* "HUE" */,-87 , 23/* "SATURATION" */,-87 , 24/* "BRIGHTNESS" */,-87 , 25/* "ALPHA" */,-87 , 26/* "XSHIFT" */,-87 , 27/* "YSHIFT" */,-87 , 28/* "XCTRL1" */,-87 , 29/* "YCTRL1" */,-87 , 30/* "XRADIUS" */,-87 , 31/* "YRADIUS" */,-87 , 32/* "XCTRL2" */,-87 , 33/* "YCTRL2" */,-87 , 34/* "ZSHIFT" */,-87 , 35/* "SIZE" */,-87 , 36/* "SKEW" */,-87 , 42/* "PARAMETERS" */,-87 , 43/* "STROKEWIDTH" */,-87 , 47/* "NONPATHSTROKEWIDTH" */,-87 , 46/* "TILEDIM" */,-87 , 50/* "TEXT" */,-87 , 52/* "EMPTYOUTTEXT" */,-87 , 53/* "BACKSPC" */,-87 , 54/* "FONTNAME" */,-87 , 55/* "FONTSIZE" */,-87 , 56/* "FONTUNIT" */,-87 , 57/* "FONTSTYLE" */,-87 , 58/* "STROKETEXT" */,-87 , 59/* "FILLTEXT" */,-87 , 60/* "TEXTBASELINE" */,-87 , 61/* "TEXTALIGN" */,-87 , 48/* "GLOBALX" */,-87 , 49/* "GLOBALY" */,-87 , 62/* "SHADOWOFFSETX" */,-87 , 63/* "SHADOWOFFSETY" */,-87 , 64/* "SHADOWBLUR" */,-87 , 65/* "SHADOWHUE" */,-87 , 66/* "SHADOWSATURATION" */,-87 , 67/* "SHADOWBRIGHTNESS" */,-87 , 68/* "SHADOWALPHA" */,-87 , 70/* "RATIONAL" */,-87 ),
	/* State 287 */ new Array( 14/* "}" */,-68 , 69/* "PATHOP" */,-68 , 70/* "RATIONAL" */,-68 , 71/* "STRING" */,-68 ),
	/* State 288 */ new Array( 14/* "}" */,291 , 26/* "XSHIFT" */,239 , 28/* "XCTRL1" */,240 , 32/* "XCTRL2" */,241 , 27/* "YSHIFT" */,242 , 29/* "YCTRL1" */,243 , 33/* "YCTRL2" */,244 , 30/* "XRADIUS" */,245 , 31/* "YRADIUS" */,246 , 20/* "ROTATE" */,247 , 42/* "PARAMETERS" */,248 ),
	/* State 289 */ new Array( 70/* "RATIONAL" */,127 , 1/* "-" */,128 , 2/* "+" */,129 , 17/* "(" */,130 , 71/* "STRING" */,131 , 14/* "}" */,-137 , 42/* "PARAMETERS" */,-137 , 43/* "STROKEWIDTH" */,-137 , 34/* "ZSHIFT" */,-137 , 35/* "SIZE" */,-137 , 20/* "ROTATE" */,-137 , 21/* "FLIP" */,-137 , 26/* "XSHIFT" */,-137 , 27/* "YSHIFT" */,-137 , 36/* "SKEW" */,-137 , 48/* "GLOBALX" */,-137 , 49/* "GLOBALY" */,-137 , 22/* "HUE" */,-137 , 23/* "SATURATION" */,-137 , 24/* "BRIGHTNESS" */,-137 , 25/* "ALPHA" */,-137 , 37/* "TARGETHUE" */,-137 , 38/* "TARGETSATURATION" */,-137 , 39/* "TARGETBRIGHTNESS" */,-137 , 40/* "TARGETALPHA" */,-137 , 62/* "SHADOWOFFSETX" */,-137 , 63/* "SHADOWOFFSETY" */,-137 , 64/* "SHADOWBLUR" */,-137 , 65/* "SHADOWHUE" */,-137 , 67/* "SHADOWBRIGHTNESS" */,-137 , 66/* "SHADOWSATURATION" */,-137 , 68/* "SHADOWALPHA" */,-137 , 16/* "]" */,-137 ),
	/* State 290 */ new Array( 18/* ")" */,-170 , 2/* "+" */,-170 , 1/* "-" */,-170 , 3/* "*" */,-170 , 4/* "/" */,-170 , 5/* "^" */,-170 , 19/* "," */,-170 ),
	/* State 291 */ new Array( 14/* "}" */,-67 , 69/* "PATHOP" */,-67 , 70/* "RATIONAL" */,-67 , 71/* "STRING" */,-67 ),
	/* State 292 */ new Array( 14/* "}" */,-100 , 42/* "PARAMETERS" */,-100 , 43/* "STROKEWIDTH" */,-100 , 34/* "ZSHIFT" */,-100 , 35/* "SIZE" */,-100 , 20/* "ROTATE" */,-100 , 21/* "FLIP" */,-100 , 26/* "XSHIFT" */,-100 , 27/* "YSHIFT" */,-100 , 36/* "SKEW" */,-100 , 48/* "GLOBALX" */,-100 , 49/* "GLOBALY" */,-100 , 22/* "HUE" */,-100 , 23/* "SATURATION" */,-100 , 24/* "BRIGHTNESS" */,-100 , 25/* "ALPHA" */,-100 , 37/* "TARGETHUE" */,-100 , 38/* "TARGETSATURATION" */,-100 , 39/* "TARGETBRIGHTNESS" */,-100 , 40/* "TARGETALPHA" */,-100 , 62/* "SHADOWOFFSETX" */,-100 , 63/* "SHADOWOFFSETY" */,-100 , 64/* "SHADOWBLUR" */,-100 , 65/* "SHADOWHUE" */,-100 , 67/* "SHADOWBRIGHTNESS" */,-100 , 66/* "SHADOWSATURATION" */,-100 , 68/* "SHADOWALPHA" */,-100 , 16/* "]" */,-100 )
);

/* Goto-Table */
var goto_tab = new Array(
	/* State 0 */ new Array( 75/* cfdg */,1 ),
	/* State 1 */ new Array( 76/* statement */,2 , 77/* initialization */,3 , 78/* background */,4 , 79/* inclusion */,5 , 80/* tile */,6 , 81/* size */,7 , 82/* rule */,8 , 83/* path */,9 ),
	/* State 2 */ new Array(  ),
	/* State 3 */ new Array(  ),
	/* State 4 */ new Array(  ),
	/* State 5 */ new Array(  ),
	/* State 6 */ new Array(  ),
	/* State 7 */ new Array(  ),
	/* State 8 */ new Array(  ),
	/* State 9 */ new Array(  ),
	/* State 10 */ new Array( 84/* user_string */,17 ),
	/* State 11 */ new Array(  ),
	/* State 12 */ new Array( 84/* user_string */,62 ),
	/* State 13 */ new Array( 86/* modification */,63 ),
	/* State 14 */ new Array( 86/* modification */,66 ),
	/* State 15 */ new Array( 84/* user_string */,67 ),
	/* State 16 */ new Array( 84/* user_string */,68 ),
	/* State 17 */ new Array(  ),
	/* State 18 */ new Array(  ),
	/* State 19 */ new Array(  ),
	/* State 20 */ new Array(  ),
	/* State 21 */ new Array(  ),
	/* State 22 */ new Array(  ),
	/* State 23 */ new Array(  ),
	/* State 24 */ new Array(  ),
	/* State 25 */ new Array(  ),
	/* State 26 */ new Array(  ),
	/* State 27 */ new Array(  ),
	/* State 28 */ new Array(  ),
	/* State 29 */ new Array(  ),
	/* State 30 */ new Array(  ),
	/* State 31 */ new Array(  ),
	/* State 32 */ new Array(  ),
	/* State 33 */ new Array(  ),
	/* State 34 */ new Array(  ),
	/* State 35 */ new Array(  ),
	/* State 36 */ new Array(  ),
	/* State 37 */ new Array(  ),
	/* State 38 */ new Array(  ),
	/* State 39 */ new Array(  ),
	/* State 40 */ new Array(  ),
	/* State 41 */ new Array(  ),
	/* State 42 */ new Array(  ),
	/* State 43 */ new Array(  ),
	/* State 44 */ new Array(  ),
	/* State 45 */ new Array(  ),
	/* State 46 */ new Array(  ),
	/* State 47 */ new Array(  ),
	/* State 48 */ new Array(  ),
	/* State 49 */ new Array(  ),
	/* State 50 */ new Array(  ),
	/* State 51 */ new Array(  ),
	/* State 52 */ new Array(  ),
	/* State 53 */ new Array(  ),
	/* State 54 */ new Array(  ),
	/* State 55 */ new Array(  ),
	/* State 56 */ new Array(  ),
	/* State 57 */ new Array(  ),
	/* State 58 */ new Array(  ),
	/* State 59 */ new Array(  ),
	/* State 60 */ new Array( 85/* buncha_color_adjustments */,69 ),
	/* State 61 */ new Array(  ),
	/* State 62 */ new Array(  ),
	/* State 63 */ new Array(  ),
	/* State 64 */ new Array( 98/* buncha_adjustments */,70 ),
	/* State 65 */ new Array( 98/* buncha_adjustments */,71 ),
	/* State 66 */ new Array(  ),
	/* State 67 */ new Array(  ),
	/* State 68 */ new Array(  ),
	/* State 69 */ new Array( 102/* color_adjustment */,75 ),
	/* State 70 */ new Array( 104/* adjustment */,85 , 105/* text_adjustment */,87 , 101/* geom_adjustment */,88 , 102/* color_adjustment */,89 , 103/* shadow_adjustment */,90 ),
	/* State 71 */ new Array( 104/* adjustment */,85 , 105/* text_adjustment */,87 , 101/* geom_adjustment */,88 , 102/* color_adjustment */,89 , 103/* shadow_adjustment */,90 ),
	/* State 72 */ new Array( 87/* buncha_replacements */,123 ),
	/* State 73 */ new Array(  ),
	/* State 74 */ new Array( 88/* buncha_pathOps */,125 ),
	/* State 75 */ new Array(  ),
	/* State 76 */ new Array(  ),
	/* State 77 */ new Array( 96/* exp */,126 ),
	/* State 78 */ new Array( 96/* exp */,132 ),
	/* State 79 */ new Array( 96/* exp */,133 ),
	/* State 80 */ new Array( 96/* exp */,134 ),
	/* State 81 */ new Array( 96/* exp */,135 ),
	/* State 82 */ new Array( 96/* exp */,136 ),
	/* State 83 */ new Array( 96/* exp */,137 ),
	/* State 84 */ new Array( 96/* exp */,138 ),
	/* State 85 */ new Array(  ),
	/* State 86 */ new Array(  ),
	/* State 87 */ new Array(  ),
	/* State 88 */ new Array(  ),
	/* State 89 */ new Array(  ),
	/* State 90 */ new Array(  ),
	/* State 91 */ new Array( 96/* exp */,139 ),
	/* State 92 */ new Array( 96/* exp */,140 ),
	/* State 93 */ new Array(  ),
	/* State 94 */ new Array( 96/* exp */,142 ),
	/* State 95 */ new Array( 96/* exp */,143 ),
	/* State 96 */ new Array(  ),
	/* State 97 */ new Array(  ),
	/* State 98 */ new Array( 106/* rational */,144 ),
	/* State 99 */ new Array( 106/* rational */,148 , 107/* normal_string */,149 , 84/* user_string */,151 ),
	/* State 100 */ new Array(  ),
	/* State 101 */ new Array(  ),
	/* State 102 */ new Array(  ),
	/* State 103 */ new Array(  ),
	/* State 104 */ new Array(  ),
	/* State 105 */ new Array(  ),
	/* State 106 */ new Array(  ),
	/* State 107 */ new Array(  ),
	/* State 108 */ new Array( 96/* exp */,158 ),
	/* State 109 */ new Array( 96/* exp */,159 ),
	/* State 110 */ new Array( 96/* exp */,160 ),
	/* State 111 */ new Array( 96/* exp */,161 ),
	/* State 112 */ new Array( 96/* exp */,162 ),
	/* State 113 */ new Array( 96/* exp */,163 ),
	/* State 114 */ new Array( 96/* exp */,164 ),
	/* State 115 */ new Array( 96/* exp */,165 ),
	/* State 116 */ new Array( 96/* exp */,166 ),
	/* State 117 */ new Array( 96/* exp */,167 ),
	/* State 118 */ new Array( 96/* exp */,168 ),
	/* State 119 */ new Array( 96/* exp */,169 ),
	/* State 120 */ new Array( 96/* exp */,170 ),
	/* State 121 */ new Array( 96/* exp */,171 ),
	/* State 122 */ new Array(  ),
	/* State 123 */ new Array( 97/* replacement */,172 , 84/* user_string */,174 ),
	/* State 124 */ new Array( 87/* buncha_replacements */,176 ),
	/* State 125 */ new Array( 92/* pathOp */,177 ),
	/* State 126 */ new Array(  ),
	/* State 127 */ new Array(  ),
	/* State 128 */ new Array(  ),
	/* State 129 */ new Array(  ),
	/* State 130 */ new Array( 108/* exp2 */,185 ),
	/* State 131 */ new Array(  ),
	/* State 132 */ new Array(  ),
	/* State 133 */ new Array(  ),
	/* State 134 */ new Array(  ),
	/* State 135 */ new Array(  ),
	/* State 136 */ new Array(  ),
	/* State 137 */ new Array(  ),
	/* State 138 */ new Array(  ),
	/* State 139 */ new Array(  ),
	/* State 140 */ new Array( 96/* exp */,195 ),
	/* State 141 */ new Array(  ),
	/* State 142 */ new Array(  ),
	/* State 143 */ new Array(  ),
	/* State 144 */ new Array(  ),
	/* State 145 */ new Array(  ),
	/* State 146 */ new Array(  ),
	/* State 147 */ new Array(  ),
	/* State 148 */ new Array(  ),
	/* State 149 */ new Array(  ),
	/* State 150 */ new Array(  ),
	/* State 151 */ new Array(  ),
	/* State 152 */ new Array(  ),
	/* State 153 */ new Array(  ),
	/* State 154 */ new Array(  ),
	/* State 155 */ new Array(  ),
	/* State 156 */ new Array(  ),
	/* State 157 */ new Array(  ),
	/* State 158 */ new Array(  ),
	/* State 159 */ new Array(  ),
	/* State 160 */ new Array(  ),
	/* State 161 */ new Array(  ),
	/* State 162 */ new Array( 96/* exp */,198 ),
	/* State 163 */ new Array(  ),
	/* State 164 */ new Array(  ),
	/* State 165 */ new Array(  ),
	/* State 166 */ new Array(  ),
	/* State 167 */ new Array(  ),
	/* State 168 */ new Array(  ),
	/* State 169 */ new Array(  ),
	/* State 170 */ new Array(  ),
	/* State 171 */ new Array(  ),
	/* State 172 */ new Array(  ),
	/* State 173 */ new Array(  ),
	/* State 174 */ new Array( 86/* modification */,199 ),
	/* State 175 */ new Array(  ),
	/* State 176 */ new Array( 97/* replacement */,172 , 84/* user_string */,174 ),
	/* State 177 */ new Array(  ),
	/* State 178 */ new Array(  ),
	/* State 179 */ new Array(  ),
	/* State 180 */ new Array(  ),
	/* State 181 */ new Array( 94/* path_modification */,204 ),
	/* State 182 */ new Array(  ),
	/* State 183 */ new Array(  ),
	/* State 184 */ new Array(  ),
	/* State 185 */ new Array(  ),
	/* State 186 */ new Array(  ),
	/* State 187 */ new Array(  ),
	/* State 188 */ new Array( 108/* exp2 */,214 ),
	/* State 189 */ new Array( 108/* exp2 */,215 ),
	/* State 190 */ new Array( 108/* exp2 */,216 ),
	/* State 191 */ new Array( 108/* exp2 */,218 ),
	/* State 192 */ new Array(  ),
	/* State 193 */ new Array(  ),
	/* State 194 */ new Array(  ),
	/* State 195 */ new Array( 96/* exp */,219 ),
	/* State 196 */ new Array(  ),
	/* State 197 */ new Array(  ),
	/* State 198 */ new Array(  ),
	/* State 199 */ new Array(  ),
	/* State 200 */ new Array( 86/* modification */,220 ),
	/* State 201 */ new Array(  ),
	/* State 202 */ new Array( 93/* points */,221 ),
	/* State 203 */ new Array( 94/* path_modification */,222 ),
	/* State 204 */ new Array(  ),
	/* State 205 */ new Array( 99/* buncha_path_adjustments */,223 ),
	/* State 206 */ new Array( 99/* buncha_path_adjustments */,224 ),
	/* State 207 */ new Array( 108/* exp2 */,225 ),
	/* State 208 */ new Array( 108/* exp2 */,226 ),
	/* State 209 */ new Array( 108/* exp2 */,227 ),
	/* State 210 */ new Array( 108/* exp2 */,228 ),
	/* State 211 */ new Array( 108/* exp2 */,229 ),
	/* State 212 */ new Array(  ),
	/* State 213 */ new Array( 108/* exp2 */,231 ),
	/* State 214 */ new Array(  ),
	/* State 215 */ new Array(  ),
	/* State 216 */ new Array(  ),
	/* State 217 */ new Array(  ),
	/* State 218 */ new Array(  ),
	/* State 219 */ new Array(  ),
	/* State 220 */ new Array( 84/* user_string */,236 ),
	/* State 221 */ new Array( 95/* point */,237 ),
	/* State 222 */ new Array(  ),
	/* State 223 */ new Array( 100/* path_adjustment */,252 , 101/* geom_adjustment */,254 , 102/* color_adjustment */,255 , 103/* shadow_adjustment */,256 ),
	/* State 224 */ new Array( 100/* path_adjustment */,252 , 101/* geom_adjustment */,254 , 102/* color_adjustment */,255 , 103/* shadow_adjustment */,256 ),
	/* State 225 */ new Array(  ),
	/* State 226 */ new Array(  ),
	/* State 227 */ new Array(  ),
	/* State 228 */ new Array(  ),
	/* State 229 */ new Array(  ),
	/* State 230 */ new Array(  ),
	/* State 231 */ new Array(  ),
	/* State 232 */ new Array(  ),
	/* State 233 */ new Array( 108/* exp2 */,264 ),
	/* State 234 */ new Array(  ),
	/* State 235 */ new Array( 87/* buncha_replacements */,265 ),
	/* State 236 */ new Array( 86/* modification */,266 ),
	/* State 237 */ new Array(  ),
	/* State 238 */ new Array(  ),
	/* State 239 */ new Array( 96/* exp */,267 ),
	/* State 240 */ new Array( 96/* exp */,268 ),
	/* State 241 */ new Array( 96/* exp */,269 ),
	/* State 242 */ new Array( 96/* exp */,270 ),
	/* State 243 */ new Array( 96/* exp */,271 ),
	/* State 244 */ new Array( 96/* exp */,272 ),
	/* State 245 */ new Array( 96/* exp */,273 ),
	/* State 246 */ new Array( 96/* exp */,274 ),
	/* State 247 */ new Array( 96/* exp */,275 ),
	/* State 248 */ new Array(  ),
	/* State 249 */ new Array( 94/* path_modification */,277 ),
	/* State 250 */ new Array( 88/* buncha_pathOps */,278 ),
	/* State 251 */ new Array(  ),
	/* State 252 */ new Array(  ),
	/* State 253 */ new Array(  ),
	/* State 254 */ new Array(  ),
	/* State 255 */ new Array(  ),
	/* State 256 */ new Array(  ),
	/* State 257 */ new Array(  ),
	/* State 258 */ new Array( 96/* exp */,281 ),
	/* State 259 */ new Array( 96/* exp */,282 ),
	/* State 260 */ new Array( 96/* exp */,283 ),
	/* State 261 */ new Array(  ),
	/* State 262 */ new Array( 108/* exp2 */,284 ),
	/* State 263 */ new Array(  ),
	/* State 264 */ new Array(  ),
	/* State 265 */ new Array( 97/* replacement */,172 , 84/* user_string */,174 ),
	/* State 266 */ new Array(  ),
	/* State 267 */ new Array(  ),
	/* State 268 */ new Array(  ),
	/* State 269 */ new Array(  ),
	/* State 270 */ new Array(  ),
	/* State 271 */ new Array(  ),
	/* State 272 */ new Array(  ),
	/* State 273 */ new Array(  ),
	/* State 274 */ new Array(  ),
	/* State 275 */ new Array(  ),
	/* State 276 */ new Array(  ),
	/* State 277 */ new Array(  ),
	/* State 278 */ new Array( 92/* pathOp */,177 ),
	/* State 279 */ new Array( 93/* points */,288 ),
	/* State 280 */ new Array(  ),
	/* State 281 */ new Array(  ),
	/* State 282 */ new Array(  ),
	/* State 283 */ new Array( 96/* exp */,289 ),
	/* State 284 */ new Array(  ),
	/* State 285 */ new Array(  ),
	/* State 286 */ new Array(  ),
	/* State 287 */ new Array(  ),
	/* State 288 */ new Array( 95/* point */,237 ),
	/* State 289 */ new Array( 96/* exp */,292 ),
	/* State 290 */ new Array(  ),
	/* State 291 */ new Array(  ),
	/* State 292 */ new Array(  )
);



/* Symbol labels */
var labels = new Array(
	"cfdg'" /* Non-terminal symbol */,
	"-" /* Terminal symbol */,
	"+" /* Terminal symbol */,
	"*" /* Terminal symbol */,
	"/" /* Terminal symbol */,
	"^" /* Terminal symbol */,
	"!" /* Terminal symbol */,
	"STARTSHAPE" /* Terminal symbol */,
	"BACKGROUND" /* Terminal symbol */,
	"INCLUDE" /* Terminal symbol */,
	"TILE" /* Terminal symbol */,
	"RULE" /* Terminal symbol */,
	"PATH" /* Terminal symbol */,
	"{" /* Terminal symbol */,
	"}" /* Terminal symbol */,
	"[" /* Terminal symbol */,
	"]" /* Terminal symbol */,
	"(" /* Terminal symbol */,
	")" /* Terminal symbol */,
	"," /* Terminal symbol */,
	"ROTATE" /* Terminal symbol */,
	"FLIP" /* Terminal symbol */,
	"HUE" /* Terminal symbol */,
	"SATURATION" /* Terminal symbol */,
	"BRIGHTNESS" /* Terminal symbol */,
	"ALPHA" /* Terminal symbol */,
	"XSHIFT" /* Terminal symbol */,
	"YSHIFT" /* Terminal symbol */,
	"XCTRL1" /* Terminal symbol */,
	"YCTRL1" /* Terminal symbol */,
	"XRADIUS" /* Terminal symbol */,
	"YRADIUS" /* Terminal symbol */,
	"XCTRL2" /* Terminal symbol */,
	"YCTRL2" /* Terminal symbol */,
	"ZSHIFT" /* Terminal symbol */,
	"SIZE" /* Terminal symbol */,
	"SKEW" /* Terminal symbol */,
	"TARGETHUE" /* Terminal symbol */,
	"TARGETSATURATION" /* Terminal symbol */,
	"TARGETBRIGHTNESS" /* Terminal symbol */,
	"TARGETALPHA" /* Terminal symbol */,
	"|" /* Terminal symbol */,
	"PARAMETERS" /* Terminal symbol */,
	"STROKEWIDTH" /* Terminal symbol */,
	"ALLOW" /* Terminal symbol */,
	"DENY" /* Terminal symbol */,
	"TILEDIM" /* Terminal symbol */,
	"NONPATHSTROKEWIDTH" /* Terminal symbol */,
	"GLOBALX" /* Terminal symbol */,
	"GLOBALY" /* Terminal symbol */,
	"TEXT" /* Terminal symbol */,
	"PIPETEXT" /* Terminal symbol */,
	"EMPTYOUTTEXT" /* Terminal symbol */,
	"BACKSPC" /* Terminal symbol */,
	"FONTNAME" /* Terminal symbol */,
	"FONTSIZE" /* Terminal symbol */,
	"FONTUNIT" /* Terminal symbol */,
	"FONTSTYLE" /* Terminal symbol */,
	"STROKETEXT" /* Terminal symbol */,
	"FILLTEXT" /* Terminal symbol */,
	"TEXTBASELINE" /* Terminal symbol */,
	"TEXTALIGN" /* Terminal symbol */,
	"SHADOWOFFSETX" /* Terminal symbol */,
	"SHADOWOFFSETY" /* Terminal symbol */,
	"SHADOWBLUR" /* Terminal symbol */,
	"SHADOWHUE" /* Terminal symbol */,
	"SHADOWSATURATION" /* Terminal symbol */,
	"SHADOWBRIGHTNESS" /* Terminal symbol */,
	"SHADOWALPHA" /* Terminal symbol */,
	"PATHOP" /* Terminal symbol */,
	"RATIONAL" /* Terminal symbol */,
	"STRING" /* Terminal symbol */,
	"NORMALSTRING" /* Terminal symbol */,
	"FILENAME" /* Terminal symbol */,
	"WHITESPACE" /* Terminal symbol */,
	"cfdg" /* Non-terminal symbol */,
	"statement" /* Non-terminal symbol */,
	"initialization" /* Non-terminal symbol */,
	"background" /* Non-terminal symbol */,
	"inclusion" /* Non-terminal symbol */,
	"tile" /* Non-terminal symbol */,
	"size" /* Non-terminal symbol */,
	"rule" /* Non-terminal symbol */,
	"path" /* Non-terminal symbol */,
	"user_string" /* Non-terminal symbol */,
	"buncha_color_adjustments" /* Non-terminal symbol */,
	"modification" /* Non-terminal symbol */,
	"buncha_replacements" /* Non-terminal symbol */,
	"buncha_pathOps" /* Non-terminal symbol */,
	"allow" /* Non-terminal symbol */,
	"deny" /* Non-terminal symbol */,
	"tiledim" /* Non-terminal symbol */,
	"pathOp" /* Non-terminal symbol */,
	"points" /* Non-terminal symbol */,
	"path_modification" /* Non-terminal symbol */,
	"point" /* Non-terminal symbol */,
	"exp" /* Non-terminal symbol */,
	"replacement" /* Non-terminal symbol */,
	"buncha_adjustments" /* Non-terminal symbol */,
	"buncha_path_adjustments" /* Non-terminal symbol */,
	"path_adjustment" /* Non-terminal symbol */,
	"geom_adjustment" /* Non-terminal symbol */,
	"color_adjustment" /* Non-terminal symbol */,
	"shadow_adjustment" /* Non-terminal symbol */,
	"adjustment" /* Non-terminal symbol */,
	"text_adjustment" /* Non-terminal symbol */,
	"rational" /* Non-terminal symbol */,
	"normal_string" /* Non-terminal symbol */,
	"exp2" /* Non-terminal symbol */,
	"$" /* Terminal symbol */
);


	
	info.offset = 0;
	info.src = src;
	info.att = new String();
	
	if( !err_off )
		err_off	= new Array();
	if( !err_la )
	err_la = new Array();
	
	sstack.push( 0 );
	vstack.push( 0 );
	
	la = __lex( info );

	while( true )
	{
		act = 294;
		for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
		{
			if( act_tab[sstack[sstack.length-1]][i] == la )
			{
				act = act_tab[sstack[sstack.length-1]][i+1];
				break;
			}
		}

		if( _dbg_withtrace && sstack.length > 0 )
		{
			__dbg_print( "\nState " + sstack[sstack.length-1] + "\n" +
							"\tLookahead: " + labels[la] + " (\"" + info.att + "\")\n" +
							"\tAction: " + act + "\n" + 
							"\tSource: \"" + info.src.substr( info.offset, 30 ) + ( ( info.offset + 30 < info.src.length ) ?
									"..." : "" ) + "\"\n" +
							"\tStack: " + sstack.join() + "\n" +
							"\tValue stack: " + vstack.join() + "\n" );
		}
		
			
		//Panic-mode: Try recovery when parse-error occurs!
		if( act == 294 )
		{
			if( _dbg_withtrace )
				__dbg_print( "Error detected: There is no reduce or shift on the symbol " + labels[la] );
			
			err_cnt++;
			err_off.push( info.offset - info.att.length );			
			err_la.push( new Array() );
			for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
				err_la[err_la.length-1].push( labels[act_tab[sstack[sstack.length-1]][i]] );
			
			//Remember the original stack!
			var rsstack = new Array();
			var rvstack = new Array();
			for( var i = 0; i < sstack.length; i++ )
			{
				rsstack[i] = sstack[i];
				rvstack[i] = vstack[i];
			}
			
			while( act == 294 && la != 109 )
			{
				if( _dbg_withtrace )
					__dbg_print( "\tError recovery\n" +
									"Current lookahead: " + labels[la] + " (" + info.att + ")\n" +
									"Action: " + act + "\n\n" );
				if( la == -1 )
					info.offset++;
					
				while( act == 294 && sstack.length > 0 )
				{
					sstack.pop();
					vstack.pop();
					
					if( sstack.length == 0 )
						break;
						
					act = 294;
					for( var i = 0; i < act_tab[sstack[sstack.length-1]].length; i+=2 )
					{
						if( act_tab[sstack[sstack.length-1]][i] == la )
						{
							act = act_tab[sstack[sstack.length-1]][i+1];
							break;
						}
					}
				}
				
				if( act != 294 )
					break;
				
				for( var i = 0; i < rsstack.length; i++ )
				{
					sstack.push( rsstack[i] );
					vstack.push( rvstack[i] );
				}
				
				la = __lex( info );
			}
			
			if( act == 294 )
			{
				if( _dbg_withtrace )
					__dbg_print( "\tError recovery failed, terminating parse process..." );
				break;
			}


			if( _dbg_withtrace )
				__dbg_print( "\tError recovery succeeded, continuing" );
		}
		
		/*
		if( act == 294 )
			break;
		*/
		
		
		//Shift
		if( act > 0 )
		{			
			if( _dbg_withtrace )
				__dbg_print( "Shifting symbol: " + labels[la] + " (" + info.att + ")" );
		
			sstack.push( act );
			vstack.push( info.att );
			
			la = __lex( info );
			
			if( _dbg_withtrace )
				__dbg_print( "\tNew lookahead symbol: " + labels[la] + " (" + info.att + ")" );
		}
		//Reduce
		else
		{		
			act *= -1;
			
			if( _dbg_withtrace )
				__dbg_print( "Reducing by producution: " + act );
			
			rval = void(0);
			
			if( _dbg_withtrace )
				__dbg_print( "\tPerforming semantic action..." );
			
switch( act )
{
	case 0:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 1:
	{
		rval = vstack[ vstack.length - 2 ];
	}
	break;
	case 2:
	{
		rval = vstack[ vstack.length - 0 ];
	}
	break;
	case 3:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 4:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 5:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 6:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 7:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 8:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 9:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 10:
	{
		 includeFile(vstack[ vstack.length - 1 ]); 
	}
	break;
	case 11:
	{
		 includeFile(vstack[ vstack.length - 1 ].replace(/"/g, '')); 
	}
	break;
	case 12:
	{
		 startShape(vstack[ vstack.length - 1 ]); 
	}
	break;
	case 13:
	{
		 /* Set current evaluated color as background */
                                                                    if (background() !== 0) { CInk.err("background{} has invalid parameters."); return -1; } 
	}
	break;
	case 14:
	{
		 if (tile() !== 0) { CInk.err("tile{} has invalid parameters."); return -1; } 
	}
	break;
	case 15:
	{
		 if (sizeF() !== 0) { CInk.err("size{} has invalid parameters."); return -1; } 
	}
	break;
	case 16:
	{
		 if (rule(vstack[ vstack.length - 4 ], 1) !== 0) { CInk.err("rule " + vstack[ vstack.length - 4 ] + "{} is invalid."); return -1; } 
	}
	break;
	case 17:
	{
		 if (rule(vstack[ vstack.length - 5 ], 1 * vstack[ vstack.length - 4 ]) !== 0) { CInk.err("rule " + vstack[ vstack.length - 5 ] + " " + vstack[ vstack.length - 4 ] + "{} is invalid."); return -1; } 
	}
	break;
	case 18:
	{
		 if (path(vstack[ vstack.length - 4 ]) !== 0) { CInk.err("path " + vstack[ vstack.length - 4 ] + "{} is invalid."); return -1; } 
	}
	break;
	case 19:
	{
		 if (allow(vstack[ vstack.length - 1 ]) !== 0) { CInk.err("Not a valid option for 'allow'."); return -1; } 
	}
	break;
	case 20:
	{
		 if (deny(vstack[ vstack.length - 1 ]) !== 0) { CInk.err("Not a valid option for 'deny'."); return -1; } 
	}
	break;
	case 21:
	{
		 tileDim(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 22:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 23:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 24:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 25:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 26:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 27:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 28:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 29:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 30:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 31:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 32:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 33:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 34:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 35:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 36:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 37:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 38:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 39:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 40:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 41:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 42:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 43:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 44:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 45:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 46:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 47:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 48:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 49:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 50:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 51:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 52:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 53:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 54:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 55:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 56:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 57:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 58:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 59:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 60:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 61:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 62:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 63:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 64:
	{
		rval = vstack[ vstack.length - 2 ];
	}
	break;
	case 65:
	{
		rval = vstack[ vstack.length - 0 ];
	}
	break;
	case 66:
	{
		  groupTransforms();
                                                                    if (checkPathOp(vstack[ vstack.length - 4 ]) !== 0) {
                                                                        return -1;
                                                                    }
                                                                    modificationCaptured();
                                                                    replacement(shortenPathOpName(vstack[ vstack.length - 4 ]));
                                                                
	}
	break;
	case 67:
	{
		  groupTransforms();
                                                                    if (checkPathOp(vstack[ vstack.length - 4 ]) !== 0) {
                                                                        return -1;
                                                                    }
                                                                    modificationCaptured();
                                                                    replacement(shortenPathOpName(vstack[ vstack.length - 4 ]));
                                                                    if (loop(1 * vstack[ vstack.length - 7 ]) !== 0) {
                                                                        CInk.err("loop " + vstack[ vstack.length - 7 ] + "  is invalid.");
                                                                        return -1;
                                                                    }
                                                                
	}
	break;
	case 68:
	{
		  
                                                                    if (loop(1 * vstack[ vstack.length - 6 ]) !== 0) {
                                                                        CInk.err("loop " + vstack[ vstack.length - 6 ] + "  is invalid.");
                                                                        return -1;
                                                                    }
                                                                
	}
	break;
	case 69:
	{
		  //Since modificationCaptured() would have been called so check in stillOrphanChildren[last]
                                                                    if (checkPathCmd(vstack[ vstack.length - 2 ]) !== 0) {
                                                                        return -1;
                                                                    }
                                                                    replacement(vstack[ vstack.length - 2 ]);
                                                                
	}
	break;
	case 70:
	{
		  //Since modificationCaptured() would have been called so check in stillOrphanChildren[last]
                                                                    if (checkPathCmd(vstack[ vstack.length - 2 ]) !== 0) {
                                                                        return -1;
                                                                    }
                                                                    replacement(vstack[ vstack.length - 2 ]);
                                                                    if (loop(1 * vstack[ vstack.length - 5 ]) !== 0) {
                                                                        CInk.err("loop " + vstack[ vstack.length - 5 ] + "  is invalid.");
                                                                        return -1;
                                                                    }
                                                                
	}
	break;
	case 71:
	{
		rval = vstack[ vstack.length - 2 ];
	}
	break;
	case 72:
	{
		rval = vstack[ vstack.length - 0 ];
	}
	break;
	case 73:
	{
		 pointX(1 * vstack[ vstack.length - 1 ], 0); 
	}
	break;
	case 74:
	{
		 pointX(1 * vstack[ vstack.length - 1 ], 1); 
	}
	break;
	case 75:
	{
		 pointX(1 * vstack[ vstack.length - 1 ], 2); 
	}
	break;
	case 76:
	{
		 pointY(1 * vstack[ vstack.length - 1 ], 0); 
	}
	break;
	case 77:
	{
		 pointY(1 * vstack[ vstack.length - 1 ], 1); 
	}
	break;
	case 78:
	{
		 pointY(1 * vstack[ vstack.length - 1 ], 2); 
	}
	break;
	case 79:
	{
		 radiusX(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 80:
	{
		 radiusY(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 81:
	{
		 radius(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 82:
	{
		 parameters(vstack[ vstack.length - 1 ]); 
	}
	break;
	case 83:
	{
		rval = vstack[ vstack.length - 2 ];
	}
	break;
	case 84:
	{
		rval = vstack[ vstack.length - 0 ];
	}
	break;
	case 85:
	{
		 replacement(vstack[ vstack.length - 2 ]); 
	}
	break;
	case 86:
	{
		
                                                                    replacement(vstack[ vstack.length - 2 ]);
                                                                    if (loop(1 * vstack[ vstack.length - 5 ]) !== 0) {
                                                                        CInk.err("loop " + vstack[ vstack.length - 5 ] + "  is invalid.");
                                                                        return -1;
                                                                    }
                                                                
	}
	break;
	case 87:
	{
		
                                                                    if (loop(1 * vstack[ vstack.length - 6 ]) !== 0) {
                                                                        CInk.err("loop " + vstack[ vstack.length - 6 ] + "  is invalid.");
                                                                        return -1;
                                                                    }
                                                                
	}
	break;
	case 88:
	{
		 groupTransforms(); makeGeoUniqueAndOrdered(); modificationCaptured(); 
	}
	break;
	case 89:
	{
		 groupTransforms(); modificationCaptured(); 
	}
	break;
	case 90:
	{
		 groupTransforms(); makeGeoUniqueAndOrdered(); modificationCaptured(); 
	}
	break;
	case 91:
	{
		 groupTransforms(); modificationCaptured(); 
	}
	break;
	case 92:
	{
		rval = vstack[ vstack.length - 2 ];
	}
	break;
	case 93:
	{
		rval = vstack[ vstack.length - 0 ];
	}
	break;
	case 94:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 95:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 96:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 97:
	{
		 parameters(vstack[ vstack.length - 1 ]); 
	}
	break;
	case 98:
	{
		 strokeWidth(1 * vstack[ vstack.length - 1 ], true); 
	}
	break;
	case 99:
	{
		 CInk.err("Z changes are not allowed in paths."); return -1; 
	}
	break;
	case 100:
	{
		 CInk.err("Z changes are not allowed in paths. The 3rd parameter in 'size' is for z.");
                                                                   return -1; 
	}
	break;
	case 101:
	{
		rval = vstack[ vstack.length - 2 ];
	}
	break;
	case 102:
	{
		rval = vstack[ vstack.length - 0 ];
	}
	break;
	case 103:
	{
		rval = vstack[ vstack.length - 2 ];
	}
	break;
	case 104:
	{
		rval = vstack[ vstack.length - 0 ];
	}
	break;
	case 105:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 106:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 107:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 108:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 109:
	{
		 zLocation(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 110:
	{
		 size(1 * vstack[ vstack.length - 3 ], 1 * vstack[ vstack.length - 2 ], 1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 111:
	{
		 CInk.err("Parameters are not allowed in rules"); return -1; 
	}
	break;
	case 112:
	{
		 strokeWidth(1 * vstack[ vstack.length - 1 ], false); 
	}
	break;
	case 113:
	{
		 CInk.err("This is a Path stroke width. Instead use 'sw' here."); return -1; 
	}
	break;
	case 114:
	{
		 truncateText(); 
	}
	break;
	case 115:
	{
		 bckSpc(); 
	}
	break;
	case 116:
	{
		 if (textAppendUsingLast(1 * vstack[ vstack.length - 1 ]) !== 0) return -1; 
	}
	break;
	case 117:
	{
		 textAppend(vstack[ vstack.length - 1 ].replace(/"/g, '')); 
	}
	break;
	case 118:
	{
		 textAppend(vstack[ vstack.length - 1 ]); 
	}
	break;
	case 119:
	{
		 fontName(vstack[ vstack.length - 1 ].replace(/"/g, '')); 
	}
	break;
	case 120:
	{
		 fontSize(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 121:
	{
		 if (fontUnit(vstack[ vstack.length - 1 ]) !== 0) return -1; 
	}
	break;
	case 122:
	{
		 if (fontStyle(vstack[ vstack.length - 1 ]) !== 0) return -1; 
	}
	break;
	case 123:
	{
		 strokeText(true); 
	}
	break;
	case 124:
	{
		 strokeText(false); 
	}
	break;
	case 125:
	{
		 if (textAlign(vstack[ vstack.length - 1 ]) !== 0) return -1; 
	}
	break;
	case 126:
	{
		 if (textBaseline(vstack[ vstack.length - 1 ]) !== 0) return -1; 
	}
	break;
	case 127:
	{
		 rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 128:
	{
		 rval = -1 * vstack[ vstack.length - 1 ]; 
	}
	break;
	case 129:
	{
		 rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 130:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 131:
	{
		rval = vstack[ vstack.length - 1 ];
	}
	break;
	case 132:
	{
		 orientation(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 133:
	{
		 reflection(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 134:
	{
		 xLocation(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 135:
	{
		 yLocation(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 136:
	{
		 size(1 * vstack[ vstack.length - 1 ], 1 * vstack[ vstack.length - 1 ], 1.0); 
	}
	break;
	case 137:
	{
		 size(1 * vstack[ vstack.length - 2 ], 1 * vstack[ vstack.length - 1 ], 1.0); 
	}
	break;
	case 138:
	{
		 skew(1 * vstack[ vstack.length - 2 ], 1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 139:
	{
		 xGlobal(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 140:
	{
		 yGlobal(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 141:
	{
		 shadowOffsetX(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 142:
	{
		 shadowOffsetY(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 143:
	{
		 shadowBlur(1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 144:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    shadowHue(v);
                                                                
	}
	break;
	case 145:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Brightness should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Brightness should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    shadowBrightness(v);
                                                                
	}
	break;
	case 146:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Saturation should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Saturation should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    shadowSaturation(v);
                                                                
	}
	break;
	case 147:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if(v < -1) {
                                                                        CInk.warn("Alpha should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if(v > 1) {
                                                                        CInk.warn("Alpha should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    shadowAlpha(v);
                                                                
	}
	break;
	case 148:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    hue(v);
                                                                
	}
	break;
	case 149:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Saturation should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Saturation should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    saturation(v);
                                                                
	}
	break;
	case 150:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Brightness should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Brightness should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    brightness(v);
                                                                
	}
	break;
	case 151:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if(v < -1) {
                                                                        CInk.warn("Alpha should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if(v > 1) {
                                                                        CInk.warn("Alpha should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    alpha(v);
                                                                
	}
	break;
	case 152:
	{
		  var v = 1 * vstack[ vstack.length - 2 ];
                                                                    hue(v, true); /*true is to set isTargetValue arg to true.*/
                                                                
	}
	break;
	case 153:
	{
		  var v = 1 * vstack[ vstack.length - 2 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Saturation targetting should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Saturation targetting should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    saturation(v, true);
                                                                
	}
	break;
	case 154:
	{
		  var v = 1 * vstack[ vstack.length - 2 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Brightness targetting should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Brightness targetting should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    brightness(v, true);
                                                                
	}
	break;
	case 155:
	{
		  var v = 1 * vstack[ vstack.length - 2 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Alpha targetting should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Alpha targetting should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    alpha(v, true);
                                                                
	}
	break;
	case 156:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    hueTarget(v);
                                                                
	}
	break;
	case 157:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Target saturation should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Target saturation should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    saturationTarget(v);
                                                                
	}
	break;
	case 158:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Target brightness should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Target brightness should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    brightnessTarget(v);
                                                                
	}
	break;
	case 159:
	{
		  var v = 1 * vstack[ vstack.length - 1 ];
                                                                    if (v < -1) {
                                                                        CInk.warn("Target alpha should be in [-1,1] range. Given:", v, "Picking -1 instead.");
                                                                        v = -1;
                                                                    }
                                                                    if (v > 1) {
                                                                        CInk.warn("Target alpha should be in [-1,1] range. Given:", v, "Picking 1 instead.");
                                                                        v = 1;
                                                                    }
                                                                    alphaTarget(v);
                                                                
	}
	break;
	case 160:
	{
		  rval = 1 * vstack[ vstack.length - 1 ]; /*Multiplying by 1 to cast it to number.*/ 
	}
	break;
	case 161:
	{
		  rval = -1 * vstack[ vstack.length - 1 ]; 
	}
	break;
	case 162:
	{
		  rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 163:
	{
		  rval = vstack[ vstack.length - 2 ]; 
	}
	break;
	case 164:
	{
		  var fType = functionType(vstack[ vstack.length - 3 ], 0);
                                                                    if (fType === -1) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 3 ] + "() is not an accepted function.");
                                                                        return -1;
                                                                    }
                                                                    rval = expFunction(fType, 0.0, 0.0);
                                                                
	}
	break;
	case 165:
	{
		  var fType = functionType(vstack[ vstack.length - 4 ], 1);
                                                                    if (fType === -1) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 4 ] + "() is not an accepted function.");
                                                                        return -1;
                                                                    }
                                                                    if (fType === -2) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 4 ] + "() doesn't have required number of arguments.");
                                                                        return -1;
                                                                    }
                                                                    rval = expFunction(fType, vstack[ vstack.length - 2 ], 0.0);
                                                                
	}
	break;
	case 166:
	{
		  var fType = functionType(vstack[ vstack.length - 6 ], 2);
                                                                    if (fType === -1) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 6 ] + "() is not an accepted function.");
                                                                        return -1;
                                                                    }
                                                                    if (fType === -2) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 6 ] + "() doesn't have required number of arguments.");
                                                                        return -1;
                                                                    }
                                                                    rval = expFunction(fType, vstack[ vstack.length - 4 ], vstack[ vstack.length - 2 ]);
                                                                
	}
	break;
	case 167:
	{
		  rval = 1 * vstack[ vstack.length - 1 ]; 
	}
	break;
	case 168:
	{
		  var fType = functionType(vstack[ vstack.length - 3 ], 0);
                                                                    if (fType === -1) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 3 ] + "() is not an accepted function.");
                                                                        return -1;
                                                                    }
                                                                    rval = expFunction(fType, 0.0, 0.0);
                                                                
	}
	break;
	case 169:
	{
		  var fType = functionType(vstack[ vstack.length - 4 ], 1);
                                                                    if (fType === -1) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 4 ] + "() is not an accepted function.");
                                                                        return -1;
                                                                    }
                                                                    if (fType === -2) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 4 ] + "() doesn't have required number of arguments.");
                                                                        return -1;
                                                                    }
                                                                    rval = expFunction(fType, vstack[ vstack.length - 2 ], 0.0);
                                                                
	}
	break;
	case 170:
	{
		  var fType = functionType(vstack[ vstack.length - 6 ], 2);
                                                                    if (fType === -1) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 6 ] + "() is not an accepted function.");
                                                                        return -1;
                                                                    }
                                                                    if (fType === -2) {
                                                                        CInk.err("Function " + vstack[ vstack.length - 6 ] + "() doesn't have required number of arguments.");
                                                                        return -1;
                                                                    }
                                                                    rval = expFunction(fType, vstack[ vstack.length - 4 ], vstack[ vstack.length - 2 ]);
                                                                
	}
	break;
	case 171:
	{
		 rval = vstack[ vstack.length - 3 ] + 1 * vstack[ vstack.length - 1 ]; 
	}
	break;
	case 172:
	{
		 rval = 1 * vstack[ vstack.length - 3 ] - vstack[ vstack.length - 1 ]; 
	}
	break;
	case 173:
	{
		 rval = vstack[ vstack.length - 3 ] * vstack[ vstack.length - 1 ]; 
	}
	break;
	case 174:
	{
		 rval = vstack[ vstack.length - 3 ] / vstack[ vstack.length - 1 ]; 
	}
	break;
	case 175:
	{
		 rval = -1 * vstack[ vstack.length - 1 ]; 
	}
	break;
	case 176:
	{
		 rval = vstack[ vstack.length - 1 ]; 
	}
	break;
	case 177:
	{
		 rval = Math.pow(1 * vstack[ vstack.length - 3 ], 1 * vstack[ vstack.length - 1 ]); 
	}
	break;
	case 178:
	{
		 rval = vstack[ vstack.length - 2 ]; 
	}
	break;
}



			if( _dbg_withtrace )
				__dbg_print( "\tPopping " + pop_tab[act][1] + " off the stack..." );
				
			for( var i = 0; i < pop_tab[act][1]; i++ )
			{
				sstack.pop();
				vstack.pop();
			}
									
			go = -1;
			for( var i = 0; i < goto_tab[sstack[sstack.length-1]].length; i+=2 )
			{
				if( goto_tab[sstack[sstack.length-1]][i] == pop_tab[act][0] )
				{
					go = goto_tab[sstack[sstack.length-1]][i+1];
					break;
				}
			}
			
			if( act == 0 )
				break;
				
			if( _dbg_withtrace )
				__dbg_print( "\tPushing non-terminal " + labels[ pop_tab[act][0] ] );
				
			sstack.push( go );
			vstack.push( rval );			
		}
		
		if( _dbg_withtrace )
		{		
			alert( _dbg_string );
			_dbg_string = new String();
		}
	}

	if( _dbg_withtrace )
	{
		__dbg_print( "\nParse complete." );
		alert( _dbg_string );
	}
	
	return err_cnt;
}



    COMMENT_PATTERN = /((\/\/)|#).*$|\/\*[\s\S]*\*\//gm;
    //Removing all comments.
    code = code.replace(COMMENT_PATTERN, '');

    error_cnt = 0;
    error_off = [];
    error_la = [];
    //_dbg_withtrace = true; //TEST
    if ((error_cnt = __parse(code, error_off, error_la)) > 0) {
        for (i = 0; i < error_cnt; i += 1 ) {
            CInk.err("Parse error near \""
                + code.substr(error_off[i], 10) +
                ((code.length > error_off[i] + 10) ? "..." : "") +
                "\", expecting \"" + error_la[i].join() + "\"");
        }
        return null;
    }

    //VALIDATIONS
    hasErr = error_cnt !== 0;
    if (isNotDefined(compiled.startShape) ||
        (isNotDefined(compiled.rules[compiled.startShape]) && isNotDefined(compiled.shapes[compiled.startShape]))) {
        CInk.err("startshape '" + compiled.startShape + "' is not defined or it mentions a non-existent rule or shape.");
        hasErr = true;
    }
    
    function checkShapesExist(ruleName, ruleWt, shapes) {
        var isErr = false, i;
        for(i=0; i < shapes.length; i += 1) {
            if(shapes[i].name === '__loop*') {
                if (!checkShapesExist(ruleName, ruleWt, shapes[i].body))
                    isErr = true;
            } else if (isNotDefined(compiled.rules[shapes[i].name]) &&
                       isNotDefined(compiled.shapes[shapes[i].name])) {
                CInk.err("Rule or shape '" + shapes[i].name + "' referred by rule "
                    + ruleName + " with wt " + ruleWt + " doesn't exist.");
                isErr = true;
            }
        }
        return !isErr;
    }
    
    for (i in compiled.rules) {
        if (compiled.rules.hasOwnProperty(i)) {
            allShapes = compiled.rules[i].def;
            for( j = 0; j < allShapes.length; j += 1) {
                if (!checkShapesExist(i, allShapes[j].wt, allShapes[j].c))
                    hasErr = true;
            }
        }
    }
    
    if (!isNotDefined(compiled.rules.TIME)) {
        if (compiled.rules.TIME.def.length > 1) {
            CInk.err("Only one TIME rule can be defined. CInk cannot determine which TIME to invoke when there are multiple.");
            hasErr = true;
        }
    }
    
    if(console.log) {
        console.log('compiled code:', compiled);
    }
    CInk.log('Compilation done in ', ((new Date().getTime() - startTime) / 1000.0) + 's');
    if(hasErr) {
        return null;
    }
    
    return compiled;
}; //End of Compile()
})(); //End of anonymous wrapper function.

