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
                $('html, body').animate({scrollTop: 0});
                loadMainImage();
                Materialize.toast('Main image updated', 2000);
            });
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
