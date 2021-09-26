
var material_output;

var recWidth = 1700 / 2;
var recHeight = 750 / 2;

let isLeftDragging = false;
let isRightDragging = false;
let isEditing = false;
let editingIndex = -1;
let coppiedIndex = -1;
var editDragging = false;
var editRotating = false;
var currentHandle = false;

var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");
var base = document.querySelector('#layers');
var inputElement = document.getElementById("fileUpload");

var show_coord = document.getElementById("show_coord");
var show_size = document.getElementById("show_size");
let leftcol = document.getElementById("leftcol");
var anchor = document.getElementById("layers");

var isPickedUp = false;
var isPickedUpIndex = null;
var pickup_start_x = null;
var pickup_start_y = null;

var canvas_x = null;
var canvas_y = null;

var base_x = null;
var base_y = null;

var scaleHandlesSize = 20;

var rotateHandlesSize = 50;

var rot_center = point(0, 0);
var rot_base = point(0, 0);

var snapshots = [];
var snapshot_current_index = 0;

var test_mouse = point(0, 0);
var test_mouse_level = point(0, 0);
var test_center = point(0, 0);
var test_rotated = point(0, 0);
var test_rotated_y = point(0, 0);
var pickup_X = point(0, 0);
var pickup_Y = point(0, 0);


// scaling stuff
var scale = 1.0;
var scaleMultiplier = 0.5;
var translatePos = {
    x: 0,
    y: 0,
};
var startDragOffset = {};
var isMouseDown = false;

var hidden_canv = document.createElement('canvas');

document.body.appendChild(hidden_canv);
hidden_canv.style.display = "none";
hidden_canv.id = "hidden_canv";
hidden_canv.width = recWidth;
hidden_canv.height = recHeight;
hidden_canv.style.backgroundColor = "magenta";
var hidden_ctx = hidden_canv.getContext('2d');

function Shape(x, y, w, h, img, id, name, corner) {
    this.x = x || 0;
    this.y = y || 0;
    this.w = w || 0;
    this.h = h || 0;
    this.img = img;
    this.id = id;
    this.name = name;

    this.visible = true;
    this.flippedX = false;
    this.flippedY = false;
    this.activated_x = false;
    this.activated_y = false;

    this.angle = 0;
    this.prevAngle = 0;

    this.centerX = 0;
    this.centerY = 0;

    this.trueCenter = point(0, 0);
}

Shape.prototype.contains = function (mx, my) {

    if (this.w < 0 || this.h < 0) {
        if (this.w < 0) {
            var temp = this.w;
            this.w *= -1;
            this.x += temp;
        }
        if (this.h < 0) {
            var temp = this.h;
            this.h *= -1;
            this.y += temp;
        }
        this.activated_x = false;
        this.activated_y = false;
    }

    return ((base_x + this.x) <= mx) && ((base_x + this.x + Math.abs(this.w)) >= mx) &&
        ((base_y + this.y) <= my) && ((base_y + this.y + Math.abs(this.h)) >= my);
}

var images = new Array();
var renderer = null;
var camera = null;

function makeId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getMouseTranslated() {
    return {
        x: canvas_x - translatePos.x,
        y: canvas_y - translatePos.y,
    };
}

canvas.addEventListener('dblclick', function () {

    for (var i = 0; i < images.length; i++) {
        isEditing = false;
    }

    for (var i = 0; i < images.length; i++) {
        var corners = getCorners(images[i], base_x + images[i].x, base_y + images[i].y);
        var ptinside = pointInside(corners[0].point, corners[1].point, corners[2].point, corners[3].point, getMouseTranslated(), i);
        if (images[i].visible && ptinside) {
            editingIndex = i;
            isEditing = true;
            resetCanvas();
            return;
        }
    }
    resetCanvas();
    editingIndex = -1;
});

function triagArea(A, B, C) {
    return Math.abs((B.x * A.y - A.x * B.y) + (C.x * B.y - B.x * C.y) + (A.x * C.y - C.x * A.y)) / 2;
}

function pointInside(A, B, C, D, P, index) {
    return ((triagArea(A, P, D) + triagArea(D, P, C) + triagArea(C, P, B) + triagArea(P, B, A)) <= (Math.abs(images[index].w) * Math.abs(images[index].h)))
}

canvas.addEventListener('mousedown', function (evt) {

    isMouseDown = true;
    startDragOffset.x = evt.clientX - translatePos.x;
    startDragOffset.y = evt.clientY - translatePos.y;

    pickup_start_x = canvas_x;
    pickup_start_y = canvas_y;

    if (isEditing) {
        rot_base = point(pickup_start_x, pickup_start_y);
    }

    if (isEditing) {

        editDragging = false;

        var obj = images[editingIndex];

        var mouse = getMouseTranslated();

        var corners = getCorners(images[editingIndex], base_x + images[editingIndex].x, base_y + images[editingIndex].y);

        var midpoints = getMidpoints(corners);

        var combined = corners.concat(midpoints);

        var ptinside = pointInside(corners[0].point, corners[1].point, corners[2].point, corners[3].point, mouse, editingIndex);

        for (var i = 0; i < combined.length; i++) {
            if (dist(mouse, combined[i].point) <= scaleHandlesSize) {
                currentHandle = combined[i].handle;
                if (i < 4) { //means we have a corner
                    switch (i) {
                        case 0: // "TL"
                            pickup_X = midpoints[2].point;
                            pickup_Y = midpoints[0].point;
                            break;
                        case 1: // "TR"
                            pickup_X = midpoints[3].point;
                            pickup_Y = midpoints[0].point;
                            break;
                        case 2: // "BL"
                            pickup_X = midpoints[2].point;
                            pickup_Y = midpoints[1].point;
                            break;
                        case 3: // "BR"
                            pickup_X = midpoints[3].point;
                            pickup_Y = midpoints[1].point;
                            break;
                        default:
                            break;
                    }
                }
                else {
                    pickup_X = combined[i].point;
                    pickup_Y = combined[i].point;
                }

                editDragging = true;
                return;
            }
        }
        if (!ptinside) {
            for (var i = 0; i < combined.length; i++) {
                if (dist(mouse, combined[i].point) <= rotateHandlesSize) {
                    currentHandle = combined[i].handle;
                    editRotating = true;
                    return;
                }
            }
        }
    }

    for (var i = 0; i < images.length; i++) {
        if (images[i].visible) {
            var corners = getCorners(images[i], base_x + images[i].x, base_y + images[i].y);
            var ptinside = pointInside(corners[0].point, corners[1].point, corners[2].point, corners[3].point, getMouseTranslated(), i);

            if (ptinside) {
                isPickedUp = true;
                isPickedUpIndex = i;

                return;
            }
        }
    }
}, false);

function getPixel(img, x, y) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    return context.getImageData(x, y, 1, 1).data;
}

function getImageData(img, x, y) {
    var canvas2 = document.createElement("canvas");
    var ctx = canvas2.getContext("2d");
    ctx.drawImage(img, 0, 0);
    imageData = ctx.getImageData(x, y, 1, 1).data;
}

canvas.addEventListener('mouseup', function () {

    isPickedUp = false;
    isPickedUpIndex = null;
    editDragging = false;
    currentHandle = false;
    isMouseDown = false;

    if (editRotating) {
        rot_base = point(Math.round(posx), Math.round(posy));
        images[editingIndex].prevAngle = (images[editingIndex].angle) % 360;
    }

    if (isEditing) {

        // CALCULATE NEW CENTER AND MOVE THE OBJECT

        // 1. calc both centers
        // 2. move X,Y by the coord diffy

        var temp_orig = point(base_x + images[editingIndex].x, base_y + images[editingIndex].y);

        var center_orig = point(temp_orig.x + (images[editingIndex].w / 2), temp_orig.y + (images[editingIndex].h / 2));

        var corners = getCorners(images[editingIndex], base_x + images[editingIndex].x, base_y + images[editingIndex].y);
        var center_new = getMidPoint(corners[0].point, corners[3].point);

        var differential_x = center_new.x - center_orig.x;
        var differential_y = center_new.y - center_orig.y;

        images[editingIndex].x += differential_x;
        images[editingIndex].y += differential_y;

    }
    editRotating = false;

    if (isEditing) {
        images[editingIndex].activated = false;
    }

    document.getElementById("canvas").style.cursor = ""
    resetCanvas();
}, false);

function ResetColumnSizes(event) {
    OnDrag(event, true);
    resetCanvas();
}

function SetCursor(cursor) {
    let page = document.getElementById("page");
    page.style.cursor = cursor;
}

function StartLeftDrag() {
    isLeftDragging = true;
    SetCursor("ew-resize");
}

function StartRightDrag() {
    isRightDragging = true;
    SetCursor("ew-resize");
}

function EndDrag() {
    isLeftDragging = false;
    isRightDragging = false;
    SetCursor("auto");
}

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function rotatePoint(x, y, cx, cy, angle) {
    theta = angle * Math.PI / 180;
    var tempX = x - cx;
    var tempY = y - cy;
    var rotatedX = tempX * Math.cos(theta) - tempY * Math.sin(theta);
    var rotatedY = tempX * Math.sin(theta) + tempY * Math.cos(theta);
    var retx = rotatedX + cx;
    var rety = rotatedY + cy;
    return point(retx, rety);
}

function getCorners(obj, x, y) {
    return [
        { point: rotatePoint(x, y, obj.trueCenter.x, obj.trueCenter.y, obj.angle), handle: "TL", curres: "nw-resize", currot: "crosshair" },
        { point: rotatePoint(x + obj.w, y, obj.trueCenter.x, obj.trueCenter.y, obj.angle), handle: "TR", curres: "ne-resize", currot: "crosshair" },
        { point: rotatePoint(x, y + obj.h, obj.trueCenter.x, obj.trueCenter.y, obj.angle), handle: "BL", curres: "ne-resize", currot: "crosshair" },
        { point: rotatePoint(x + obj.w, y + obj.h, obj.trueCenter.x, obj.trueCenter.y, obj.angle), handle: "BR", curres: "nw-resize", currot: "crosshair" },
    ];
}

function getMidpoints(pt) {
    return [
        { point: point((pt[0].point.x + pt[1].point.x) / 2, (pt[0].point.y + pt[1].point.y) / 2), handle: "TM", curres: "n-resize", currot: "crosshair" },
        { point: point((pt[2].point.x + pt[3].point.x) / 2, (pt[2].point.y + pt[3].point.y) / 2), handle: "BM", curres: "n-resize", currot: "crosshair" },
        { point: point((pt[0].point.x + pt[2].point.x) / 2, (pt[0].point.y + pt[2].point.y) / 2), handle: "LM", curres: "e-resize", currot: "crosshair" },
        { point: point((pt[1].point.x + pt[3].point.x) / 2, (pt[1].point.y + pt[3].point.y) / 2), handle: "RM", curres: "e-resize", currot: "crosshair" },
    ];
}

function drawCirc(x, y, w, h, color) {
    w = w || 10;
    h = h || 10;
    context.beginPath();
    context.lineWidth = 1;
    context.strokeStyle = "" + color;
    context.arc(x, y, w, 0, 2 * Math.PI);//rect(x-offset, y-offset,w,h); 
    context.stroke();
}

function drawLine(p1, p2, color) {
    context.beginPath();
    context.moveTo(p1.x, p1.y);
    context.lineTo(p2.x, p2.y);
    context.lineWidth = 1;
    context.strokeStyle = "" + color;
    context.stroke();
}

function resetCanvas() {

    function drawRect(x, y, w, h) {

        w = w || 10;
        h = h || 10;

        var offset_x = w / 2;
        var offset_y = h / 2;

        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = "black";
        context.rect(x - offset_x, y - offset_y, w, h);
        context.stroke();
    }

    function drawImageRot(img) {
        context.save()
        context.translate(img.centerX, img.centerY);
        context.rotate(img.angle * Math.PI / 180);
        context.translate((img.centerX) * (-1), (img.centerY) * (-1));
        context.drawImage(img.img, base_x + img.x, base_y + img.y, img.w, img.h);
        context.restore();
    }

    function drawHandles(image, x, y) {

        var corners = getCorners(image, x, y);
        var midpoints = getMidpoints(corners);

        for (var i = 0; i < corners.length; i++) {
            drawRect(corners[i].point.x, corners[i].point.y);
            drawRect(midpoints[i].point.x, midpoints[i].point.y);
        }

        if (image.flippedX || image.flippedY) {

            if (image.flippedX && !image.flippedY) {

                context.save()
                context.translate(image.centerX, image.centerY);
                context.rotate(image.angle * Math.PI / 180);
                context.translate((image.centerX) * (-1), (image.centerY) * (-1));
                context.save();
                context.translate(base_x * 2 + image.w, 0);
                context.scale(-1, 1);
                drawRect(base_x - image.x + image.w / 2, base_y + image.y + image.h / 2, image.w, image.h);
                context.restore();
                context.restore();
            }
            else if (image.flippedY && !image.flippedX) {

                context.save();
                context.translate(image.centerX, image.centerY);
                context.rotate(image.angle * Math.PI / 180);
                context.translate((image.centerX) * (-1), (image.centerY) * (-1));
                context.save();
                context.translate(0, base_y * 2 + image.h);
                context.scale(1, -1);
                drawRect(base_x + image.x + image.w / 2, base_y - image.y + image.h / 2, image.w, image.h);
                context.restore();
                context.restore();
            }
            else if (image.flippedX && image.flippedY) {

                context.save();
                context.translate(image.centerX, image.centerY);
                context.rotate(image.angle * Math.PI / 180);
                context.translate((image.centerX) * (-1), (image.centerY) * (-1));
                context.save();
                context.translate(base_x * 2 + image.w, base_y * 2 + image.h);
                context.scale(-1, -1);
                drawRect(base_x - image.x + image.w / 2, base_y - image.y + image.h / 2, image.w, image.h);
                context.restore();
                context.restore();
            }
        }
        else {
            context.save()
            context.translate(image.centerX, image.centerY);
            context.rotate(image.angle * Math.PI / 180);
            context.translate((image.centerX) * (-1), (image.centerY) * (-1));
            drawRect(base_x + image.x + image.w / 2, base_y + image.y + image.h / 2, image.w, image.h);
            context.restore();
        }
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    base_x = (canvas.width / 2) - ((recWidth / 2)) / (1 / scale);
    base_y = (canvas.height / 2) - ((recHeight / 2)) / (1 / scale);

    context.save();
    context.scale(scale, scale);

    context.fillStyle = "rgba(0, 0, 0, 0)";

    context.fillRect(base_x, base_y, recWidth, recHeight);

    for (var i = images.length - 1; i >= 0; i--) { //DRAWLOOPREDRAW
        if (images[i].visible) {

            var start_x = base_x + images[i].x;
            var start_y = base_y + images[i].y;

            var width = images[i].w;
            var height = images[i].h;

            var angle = images[i].angle;

            if (!editDragging) { // very important :)))
                images[i].trueCenter = point(start_x + width / 2, start_y + height / 2);
            }

            images[i].centerX = images[i].trueCenter.x;
            images[i].centerY = images[i].trueCenter.y;

            if (images[i].flippedX || images[i].flippedY) {
                if (images[i].flippedX && !images[i].flippedY) {
                    context.save()
                    context.translate(images[i].centerX, images[i].centerY);
                    context.rotate(images[i].angle * Math.PI / 180);
                    context.translate((images[i].centerX) * (-1), (images[i].centerY) * (-1));
                    context.save();
                    context.translate(base_x * 2 + images[i].w, 0);
                    context.scale(-1, 1);
                    context.drawImage(images[i].img, base_x - images[i].x, base_y + images[i].y, images[i].w, images[i].h);
                    if (isEditing && editingIndex === i) drawRect(base_x - images[i].x + images[i].w / 2, base_y + images[i].y + images[i].h / 2, images[i].w, images[i].h);
                    context.restore();
                    context.restore();
                }
                else if (images[i].flippedY && !images[i].flippedX) {
                    context.save();
                    context.translate(images[i].centerX, images[i].centerY);
                    context.rotate(images[i].angle * Math.PI / 180);
                    context.translate((images[i].centerX) * (-1), (images[i].centerY) * (-1));
                    context.save();
                    context.translate(0, base_y * 2 + images[i].h);
                    context.scale(1, -1);
                    context.drawImage(images[i].img, base_x + images[i].x, base_y - images[i].y, images[i].w, images[i].h);
                    if (isEditing && editingIndex === i) drawRect(base_x + images[i].x + images[i].w / 2, base_y - images[i].y + images[i].h / 2, images[i].w, images[i].h);
                    context.restore();
                    context.restore();
                }
                else if (images[i].flippedX && images[i].flippedY) {
                    context.save();
                    context.translate(images[i].centerX, images[i].centerY);
                    context.rotate(images[i].angle * Math.PI / 180);
                    context.translate((images[i].centerX) * (-1), (images[i].centerY) * (-1));
                    context.save();
                    context.translate(base_x * 2 + images[i].w, base_y * 2 + images[i].h);
                    context.scale(-1, -1);
                    context.drawImage(images[i].img, base_x - images[i].x, base_y - images[i].y, images[i].w, images[i].h);
                    if (isEditing && editingIndex === i) drawRect(base_x - images[i].x + images[i].w / 2, base_y - images[i].y + images[i].h / 2, images[i].w, images[i].h);
                    context.restore();
                    context.restore();
                }
            }
            else {
                context.save()
                context.translate(images[i].centerX, images[i].centerY);
                context.rotate(images[i].angle * Math.PI / 180);
                context.translate((images[i].centerX) * (-1), (images[i].centerY) * (-1));
                context.drawImage(images[i].img, base_x + images[i].x, base_y + images[i].y, images[i].w, images[i].h);
                if (isEditing && editingIndex === i) drawRect(base_x + images[i].x + images[i].w / 2, base_y + images[i].y + images[i].h / 2, images[i].w, images[i].h);
                context.restore();
            }
        }
    }

    if (isEditing) {
        drawHandles(images[editingIndex], base_x + images[editingIndex].x, base_y + images[editingIndex].y);
    }

    context.restore();

    hidden_ctx.clearRect(0, 0, hidden_canv.width, hidden_canv.height);

    let magix_offset_number = 2; // this fixes some weird bg color bug

    hidden_ctx.drawImage(
        canvas,
        base_x,//Start Clipping
        base_y,//Start Clipping
        recWidth,//Clipping Width
        recHeight,//Clipping Height
        0,
        magix_offset_number,
        recWidth,//Place Width
        recHeight//Place Height
    );
    try {
        material_output.map.needsUpdate = true;
    } catch (error) {

    }

    context.strokeRect(base_x, base_y, recWidth, recHeight);
}

function getMidPoint(p1, p2) {
    return point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
}

function OnDrag(event, override = false) {

    if (isLeftDragging || isRightDragging || override) {

        let page = document.getElementById("page");
        let rightcol = document.getElementById("rightcol");
        let leftColWidth = isLeftDragging ? event.clientX : leftcol.clientWidth;
        let rightColWidth = isRightDragging ? page.clientWidth - event.clientX : rightcol.clientWidth;
        let dragbarWidth = 6;

        let cols = [
            leftColWidth,
            dragbarWidth,
            page.clientWidth - (2 * dragbarWidth) - leftColWidth - rightColWidth,
            dragbarWidth,
            rightColWidth
        ];

        let newColDefn = cols.map(c => c.toString() + "px").join(" ");

        page.style.gridTemplateColumns = newColDefn;
        resetCanvas();
        event.preventDefault();

        if (isLeftDragging) {
            resizeCanvas();
        }
    }
}

window.addEventListener('mousemove', function (e) { //DRAG IMAGE

    var pos = getMousePos(canvas, e);
    posx = pos.x;
    posy = pos.y;

    canvas_x = posx;
    canvas_y = posy;

    if (isPickedUp) {
        images[isPickedUpIndex].x -= Math.round(pickup_start_x - posx);
        images[isPickedUpIndex].y -= Math.round(pickup_start_y - posy);

        pickup_start_x = posx;
        pickup_start_y = posy;

        resetCanvas();
    }
}, false);

function point(x, y) {
    return {
        x: x,
        y: y
    };
}

function dist(p1, p2) {
    return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
}

function getAngleABC(a, b, c) {
    var ab = { x: b.x - a.x, y: b.y - a.y };
    var cb = { x: b.x - c.x, y: b.y - c.y };

    var dot = (ab.x * cb.x + ab.y * cb.y); // dot product
    var cross = (ab.x * cb.y - ab.y * cb.x); // cross product

    var alpha = Math.atan2(cross, dot);

    return Math.round(alpha * 180 / Math.PI);
}

canvas.addEventListener('mousemove', function (e) {

    if (isEditing) {

        var previousHandle = currentHandle;
        var mousePos = point(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
        var select = images[editingIndex];

        var mouse = point(posx, posy);

        var corners = getCorners(images[editingIndex], base_x + images[editingIndex].x, base_y + images[editingIndex].y);
        var midpoints = getMidpoints(corners);

        var combined = corners.concat(midpoints);

        var r = {
            A: { x: corners[0].point.x, y: corners[0].point.y },
            B: { x: corners[1].point.x, y: corners[1].point.y },
            C: { x: corners[2].point.x, y: corners[2].point.y },
            D: { x: corners[3].point.x, y: corners[3].point.y },
        }

        var skip = false;
        var near = false;
        for (var i = 0; i < combined.length; i++) {

            if (dist(mouse, combined[i].point) <= scaleHandlesSize) {
                document.getElementById("canvas").style.cursor = combined[i].curres;
                skip = true;
                near = true;
                break;
            }
        }

        if (!skip) {
            for (var i = 0; i < combined.length; i++) {
                if (dist(mouse, combined[i].point) <= rotateHandlesSize) {
                    document.getElementById("canvas").style.cursor = combined[i].currot;
                    near = true;
                    break;
                }
            }
        }

        if (!near) {
            document.getElementById("canvas").style.cursor = "";
        }

        if (editDragging) {

            if (!select.activated_x && select.w < 0) {

                select.flippedX = !select.flippedX;
                select.activated_x = true;
            }
            if (select.activated_x && select.w >= 0) {
                select.flippedX = !select.flippedX;
                select.activated_x = false;
            }
            if (!select.activated_y && select.h < 0) {

                select.flippedY = !select.flippedY;
                select.activated_y = true;
            }
            if (select.activated_y && select.h >= 0) {
                select.flippedY = !select.flippedY;
                select.activated_y = false;
            }

            var rot_point = rotatePoint(
                mousePos.y,
                mousePos.x,
                images[editingIndex].centerX,
                images[editingIndex].centerY,
                images[editingIndex].angle,
            );

            test_mouse = point(mousePos.x, mousePos.y);
            test_center = point(images[editingIndex].centerX, images[editingIndex].centerY);

            test_rotated = rotatePoint(
                test_mouse.x,
                test_mouse.y,
                images[editingIndex].centerX,
                images[editingIndex].centerY,
                360 - images[editingIndex].angle ,
            );


            var temp_point_x = point(test_rotated.x, images[editingIndex].centerY)
            var temp_point_y = point(images[editingIndex].centerX, test_rotated.y)


            test_mouse_level = rotatePoint(
                temp_point_x.x,
                temp_point_x.y,
                images[editingIndex].centerX,
                images[editingIndex].centerY,
                images[editingIndex].angle ,
            );

            test_rotated_y = rotatePoint(
                temp_point_y.x,
                temp_point_y.y,
                images[editingIndex].centerX,
                images[editingIndex].centerY,
                images[editingIndex].angle ,
            );

            var angle = images[editingIndex].angle;

            if (angle === 90) {
                mn_two = dist(point(pickup_X.x, pickup_X.y), test_mouse_level) *
                    (pickup_X.y - test_mouse_level.y < 0 ? -1 : 1);
                mn_one = dist(point(pickup_Y.x, pickup_Y.y), test_rotated_y) *
                    (pickup_Y.x - test_rotated_y.x < 0 ? 1 : -1);
            }
            else if (angle === 270) {
                mn_two = dist(point(pickup_X.x, pickup_X.y), test_mouse_level) *
                    (pickup_X.y - test_mouse_level.y < 0 ? 1 : -1);
                mn_one = dist(point(pickup_Y.x, pickup_Y.y), test_rotated_y) *
                    (pickup_Y.x - test_rotated_y.x < 0 ? -1 : 1);
            }
            else {
                mn_two = dist(point(pickup_X.x, pickup_X.y), test_mouse_level) *
                    (pickup_X.x - test_mouse_level.x < 0 ? -1 : 1) *
                    ((angle > 90 && angle < 270) ? -1 : 1);
                mn_one = dist(point(pickup_Y.x, pickup_Y.y), test_rotated_y) *
                    (pickup_Y.y - test_rotated_y.y < 0 ? -1 : 1) *
                    ((angle > 90 && angle < 270) ? -1 : 1);
            }

            switch (currentHandle) {
                case 'TL':

                    images[editingIndex].w += mn_two;
                    images[editingIndex].h += mn_one;
                    images[editingIndex].x -= mn_two;
                    images[editingIndex].y -= mn_one;

                    break;
                case 'TR':
                    images[editingIndex].w -= mn_two;
                    images[editingIndex].h += mn_one;
                    images[editingIndex].y -= mn_one;

                    break;
                case 'BL':
                    images[editingIndex].w += mn_two;
                    images[editingIndex].h -= mn_one;
                    images[editingIndex].x -= mn_two;
                    break;
                case 'BR':
                    images[editingIndex].w -= mn_two;
                    images[editingIndex].h -= mn_one;
                    break;
                case 'TM':
                    images[editingIndex].h += mn_one;
                    images[editingIndex].y -= mn_one;
                    break;
                case 'RM':
                    images[editingIndex].w -= mn_two;
                    break;
                case 'BM':
                    images[editingIndex].h -= mn_one;
                    break;
                case 'LM':
                    images[editingIndex].w += mn_two;
                    images[editingIndex].x -= mn_two;
                    break;
            }
            pickup_X = test_mouse_level;
            pickup_Y = test_rotated_y;
        }
        else if (editRotating) { //https://jsfiddle.net/opqjhmuL/

            rot_center = point(base_x + images[editingIndex].x + (images[editingIndex].w / 2), base_y + images[editingIndex].y + (images[editingIndex].h / 2));

            var currentAngle = getAngleABC(rot_base, rot_center, point(posx, posy)); // center is passed last

            if (images[editingIndex].flippedX || images[editingIndex].flippedY) {
                if (images[editingIndex].flippedX && !images[editingIndex].flippedY) {
                    images[editingIndex].angle = (images[editingIndex].prevAngle + currentAngle) % 360;
                }
                else if (images[editingIndex].flippedY && !images[editingIndex].flippedX) {
                    images[editingIndex].angle = (images[editingIndex].prevAngle + currentAngle) % 360;
                }
                else {
                    images[editingIndex].angle = (images[editingIndex].prevAngle + currentAngle) % 360;
                }
            }
            else {
                images[editingIndex].angle = (images[editingIndex].prevAngle + currentAngle) % 360;
            }


            if (images[editingIndex].angle < 0) {
                images[editingIndex].angle += 360;
            }

            return resetCanvas();
        }

        if (editDragging || currentHandle != previousHandle) resetCanvas();

    }

}, false);

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
        y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
    };
}

inputElement.onchange = function (event) {

    var fileList = inputElement.files;

    Array.from(fileList).forEach(file => {

        var reader = new FileReader();

        reader.onload = function (e) {

            var image = new Image();

            image.onload = function () {

                image.name = file.name;

                let shape = new Shape(
                    (recWidth / 2) - (this.width / 2), (recHeight / 2) - (this.height / 2),
                    this.width,
                    this.height,
                    image,
                    makeId(10),
                    file.name,
                    point(0, 0),
                );

                add_image_layer(shape);

                inputElement.value = '';

                for (var i = 0; i < images.length; i++) {
                    isEditing = false;
                }

                resetCanvas();
            };
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

base.addEventListener('click', function (event) {

    let closest = event.target.closest('.item_delete');
    let closest_visible = event.target.closest('.item_visible');

    if (closest && base.contains(closest)) {

        var list = document.getElementById("layers");
        var index = Array.prototype.indexOf.call(list.children, closest.parentNode);
        if (editingIndex == index) {
            editingIndex = -1;
            isEditing = false;
        }

        images.splice(index, 1);
        closest.parentNode.remove();
        resetCanvas();
    }
    if (closest_visible && base.contains(closest_visible)) {
        var list = document.getElementById("layers");
        var index = Array.prototype.indexOf.call(list.children, closest_visible.parentNode);
        images[index].visible = !images[index].visible;
        resetCanvas();
        closest_visible.firstChild.classList.toggle('fa-eye-slash');
    }
});

function downloadImage() {
    function downloadImage(data, filename = 'untitled.jpeg') {
        var a = document.createElement('a');
        a.href = data;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    var dataURL = hidden_canv.toDataURL("image/png", 1.0);
    downloadImage(dataURL, 'mug-shot.png');
}
