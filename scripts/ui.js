
var dragging = null;
var divider = document.getElementById("border_top");
var original_pos = divider.getBoundingClientRect().top;
var last_pos;
var last_target;

document.addEventListener('dragstart', function (event) {
    var target = getLI(event.target);
    dragging = target;
    event.dataTransfer.setData('text/plain', null);
});

document.addEventListener('dragover', function (event) {
    event.preventDefault();
    var target = getLI(event.target);

    if (target == dragging) {
        return;
    }

    if (target) {
        var bounding = target.getBoundingClientRect()

        var offset = bounding.y + (bounding.height / 2);
        if (event.clientY - offset > 0) {
            divider.style['top'] = bounding.bottom;
            last_pos = "bottom";
        } else {
            divider.style['top'] = bounding.top;
            last_pos = "top";
        }

        last_target = target;
        divider.style['visibility'] = "visible";
    }
});

document.addEventListener('dragleave', function (event) {
    if (getLI(event.target) != last_target) {
        divider.style['top'] = original_pos;
        divider.style['visibility'] = "hidden";
    }
});

document.addEventListener('drop', function (event) {

    event.preventDefault();
    var target = getLI(event.target);

    if (event.target == divider) {
        target = last_target;
    }
    if (target) {

        if (last_pos == "bottom") {
            target.parentNode.insertBefore(dragging, target.nextSibling);
        }
        else {
            target.parentNode.insertBefore(dragging, target);
        }

        divider.style['top'] = original_pos;
        var nodes = [].slice.call(document.getElementById("layers").childNodes);
        images = nodes.map(function (node) {
            var index = images.findIndex((img) => img.id == node.id);
            return images[index];
        });
        for (var i = 0; i < images.length; i++) {
            isEditing = false;
        }
        resetCanvas();

    }
    divider.style['visibility'] = "hidden";
});

function getLI(target) {
    while (target.nodeName.toLowerCase() != 'ul' && target.nodeName.toLowerCase() != 'body') {
        target = target.parentNode;
    }
    if (target.nodeName.toLowerCase() == 'body') {
        return false;
    } else {
        return target;
    }
}

function resizeCanvas() {
    if (camera && renderer) {
        renderer.setSize(leftcol.clientWidth, leftcol.clientHeight);
        camera.aspect = leftcol.clientWidth / leftcol.clientHeight;
        camera.updateProjectionMatrix();
    }
}

document.oncopy = function (e) {
    if (isEditing) {
        coppiedIndex = editingIndex;
    }
}

document.onpaste = function (e) {

    var IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png)$/i;

    if (isEditing) {
        if (coppiedIndex > -1) {
            let shape = new Shape(
                images[editingIndex].x,
                images[editingIndex].y,
                images[editingIndex].w,
                images[editingIndex].h,
                images[editingIndex].img,
                makeId(10),
                images[editingIndex].name + " copy",
                images[editingIndex].corner
            );
            add_image_layer(shape);
        }
    }
    else {

        var items = e.clipboardData.items;

        for (var i = 0; i < items.length; i++) {
            if (IMAGE_MIME_REGEX.test(items[i].type)) {

                let file = items[i].getAsFile();

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
            }
        }
    }
}

function add_image_layer(shape) {

    images.unshift(shape);

    var td = htmlToElement(
        `
		<ul class="item_wrapper" draggable="true" id="`+ shape.id + `">
				<li class="item_col fix visibility item_visible"><i class="fas fa-eye"></i></li>
				<li class="item_col"><div class="one"><span class="two">`+ shape.name + `</span></div></li>
				<li class="item_col fix visibility item_delete"><i class="fas fa-trash"></i></li>
		</ul>
		`
    );

    anchor.insertBefore(td, anchor.firstChild);
}
