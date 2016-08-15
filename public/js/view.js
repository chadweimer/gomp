
$(document).ready(function () {
    recipeId = parseInt(window.location.pathname.split('/').pop(), 10);

    loadRecipe();
    loadMainImage();
    loadImages();
    loadNotes();
});

function loadRecipe() {
    showBusy('Loading recipe...');
    getRecipeAsync(recipeId).done(function (recipe) {
        $('#recipe-name').append(recipe.name);
        $('.star[data-rating="' + recipe.averageRating + '"]').addClass('active');
        $('#recipe-ingredients > p').append(recipe.ingredients);
        $('#recipe-directions > p').append(recipe.directions);

        if (recipe.servingSize !== '') {
            var $servingSize = $('#recipe-serving-size');
            $servingSize.removeClass('hide');
            $servingSize.find('p').append(recipe.servingSize);
        }

        if (recipe.nutritionInfo !== '') {
            var $nutritionInfo = $('#recipe-nutrition');
            $nutritionInfo.removeClass('hide');
            $nutritionInfo.find('p').append(recipe.nutritionInfo);
        }

        if (recipe.sourceUrl !== '') {
            var $sourceUrl = $('#recipe-source');
            $sourceUrl.removeClass('hide');
            $sourceUrl.find('> p > a').attr("href", recipe.sourceUrl);
            $sourceUrl.find('> p > a').append(recipe.sourceUrl);
        }

        var $tagsContainer = $('#recipe-tags');
        if (recipe.tags !== null) {
            recipe.tags.forEach(function (tag) {
                $tagsContainer.append('<div class="chip">' + tag + '</div>');
            });
        }
    }).always(function () {
        hideBusy();
    });
}

function onDeleteRecipeClicked(self, e) {
    e.preventDefault();

    showConfirmation(
        'Delete?',
        'warning',
        'Are you sure you want to delete this recipe?',
        function (ee) {
            e.preventDefault();

            deleteRecipeAsync(recipeId).done(function () {
                window.location = '/recipes';
            });
        });
}

function loadMainImage() {
    var $recipeImage = $('#recipe-image');
    getRecipeMainImageAsync(recipeId).done(function (image) {
        $recipeImage.removeClass('hide');
        $recipeImage.attr("src", image.thumbnailUrl);
    }).fail(function () {
        $recipeImage.addClass('hide');
    });
}

function onAddImageSubmitted(self, e) {
    e.preventDefault();

    showBusy('Uploading image...');
    var imageFormData = new FormData(self);
    postRecipeImageAsync(recipeId, imageFormData).done(function () {
        loadMainImage();
        loadImages();
        Materialize.toast('Upload complete', 2000);
    }).always(function () {
        hideBusy();
    });
}

function onDeleteImageClicked(self, e) {
    e.preventDefault();

    showConfirmation(
        'Delete?',
        'warning',
        'Are you sure you want to delete this image?',
        function (ee) {
            var imageId = parseInt($(self).data('image-id'), 10);
            deleteImageAsync(imageId).done(function () {
                loadMainImage();
                loadImages();
                Materialize.toast('Image deleted', 2000);
            });
        });
}

function loadImages() {
    getRecipeImagesAsync(recipeId).done(function (images) {
        var $imagesContainer = $('#images-container');
        $imagesContainer.empty();

        if (images !== null) {
            images.forEach(function (image) {
                var $imageContent = '\
                    <span class="image-container">\
                        <a target="_blank" href="' + image.url + '">\
                            <img width="250" height="250" src="' + image.thumbnailUrl + '">\
                        </a>\
                        <a href="#!" class="make-main-image" data-image-id="' + image.id + '" onclick="onSetMainImageClicked(this, event);">\
                            <i class="material-icons green-text">photo_library</i>\
                        </a>\
                        <a href="#!" class="delete-image" data-image-id="' + image.id + '" onclick="onDeleteImageClicked(this, event);">\
                            <i class="material-icons red-text">delete</i>\
                        </a>\
                    </span>';
                $imagesContainer.append($imageContent);
            });
        }
    }).always(function () {
        $('#pictures .progress').addClass('hide');
    });
}

function onSetMainImageClicked(self, e) {
    e.preventDefault();

    showConfirmation(
        'Set Main Image?',
        'live_help',
        'Are you sure you want to make this the main image for the recipe?',
        function (ee) {
            ee.preventDefault();

            var imageId = parseInt($(self).data('image-id'), 10);
            putRecipeMainImageAsync(recipeId, imageId).done(function () {
                loadMainImage();
                Materialize.toast('Main image updated', 2000);
            });
        });
}

function loadNotes() {
    getRecipeNotesAsync(recipeId).done(function (notes) {
        var $notesContainer = $('#notes-container');
        $notesContainer.empty();

        if (notes !== null) {
            notes.forEach(function (note) {
                var $noteContent = '\
                    <section id="note-' + note.id + '" class="card grey lighten-4">\
                        <div class="card-content">\
                            <p class="section left">\
                                <i class="material-icons left">comment</i>' +
                    new Date(note.createdAt).toLocaleString() +
                    '</p>\
                            <p class="section right">\
                                <a href="#!" data-note-id="' + note.id + '" data-note-content="' + encodeURI(note.text) + '" onclick="onEditNoteClicked(this, event);">\
                                    <i class="material-icons amber-text text-darken-2">edit</i>\
                                </a>\
                                <a href="#!" data-note-id="' + note.id + '" onclick="onDeleteNoteClicked(this, event);">\
                                    <i class="material-icons red-text">delete</i>\
                                </a>\
                            </p>\
                            <div class="divider clearfix"></div>\
                            <p class="section plain-text">' + note.text + '</p>';
                if (note.modifiedAt !== note.createdAt) {
                    $noteContent += '<label class="right">Modified: ' + new Date(note.modifiedAt).toLocaleString() + '</label>';
                }
                $noteContent += '\
                        </div>\
                    </section>';
                $notesContainer.append($noteContent);
            });
        }
    }).always(function () {
        $('#notes .progress').addClass('hide');
    });
}

function onEditNoteClicked(self, e) {
    e.preventDefault();

    var noteId = $(self).data('note-id');
    var noteContent = $(self).data('note-content');
    noteContent = noteContent.replace(/\+/g, ' ');
    noteContent = decodeURIComponent(noteContent);
    $('#note').val(noteContent);
    $('#note-title').text('Edit Note');
    $('#note-submit').data('note-id', noteId);
    $('#note-modal').openModal();
}


function onAddNoteClicked(self, e) {
    e.preventDefault();

    $('#note').val('');
    $('#note-title').text('Add Note');
    $('#note-submit').data('note-id', '');
    $('#note-modal').openModal();
}

function onSaveNoteClicked(self, e) {
    e.preventDefault();

    var noteIdStr = $(self).data('note-id');
    if (noteIdStr === '') {
        addNote($('#note').val());
    } else {
        var noteId = parseInt(noteIdStr, 10);
        editNote(noteId, $('#note').val());
    }
}

function addNote(text) {
    postNoteAsync({
        recipeId: recipeId,
        text: text
    }).done(function () {
        loadNotes();
        Materialize.toast('Note added', 2000);
    });
}

function editNote(noteId, text) {
    putNoteAsync({
        id: noteId,
        recipeId: recipeId,
        text: text
    }).done(function () {
        loadNotes();
        Materialize.toast('Note updated', 2000);
    });
}

function onDeleteNoteClicked(self, e) {
    e.preventDefault();

    showConfirmation(
        'Delete?',
        'warning',
        'Are you sure you want to delete this note?',
        function (ee) {
            var noteId = parseInt($(self).data('note-id'), 10);
            deleteNoteAsync(noteId).done(function () {
                loadNotes();
                Materialize.toast('Note deleted', 2000);
            });
        });
}

function onSetRatingClicked(self, e) {
    e.preventDefault();

    var rating = $(self).data('rating');
    putRecipeRatingAsync(recipeId, rating).done(function () {
        $('.star').removeClass('active');
        $(self).addClass('active');
        Materialize.toast('Rating updated', 2000);
    });
}